import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';

/**
 * POST /api/save  { scenario }  ->  { id }
 * Stores a scenario under a short id so it can be shared as /s/:id.
 * Returns 501 if no storage is configured (the client then falls back to a
 * long hash link, so sharing still works).
 */

// Works with either a Vercel KV or an Upstash Redis connection.
function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function shortId(n = 7) {
  const bytes = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHABET[bytes[i] % 62];
  return s;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const redis = getRedis();
  if (!redis) return res.status(501).json({ error: 'Storage not configured' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const scenario = body && body.scenario ? body.scenario : body;
    if (!scenario || !Array.isArray(scenario.expenses)) {
      return res.status(400).json({ error: 'Invalid scenario' });
    }
    if (JSON.stringify(scenario).length > 200000) {
      return res.status(413).json({ error: 'Scenario too large' });
    }

    // pick a free id (retry on the rare collision)
    let id;
    for (let i = 0; i < 5; i++) {
      id = shortId(7);
      if (!(await redis.exists(`scn:${id}`))) break;
    }
    // keep shared links for a year
    await redis.set(`scn:${id}`, scenario, { ex: 60 * 60 * 24 * 365 });
    return res.status(200).json({ id });
  } catch {
    return res.status(500).json({ error: 'Save failed' });
  }
}
