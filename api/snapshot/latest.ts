import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('content-type', 'application/json');
  try {
    const { readIndex, readCollated } = await import('../_lib/storage');
    const idx = await readIndex();
    const target = idx.runs?.[idx.runs.length - 1];
    if (!target) return res.status(404).json({ error: 'no snapshots yet' });
    const data = await readCollated(target.collated_file);
    if (!data) return res.status(404).json({ error: 'collated file missing' });
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('api/snapshot/latest.ts crashed:', err);
    return res.status(500).json({ error: msg });
  }
}
