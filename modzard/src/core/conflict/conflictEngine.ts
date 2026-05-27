import type { ParsedRule, ConflictResult, RuleAction } from './types.js';

const OPPOSITE_ACTIONS = new Set([
  'require|prohibit',
  'prohibit|require',
  'allow|remove',
  'remove|allow',
  'allow|prohibit',
  'prohibit|allow',
]);

function setIntersectionSize(a: string[], b: string[]): number {
  const bSet = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => bSet.has(x.toLowerCase())).length;
}

export function computeScopeOverlap(a: ParsedRule, b: ParsedRule): number {
  let score = 0;
  if (a.subject === b.subject) score += 0.15;
  if (a.target === b.target) score += 0.15;
  if (a.condition.postType && b.condition.postType && a.condition.postType === b.condition.postType) {
    score += 0.2;
  }
  if (a.condition.flair && b.condition.flair) {
    if (a.condition.flair.toLowerCase() === b.condition.flair.toLowerCase()) {
      score += 0.2;
    }
  }
  const keywordOverlap = setIntersectionSize(a.condition.keywords, b.condition.keywords);
  if (keywordOverlap > 0) {
    score += Math.min(0.2, keywordOverlap * 0.05);
  }
  const domainOverlap = setIntersectionSize(a.condition.domains, b.condition.domains);
  if (domainOverlap > 0) {
    score += 0.2;
  }
  return Math.min(score, 1);
}

function isOppositeAction(a: ParsedRule, b: ParsedRule): boolean {
  return OPPOSITE_ACTIONS.has(`${a.action}|${b.action}`);
}

function specificReason(a: ParsedRule, b: ParsedRule): string | undefined {
  if (!isOppositeAction(a, b)) return undefined;
  if (a.action === 'require' && b.action === 'prohibit') {
    return `${a.ruleId} requires something in a scope that ${b.ruleId} prohibits`;
  }
  if (a.action === 'allow' && b.action === 'remove') {
    return `${a.ruleId} allows content that ${b.ruleId} removes`;
  }
  if (a.action === 'prohibit' && b.action === 'allow') {
    return `${a.ruleId} prohibits content that ${b.ruleId} allows`;
  }
  if (a.action === 'allow' && b.action === 'prohibit') {
    return `${a.ruleId} allows content that ${b.ruleId} prohibits`;
  }
  return 'Opposite actions detected on overlapping scope';
}

function checkDirectFlairConflict(a: ParsedRule, b: ParsedRule): string | undefined {
  const bothAboutFlair = a.target === 'flair' || b.target === 'flair';
  if (!bothAboutFlair) return undefined;
  if (a.action === 'require' && b.action === 'prohibit') {
    return 'One rule requires flair usage while the other prohibits the same scope';
  }
  if (
    a.action === 'require' &&
    b.action === 'remove' &&
    a.condition.flair &&
    b.condition.flair &&
    a.condition.flair.toLowerCase() !== b.condition.flair.toLowerCase()
  ) {
    return 'Potential flair policy mismatch';
  }
  return undefined;
}

function sameAction(a: RuleAction, b: RuleAction): boolean {
  return a === b;
}

export function detectConflicts(newRule: ParsedRule, existingRules: ParsedRule[]): ConflictResult[] {
  const results: ConflictResult[] = [];
  for (const oldRule of existingRules) {
    const overlap = computeScopeOverlap(newRule, oldRule);
    const oppositeReason = specificReason(newRule, oldRule);
    const flairReason = checkDirectFlairConflict(newRule, oldRule);

    if (oppositeReason && overlap >= 0.55) {
      results.push({
        newRuleId: newRule.ruleId,
        existingRuleId: oldRule.ruleId,
        level: 'conflict',
        score: overlap,
        reason: `${oppositeReason}. scopeOverlap=${overlap.toFixed(2)}`,
      });
      continue;
    }
    if (flairReason && overlap >= 0.45) {
      results.push({
        newRuleId: newRule.ruleId,
        existingRuleId: oldRule.ruleId,
        level: 'possible_conflict',
        score: overlap,
        reason: `${flairReason}. scopeOverlap=${overlap.toFixed(2)}`,
      });
      continue;
    }
    if (overlap >= 0.5 && !sameAction(newRule.action, oldRule.action)) {
      results.push({
        newRuleId: newRule.ruleId,
        existingRuleId: oldRule.ruleId,
        level: 'possible_conflict',
        score: overlap,
        reason: `Overlapping scope with different actions. scopeOverlap=${overlap.toFixed(2)}`,
      });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}
