import { Hono } from 'hono';
import { runConflictAnalysis } from '../core/conflict/analysis.js';

export const api = new Hono();

// POST /api/conflict-analysis
// Body: { subredditName: string, newRuleText: string, postLimit?: number }
// Returns: AnalysisResult — existing rules, conflicts, and affected recent posts
api.post('/conflict-analysis', async (c) => {
  const body = await c.req.json<{
    subredditName: string;
    newRuleText: string;
    postLimit?: number;
  }>();

  if (!body.subredditName || !body.newRuleText) {
    return c.json({ error: 'subredditName and newRuleText are required' }, 400);
  }

  const result = await runConflictAnalysis(
    body.subredditName,
    body.newRuleText,
    body.postLimit ?? 25
  );

  return c.json(result);
});

// GET /api/subreddit-rules?name=<subredditName>
// Returns the raw rules for a subreddit so you can inspect them before analysis
api.get('/subreddit-rules', async (c) => {
  const name = c.req.query('name');
  if (!name) return c.json({ error: 'name query param is required' }, 400);

  const { fetchSubredditRules } = await import('../core/conflict/redditFetcher.js');
  const rules = await fetchSubredditRules(name);
  return c.json({ subredditName: name, rules });
});
