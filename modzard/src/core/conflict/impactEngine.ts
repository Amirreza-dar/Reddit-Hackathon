import type { ParsedRule, Post, PostImpactResult, ImpactLevel } from './types.js';

function safeLower(value: string | undefined): string {
  return (value ?? '').toLowerCase();
}

function countKeywordMatches(rule: ParsedRule, post: Post): string[] {
  const content = `${post.title} ${post.body}`.toLowerCase();
  const matches: string[] = [];
  for (const kw of rule.condition.keywords) {
    if (content.includes(kw.toLowerCase())) {
      matches.push(kw);
    }
  }
  return matches;
}

function computePostScore(rule: ParsedRule, post: Post): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (rule.condition.postType && post.postType === rule.condition.postType) {
    score += 0.3;
    reasons.push(`post type matches ${rule.condition.postType}`);
  }
  const keywordMatches = countKeywordMatches(rule, post);
  if (keywordMatches.length > 0) {
    score += Math.min(0.35, keywordMatches.length * 0.12);
    reasons.push(`matched keywords: ${keywordMatches.join(', ')}`);
  }
  if (rule.condition.flair) {
    if (post.flair && safeLower(post.flair) === safeLower(rule.condition.flair)) {
      score += 0.2;
      reasons.push(`matching flair: ${post.flair}`);
    } else if (!post.flair && rule.action === 'require') {
      score += 0.18;
      reasons.push('missing required flair');
    }
  }
  if (rule.condition.domains.length > 0 && post.domain) {
    const postDomain = post.domain.toLowerCase();
    if (rule.condition.domains.map((d) => d.toLowerCase()).includes(postDomain)) {
      score += 0.25;
      reasons.push(`matched domain: ${post.domain}`);
    }
  }
  if (rule.action === 'prohibit' && keywordMatches.length > 0) {
    score += 0.1;
    reasons.push('rule prohibits content in matched scope');
  }
  if (rule.action === 'remove' && keywordMatches.length > 0) {
    score += 0.1;
    reasons.push('rule removes matched content');
  }
  return { score: Math.min(score, 1), reasons };
}

export function classifyPostImpact(rule: ParsedRule, post: Post): PostImpactResult {
  const { score, reasons } = computePostScore(rule, post);
  let level: ImpactLevel = 'unaffected';
  if (score >= 0.6) level = 'affected';
  else if (score >= 0.3) level = 'possibly_affected';
  return {
    postId: post.postId,
    level,
    score,
    reason: reasons.length > 0 ? reasons.join('; ') : 'low evidence of match',
  };
}

export function findAffectedPosts(rule: ParsedRule, posts: Post[], limit = 20): PostImpactResult[] {
  return posts
    .map((post) => classifyPostImpact(rule, post))
    .filter((result) => result.level !== 'unaffected')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
