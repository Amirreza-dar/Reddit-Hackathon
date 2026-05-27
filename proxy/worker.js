/**
 * Modzard OpenRouter proxy — deploy to Cloudflare Workers (free tier).
 *
 * Deploy steps (one-time, ~2 min):
 *   1. npm install -g wrangler
 *   2. wrangler login
 *   3. wrangler deploy worker.js --name modzard-proxy --compatibility-date 2024-01-01
 *
 * You get a URL like: https://modzard-proxy.<your-subdomain>.workers.dev
 * Paste that URL into the PROXY_URL constant in modzard/src/client/main.js
 */

export default {
  async fetch(request) {
    // Only allow POST
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }
    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'POST only' }), 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON body' }), 400);
    }

    const { apiKey, messages, model, max_tokens, temperature } = body;

    if (!apiKey?.startsWith('sk-or-')) {
      return corsResponse(JSON.stringify({ error: 'Invalid API key format' }), 400);
    }

    // Forward to OpenRouter
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://modzard.app',
        'X-Title': 'Modzard',
      },
      body: JSON.stringify({
        model: model ?? 'openai/gpt-4o-mini',
        messages,
        max_tokens: max_tokens ?? 2000,
        temperature: temperature ?? 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await orRes.text();
    return corsResponse(data, orRes.status, { 'Content-Type': 'application/json' });
  },
};

function corsResponse(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extraHeaders,
    },
  });
}
