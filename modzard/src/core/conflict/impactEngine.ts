import type { ParsedRule, Post, PostImpactResult, ImpactLevel } from './types.js';
import { TOPIC_CLUSTERS, STOP_WORDS } from './parser.js';
import { semanticMatch } from './conflictEngine.js';
import {
  expandAbbreviations,
  getNegatedWords,
  getWordVector,
  avgVec,
  findVectorMatches,
  CLUSTER_VECS,
} from './semantics.js';
import type { TopicVec } from './semantics.js';

// ── Cluster reverse index ──────────────────────────────────────────────────
const WORD_TO_CLUSTER = new Map<string, string>();
for (const [cluster, words] of Object.entries(TOPIC_CLUSTERS)) {
  for (const word of words) WORD_TO_CLUSTER.set(word, cluster);
}

// ── Action noise filter (Improvement 3 from prior session) ─────────────────
const ACTION_NOISE = new Set([
  'ban', 'banned', 'banning', 'remove', 'removed', 'removal',
  'allow', 'allowed', 'prohibit', 'prohibited', 'restrict', 'restricted',
  'warn', 'warning', 'require', 'required', 'delete', 'deleted',
]);

function topicKeywords(rule: ParsedRule): string[] {
  return rule.condition.keywords.filter(kw => !ACTION_NOISE.has(kw.toLowerCase()));
}

// ── Rule centroid vector (Option 3) ───────────────────────────────────────
function getRuleVector(rule: ParsedRule): TopicVec | null {
  const vecs: TopicVec[] = [];
  for (const kw of topicKeywords(rule)) {
    const vec = getWordVector(kw, WORD_TO_CLUSTER);
    if (vec !== null) vecs.push(vec);
  }
  // Also use the rule's cluster directly from its condition keywords
  for (const kw of topicKeywords(rule)) {
    const c = WORD_TO_CLUSTER.get(kw.toLowerCase());
    if (c !== undefined) {
      const cv = CLUSTER_VECS[c];
      if (cv !== undefined) vecs.push(cv);
    }
  }
  return avgVec(vecs);
}

function safeLower(value: string | undefined): string {
  return (value ?? '').toLowerCase();
}

