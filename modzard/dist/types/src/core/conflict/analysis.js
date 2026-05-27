import { parseRule } from './parser.js';
import { detectConflicts } from './conflictEngine.js';
import { findAffectedPosts } from './impactEngine.js';
import { fetchSubredditRules, fetchPostsForAnalysis } from './redditFetcher.js';
export async function runConflictAnalysis(subredditName, newRuleText, postLimit = 100) {
    const [subredditRules, posts] = await Promise.all([
        fetchSubredditRules(subredditName),
        fetchPostsForAnalysis(subredditName, postLimit),
    ]);
    const newRule = parseRule('new_rule', newRuleText);
    const existingParsed = subredditRules.map((r) => parseRule(r.shortName, `${r.shortName}. ${r.description}`, 'subreddit_rules'));
    const conflicts = detectConflicts(newRule, existingParsed);
    const affectedPosts = findAffectedPosts(newRule, posts);
    return {
        subredditName,
        newRuleText,
        newRule,
        existingRules: subredditRules,
        conflicts,
        affectedPosts,
        postsScanned: posts.length,
    };
}
//# sourceMappingURL=analysis.js.map