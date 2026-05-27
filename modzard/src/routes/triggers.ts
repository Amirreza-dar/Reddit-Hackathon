import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { reddit, redis } from '@devvit/web/server';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  const subredditName = input.subreddit?.name ?? '';
  console.log('App installed to subreddit: r/' + subredditName);

  try {
    const post = await reddit.submitCustomPost({
      title: 'Modzard — Mod Intelligence Panel',
    });
    // Store so the menu item can always navigate to the same post
    await redis.set('modzard:panel_permalink', post.permalink);
    console.log('Modzard panel post created:', post.permalink);
  } catch (err) {
    console.error('Failed to create Modzard panel post:', err);
  }

  return c.json<TriggerResponse>({ status: 'success' }, 200);
});
