import { parseRule } from './parser.js';
import { detectConflicts } from './conflictEngine.js';
import { findAffectedPosts } from './impactEngine.js';
import { fetchSubredditRules, fetchPostsForAnalysis } from './redditFetcher.js';
import type { AnalysisResult } from './types.js';

export async function runConflictAnalysis(
  subredditName: string,
  newRuleText: string,
  postLimit = 100
): Promise<AnalysisResult> {
  const [subredditRules, posts] = await Promise.all([
    fetchSubredditRules(subredditName),
    fetchPostsForAnalysis(subredditName, postLimit),
  ]);

  const newRule = parseRule('new_rule', newRuleText);

  const existingParsed = subredditRules.map((r) =>
    parseRule(r.shortName, `${r.shortName}. ${r.description}`, 'subreddit_rules')
  );

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
