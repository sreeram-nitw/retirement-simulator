import { Redis } from '@upstash/redis';

/**
 * GET /api/get?id=xxxx  ->  { scenario }
 * Loads a scenario stored by /api/save. 404 if the id is unknown/expired.
 */

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const id = (req.query.id || '').toString();
  if (!/^[A-Za-z0-9]{4,16}$/.test(id)) return res.status(400).json({ error: 'Bad id' });

  const redis = getRedis();
  if (!redis) return res.status(501).json({ error: 'Storage not configured' });

  try {
    const scenario = await redis.get(`scn:${id}`);
    if (!scenario) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ scenario });
  } catch {
    return res.status(500).json({ error: 'Fetch failed' });
  }
}