// ── Full-vocabulary cluster words in text ─────────────────────────────────
function clusterWordsInText(text: string, exclude: Set<string>): string[] {
  const tokens = text.toLowerCase().match(/\b[a-z][a-z0-9'-]{2,}\b/g) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of tokens) {
    if (seen.has(token) || exclude.has(token) || STOP_WORDS.has(token)) continue;
    seen.add(token);
    if (WORD_TO_CLUSTER.has(token)) result.push(token);
  }
  return result;
}

// ── Core matching ──────────────────────────────────────────────────────────
interface MatchResult {
  directTitle:   string[];
  directBody:    string[];
  clusterTitle:  string[];
  clusterBody:   string[];
  vectorTitle:   Array<{ word: string; similarity: number }>;
  vectorBody:    Array<{ word: string; similarity: number }>;
  negatedTopics: string[];
}

function matchPost(rule: ParsedRule, post: Post): MatchResult {
  const kws = topicKeywords(rule);

  // ── Option 1: expand abbreviations ──────────────────────────────────────
  const titleExp = expandAbbreviations(post.title);
  const bodyExp  = expandAbbreviations(post.body);
  const titleLow = titleExp.toLowerCase();
  const bodyLow  = bodyExp.toLowerCase();

  // ── Option 2: negation detection ────────────────────────────────────────
  const negated    = getNegatedWords(`${titleExp} ${bodyExp}`);
  const ruleClusters = new Set(
    kws.map(k => WORD_TO_CLUSTER.get(k.toLowerCase())).filter((c): c is string => c !== undefined)
  );
  // Only flag as negated if the negated word is topically relevant to the rule
  const negatedTopics = [...negated].filter(w => {
    const c = WORD_TO_CLUSTER.get(w);
    return c !== undefined && ruleClusters.has(c);
  });
  const negatedSet = new Set(negatedTopics);

  // ── Direct / semantic keyword matches ────────────────────────────────────
  const directTitle: string[] = [];
  const directBody:  string[] = [];
  const directSet    = new Set<string>();

  for (const kw of kws) {
    const rk = kw.toLowerCase();
    if (negatedSet.has(rk)) continue;
    const titleTokens = titleLow.match(/\b[a-z][a-z0-9'-]+\b/g) ?? [];
    const bodyTokens  = bodyLow.match(/\b[a-z][a-z0-9'-]+\b/g) ?? [];
    const inTitle = titleLow.includes(rk) || titleTokens.some(t => semanticMatch(rk, t));
    const inBody  = bodyLow.includes(rk)  || bodyTokens.some(t => semanticMatch(rk, t));
    if (inTitle) { directTitle.push(kw); directSet.add(rk); continue; }
    if (inBody)  { directBody.push(kw);  directSet.add(rk); }
  }

  // ── Cluster words (full vocabulary) ──────────────────────────────────────
  const clusterTitle = clusterWordsInText(titleExp, new Set([...directSet, ...negatedSet]));
  const clusterBody  = clusterWordsInText(bodyExp,  new Set([...directSet, ...new Set(clusterTitle), ...negatedSet]));

  // Filter cluster words to only those in same clusters as rule keywords
  const filterToRuleClusters = (words: string[]) =>
    words.filter(w => { const c = WORD_TO_CLUSTER.get(w); return c !== undefined && ruleClusters.has(c); });
  const filteredClusterTitle = filterToRuleClusters(clusterTitle);
  const filteredClusterBody  = filterToRuleClusters(clusterBody);

  // ── Option 3: vector similarity for unknown vocabulary ────────────────────
  const ruleVec = getRuleVector(rule);
  const alreadyMatched = new Set([
    ...directSet,
    ...filteredClusterTitle.map(s => s.toLowerCase()),
    ...filteredClusterBody.map(s => s.toLowerCase()),
    ...negatedSet,
  ]);

  let vectorTitle: Array<{ word: string; similarity: number }> = [];
  let vectorBody:  Array<{ word: string; similarity: number }> = [];
  if (ruleVec !== null) {
    vectorTitle = findVectorMatches(ruleVec, titleExp, WORD_TO_CLUSTER, alreadyMatched);
    // Exclude title matches from body scan
    const alreadyWithTitle = new Set([...alreadyMatched, ...vectorTitle.map(m => m.word)]);
    vectorBody = findVectorMatches(ruleVec, bodyExp, WORD_TO_CLUSTER, alreadyWithTitle);
  }

  return {
    directTitle,
    directBody,
    clusterTitle:  filteredClusterTitle,
    clusterBody:   filteredClusterBody,
    vectorTitle,
    vectorBody,
    negatedTopics,
  };
}

// ── Scoring ────────────────────────────────────────────────────────────────
function computePostScore(rule: ParsedRule, post: Post): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (rule.condition.postType && post.postType === rule.condition.postType) {
    score += 0.3;
    reasons.push(`post type matches ${rule.condition.postType}`);
  }

  const { directTitle, directBody, clusterTitle, clusterBody, vectorTitle, vectorBody, negatedTopics } = matchPost(rule, post);

  // Option 2: negation penalty — post explicitly disclaims the topic
  if (negatedTopics.length > 0) {
    score -= 0.15 * negatedTopics.length;
    reasons.push(`negated: ${negatedTopics.join(', ')}`);
  }

  // Direct keyword matches (title weighted higher)
  if (directTitle.length > 0) {
    score += Math.min(0.45, directTitle.length * 0.20);
    reasons.push(`title keywords: ${directTitle.join(', ')}`);
  }
  if (directBody.length > 0) {
    score += Math.min(0.30, directBody.length * 0.12);
    reasons.push(`body keywords: ${directBody.join(', ')}`);
  }

  // Cluster signals (full-vocab scan)
  if (clusterTitle.length > 0) {
    score += Math.min(0.36, clusterTitle.length * 0.15);
    reasons.push(`title topic signals: ${clusterTitle.join(', ')}`);
  }
  if (clusterBody.length > 0) {
    score += Math.min(0.24, clusterBody.length * 0.08);
    reasons.push(`body topic signals: ${clusterBody.join(', ')}`);
  }

  // Option 3: vector similarity hits (proper nouns, conditions, slang)
  if (vectorTitle.length > 0) {
    const vScore = Math.min(0.30, vectorTitle.reduce((s, m) => s + m.similarity * 0.15, 0));
    score += vScore;
    reasons.push(`title semantic: ${vectorTitle.map(m => m.word).join(', ')}`);
  }
  if (vectorBody.length > 0) {
    const vScore = Math.min(0.20, vectorBody.reduce((s, m) => s + m.similarity * 0.08, 0));
    score += vScore;
    reasons.push(`body semantic: ${vectorBody.map(m => m.word).join(', ')}`);
  }

  // Flair: exact, semantic, or cluster match
  if (rule.condition.flair) {
    const flairLow  = safeLower(post.flair);
    const ruleFlair = safeLower(rule.condition.flair);
    if (flairLow && (flairLow === ruleFlair || semanticMatch(flairLow, ruleFlair))) {
      score += 0.25;
      reasons.push(`matching flair: ${post.flair}`);
    } else if (!post.flair && rule.action === 'require') {
      score += 0.18;
      reasons.push('missing required flair');
    }
  }
  if (!rule.condition.flair && post.flair) {
    const flairLow = safeLower(post.flair);
    const fc = WORD_TO_CLUSTER.get(flairLow);
    const ruleClusters = new Set(
      topicKeywords(rule).map(k => WORD_TO_CLUSTER.get(k.toLowerCase())).filter((c): c is string => c !== undefined)
    );
    if (fc !== undefined && ruleClusters.has(fc)) {
      score += 0.15;
      reasons.push(`flair topic match: ${post.flair}`);
    }
  }

  if (rule.condition.domains.length > 0 && post.domain) {
    if (rule.condition.domains.map(d => d.toLowerCase()).includes(post.domain.toLowerCase())) {
      score += 0.25;
      reasons.push(`matched domain: ${post.domain}`);
    }
  }

  const totalMatches =
    directTitle.length + directBody.length +
    clusterTitle.length + clusterBody.length +
    vectorTitle.length  + vectorBody.length;

  if ((rule.action === 'prohibit' || rule.action === 'remove') && totalMatches > 0) {
    score += 0.12;
    reasons.push(`rule ${rule.action}s content in matched scope`);
  }

  return { score: Math.min(Math.max(score, 0), 1), reasons };
}

export function classifyPostImpact(rule: ParsedRule, post: Post): PostImpactResult {
  const { score, reasons } = computePostScore(rule, post);
  let level: ImpactLevel = 'unaffected';
  if (score >= 0.6)      level = 'affected';
  else if (score >= 0.2) level = 'possibly_affected';
  return {
    postId:  post.postId,
    title:   post.title,
    author:  post.author,
    body:    post.body,
    level,
    score,
    reason:  reasons.length > 0 ? reasons.join('; ') : 'low evidence of match',
  };
}

export function findAffectedPosts(rule: ParsedRule, posts: Post[], limit = 20): PostImpactResult[] {
  return posts
    .map((post) => classifyPostImpact(rule, post))
    .filter((result) => result.level !== 'unaffected')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
