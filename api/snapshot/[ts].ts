import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('content-type', 'application/json');
  try {
    const { readIndex, readCollated } = await import('../_lib/storage');
    const ts = String(req.query.ts);
    const idx = await readIndex();
    const target = idx.runs?.find((r: any) => r.version_timestamp === ts);
    if (!target) return res.status(404).json({ error: 'snapshot not found' });
    const data = await readCollated(target.collated_file);
    if (!data) return res.status(404).json({ error: 'collated file missing' });
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('api/snapshot/[ts].ts crashed:', err);
    return res.status(500).json({ error: msg });
  }
}
