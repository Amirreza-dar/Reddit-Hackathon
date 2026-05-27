const OPPOSITE_ACTIONS = new Set([
    'require|prohibit',
    'prohibit|require',
    'allow|remove',
    'remove|allow',
    'allow|prohibit',
    'prohibit|allow',
    'allow|restrict',
    'restrict|allow',
]);
// ── Semantic keyword matching ──────────────────────────────────────────────
// Two keywords semantically match when they share a long enough common prefix
// (approximates stemming: advice/advises, ban/banned, politics/political).
function commonPrefixLen(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i])
        i++;
    return i;
}
export function semanticMatch(a, b) {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    if (al === bl)
        return true;
    const common = commonPrefixLen(al, bl);
    const minLen = Math.min(al.length, bl.length);
    // One word is fully contained as a prefix of the other (job/jobs, ban/banning)
    if (common === minLen && minLen >= 3)
        return true;
    // Long shared prefix covering at least 60% of the shorter word (advice/advises, politics/political)
    return common >= 4 && common >= minLen * 0.6;
}
function semanticIntersectionSize(a, b) {
    return a.filter(x => b.some(y => semanticMatch(x, y))).length;
}
// ── Scope overlap score ────────────────────────────────────────────────────
export function computeScopeOverlap(a, b) {
    let score = 0;
    if (a.subject === b.subject)
        score += 0.15;
    if (a.target === b.target)
        score += 0.15;
    if (a.condition.postType && b.condition.postType && a.condition.postType === b.condition.postType) {
        score += 0.2;
    }
    if (a.condition.flair && b.condition.flair) {
        if (a.condition.flair.toLowerCase() === b.condition.flair.toLowerCase()) {
            score += 0.2;
        }
    }
    const keywordOverlap = semanticIntersectionSize(a.condition.keywords, b.condition.keywords);
    if (keywordOverlap > 0) {
        // 0.15 per matching keyword-pair, capped at 0.45
        score += Math.min(0.45, keywordOverlap * 0.15);
        // Bonus when two or more topic keywords align — strong topical match
        if (keywordOverlap >= 2)
            score += 0.05;
    }
    const domainOverlap = semanticIntersectionSize(a.condition.domains, b.condition.domains);
    if (domainOverlap > 0) {
        score += 0.2;
    }
    return Math.min(score, 1);
}
// ── Helpers ────────────────────────────────────────────────────────────────
function isOppositeAction(a, b) {
    return OPPOSITE_ACTIONS.has(`${a.action}|${b.action}`);
}
function sameAction(a, b) {
    return a === b;
}
function specificReason(a, b) {
    if (!isOppositeAction(a, b))
        return undefined;
    if (a.action === 'allow' && (b.action === 'prohibit' || b.action === 'remove')) {
        return `"${a.ruleId}" allows content that "${b.ruleId}" bans or removes`;
    }
    if (a.action === 'prohibit' && b.action === 'allow') {
        return `"${a.ruleId}" bans content that "${b.ruleId}" allows`;
    }
    if (a.action === 'require' && b.action === 'prohibit') {
        return `"${a.ruleId}" requires something in a scope that "${b.ruleId}" prohibits`;
    }
    if (a.action === 'restrict' && b.action === 'allow') {
        return `"${a.ruleId}" restricts content that "${b.ruleId}" allows broadly`;
    }
    return 'Opposite actions detected on overlapping scope';
}
function checkDirectFlairConflict(a, b) {
    const bothAboutFlair = a.target === 'flair' || b.target === 'flair';
    if (!bothAboutFlair)
        return undefined;
    if (a.action === 'require' && b.action === 'prohibit') {
        return 'One rule requires flair usage while the other prohibits the same scope';
    }
    if (a.action === 'require' &&
        b.action === 'remove' &&
        a.condition.flair &&
        b.condition.flair &&
        a.condition.flair.toLowerCase() !== b.condition.flair.toLowerCase()) {
        return 'Potential flair policy mismatch';
    }
    return undefined;
}
// ── Main detection ─────────────────────────────────────────────────────────
export function detectConflicts(newRule, existingRules) {
    const results = [];
    for (const oldRule of existingRules) {
        const overlap = computeScopeOverlap(newRule, oldRule);
        const oppositeReason = specificReason(newRule, oldRule);
        const flairReason = checkDirectFlairConflict(newRule, oldRule);
        const kwOverlap = semanticIntersectionSize(newRule.condition.keywords, oldRule.condition.keywords);
        // ── Hard conflict ──────────────────────────────────────────────────────
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
        // ── Semantic safety net: opposite actions + shared topic keywords ──────
        // Even moderate overlap should flag a conflict when the actions directly
        // contradict each other on the same topic keywords (e.g. allow medical vs ban medical).
        if (oppositeReason && kwOverlap >= 1 && overlap >= 0.25) {
            const level = overlap >= 0.5 ? 'conflict' : 'possible_conflict';
            results.push({
                newRuleId: newRule.ruleId,
                existingRuleId: oldRule.ruleId,
                level,
                score: overlap,
                reason: `${oppositeReason}. Shared topic keywords detected. scopeOverlap=${overlap.toFixed(2)}`,
            });
            continue;
        }
        // ── Flair policy conflict ──────────────────────────────────────────────
        if (flairReason && overlap >= 0.4) {
            results.push({
                newRuleId: newRule.ruleId,
                existingRuleId: oldRule.ruleId,
                level: 'possible_conflict',
                score: overlap,
                reason: `${flairReason}. scopeOverlap=${overlap.toFixed(2)}`,
            });
            continue;
        }
        // ── General scope overlap with different actions ───────────────────────
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
//# sourceMappingURL=conflictEngine.js.map