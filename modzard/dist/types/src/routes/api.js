import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import { runConflictAnalysis } from '../core/conflict/analysis.js';
import { fetchSubredditRules } from '../core/conflict/redditFetcher.js';
import { fetchRemovedPosts } from '../core/banned/bannedFetcher.js';
import { buildLocalPatternSummary } from '../core/banned/bannedPatternAnalyzer.js';
export const api = new Hono();
// POST /api/conflict-analysis
// Body: { newRuleText: string, postLimit?: number }
api.post('/conflict-analysis', async (c) => {
    const body = await c.req.json();
    if (!body.newRuleText?.trim()) {
        return c.json({ error: 'newRuleText is required' }, 400);
    }
    const subredditName = context.subredditName;
    const result = await runConflictAnalysis(subredditName, body.newRuleText.trim(), body.postLimit ?? 100);
    return c.json(result);
});
// GET /api/subreddit-rules
// Returns the current subreddit rules for inspection
api.get('/subreddit-rules', async (c) => {
    const subredditName = context.subredditName;
    const rules = await fetchSubredditRules(subredditName);
    return c.json({ subredditName, rules });
});
// POST /api/removed-posts
// Returns posts + local keyword/topic summary. No external calls.
// The client runs its own local analysis engine from this data.
api.post('/removed-posts', async (c) => {
    try {
        const body = await c.req.json();
        const subredditName = context.subredditName;
        const posts = await fetchRemovedPosts(subredditName, body.limit ?? 50);
        if (posts.length === 0) {
            return c.json({ error: 'No posts found to analyze' }, 404);
        }
        const localSummary = buildLocalPatternSummary(posts);
        return c.json({ subredditName, posts, localSummary });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[removed-posts]', msg);
        return c.json({ error: msg }, 500);
    }
});
//# sourceMappingURL=api.js.map