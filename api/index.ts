import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('content-type', 'application/json');
  try {
    const { readIndex } = await import('./_lib/storage');
    const idx = await readIndex();
    return res.status(200).json(idx);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('api/index.ts crashed:', err);
    return res.status(500).json({ error: msg });
  }
}
