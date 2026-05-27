import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import { runConflictAnalysis } from '../core/conflict/analysis.js';
import { fetchSubredditRules } from '../core/conflict/redditFetcher.js';

export const api = new Hono();

// POST /api/conflict-analysis
// Body: { newRuleText: string, postLimit?: number }
api.post('/conflict-analysis', async (c) => {
  const body = await c.req.json<{ newRuleText: string; postLimit?: number }>();

  if (!body.newRuleText?.trim()) {
    return c.json({ error: 'newRuleText is required' }, 400);
  }

  const subredditName = context.subredditName;
  const result = await runConflictAnalysis(
    subredditName,
    body.newRuleText.trim(),
    body.postLimit ?? 100
  );

  return c.json(result);
});

// GET /api/subreddit-rules
// Returns the current subreddit rules for inspection
api.get('/subreddit-rules', async (c) => {
  const subredditName = context.subredditName;
  const rules = await fetchSubredditRules(subredditName);
  return c.json({ subredditName, rules });
});
