import type {
  RuleAction,
  RuleTarget,
  RuleSubject,
  PostType,
  RuleEffect,
  ParsedRule,
} from './types.js';

const ACTION_PATTERNS: Array<{ regex: RegExp; action: RuleAction }> = [
  { regex: /\b(must not|may not|not allowed|forbidden|prohibited|cannot|can't|do not allow|don't allow)\b/i, action: 'prohibit' },
  { regex: /\b(must|required|need to|needs to|shall|have to)\b/i, action: 'require' },
  { regex: /\b(allowed|can|permitted)\b/i, action: 'allow' },
  { regex: /\b(remove|deleted|filter out|auto-remove|auto remove)\b/i, action: 'remove' },
  { regex: /\b(warn|notify|message|inform)\b/i, action: 'warn' },
  { regex: /\b(only)\b/i, action: 'restrict' },
];

const TARGET_PATTERNS: Array<{ regex: RegExp; target: RuleTarget }> = [
  { regex: /\bflair\b/i, target: 'flair' },
  { regex: /\btitle\b/i, target: 'title' },
  { regex: /\bcomment\b/i, target: 'comment' },
  { regex: /\bpost\b|\bsubmission\b/i, target: 'post' },
  { regex: /\blink\b|\burl\b/i, target: 'link' },
  { regex: /\bdomain\b/i, target: 'domain' },
  { regex: /\bnsfw\b|\bspoiler\b|\btag\b/i, target: 'tag' },
  { regex: /\bauthor\b|\buser\b/i, target: 'author' },
];

const KEYWORD_HINTS = [
  'politics', 'medical', 'advice', 'news', 'meme', 'spoiler', 'nsfw',
  'crypto', 'promotion', 'self-promo', 'self promo', 'ai', 'job', 'jobs',
  'survey', 'homework', 'diagnosis', 'symptoms',
];

function parseAction(text: string): RuleAction {
  for (const item of ACTION_PATTERNS) {
    if (item.regex.test(text)) return item.action;
  }
  return 'unknown';
}

function parseTarget(text: string): RuleTarget {
  for (const item of TARGET_PATTERNS) {
    if (item.regex.test(text)) return item.target;
  }
  return 'post';
}

function parseSubject(text: string): RuleSubject {
  if (/\bcomment\b/i.test(text)) return 'comment';
  if (/\bauthor\b|\buser\b|\bapproved user\b|\bverified user\b/i.test(text)) return 'author';
  return 'post';
}

function parsePostType(text: string): PostType | undefined {
  if (/\bimage\b|\bphoto\b|\bpicture\b|\bmeme\b/i.test(text)) return 'image';
  if (/\blink post\b|\burl post\b|\bdomain\b|\blink\b/i.test(text)) return 'link';
  if (/\btext post\b|\bself post\b/i.test(text)) return 'text';
  if (/\bcomment\b/i.test(text)) return 'comment';
  return undefined;
}

function parseFlair(text: string): string | undefined {
  const patterns = [
    /use the\s+["“]?([a-zA-Z0-9 _-]+?)["”]?\s+flair/i,
    /flair\s+(?:must be|should be|is|=)\s+["“]?([a-zA-Z0-9 _-]+?)["”]?(\.|,|$)/i,
    /must use\s+["“]?([a-zA-Z0-9 _-]+?)["”]?\s+flair/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const cap = match?.[1];
    if (cap) return cap.trim();
  }
  return undefined;
}

function parseDomains(text: string): string[] {
  const matches = text.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) ?? [];
  return [...new Set(matches.map((d) => d.toLowerCase()))];
}

function parseQuotedPhrases(text: string): string[] {
  const results: string[] = [];
  const regex = /["“]([^"”]+)["”]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const cap = match[1];
    const value = cap?.trim().toLowerCase();
    if (value && value.length > 1) results.push(value);
  }
  return [...new Set(results)];
}

function parseKeywords(text: string): string[] {
  const found = new Set<string>();
  const lowered = text.toLowerCase();
  for (const kw of KEYWORD_HINTS) {
    if (lowered.includes(kw)) found.add(kw);
  }
  const aboutMatch = lowered.match(/\b(?:about|containing|contains|with|regarding)\b\s+([a-z0-9 ,_-]+)/i);
  const aboutCap = aboutMatch?.[1];
  if (aboutCap) {
    const tokens = aboutCap.match(/[a-z][a-z0-9_-]+/g) ?? [];
    for (const token of tokens) {
      if (token.length >= 3) found.add(token);
    }
  }
  for (const phrase of parseQuotedPhrases(text)) {
    if (phrase.length >= 3) found.add(phrase);
  }
  return [...found];
}

function parseExceptions(text: string): string[] {
  const exceptions: string[] = [];
  const lowered = text.toLowerCase();
  const markers = [
    /except\s+([a-z0-9 ,_-]+)/i,
    /unless\s+([a-z0-9 ,_-]+)/i,
    /exempt\s+([a-z0-9 ,_-]+)/i,
  ];
  for (const pattern of markers) {
    const match = lowered.match(pattern);
    const cap = match?.[1];
    if (cap) exceptions.push(cap.trim());
  }
  return [...new Set(exceptions)];
}

function parseEffect(action: RuleAction, text: string): RuleEffect | undefined {
  if (action === 'require' && /\b(otherwise remove|remove if missing|or remove)\b/i.test(text)) {
    return 'remove_if_missing';
  }
  if (action === 'remove') return 'remove_if_matches';
  if (action === 'warn') return 'warn_only';
  return undefined;
}

export function parseRule(ruleId: string, text: string, source = 'subreddit_rules'): ParsedRule {
  const action = parseAction(text);
  const flair = parseFlair(text);
  return {
    ruleId,
    source,
    rawText: text,
    subject: parseSubject(text),
    action,
    target: parseTarget(text),
    value: flair,
    condition: {
      postType: parsePostType(text),
      flair,
      keywords: parseKeywords(text),
      domains: parseDomains(text),
    },
    exceptions: parseExceptions(text),
    effect: parseEffect(action, text),
    priority: 0,
  };
}
