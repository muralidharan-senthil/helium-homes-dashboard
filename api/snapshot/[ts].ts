import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readIndex, readCollated } from '../_lib/storage';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ts = String(req.query.ts);
  const idx = await readIndex();
  const target = idx.runs?.find((r) => r.version_timestamp === ts);
  if (!target) return res.status(404).json({ error: 'snapshot not found' });
  const data = await readCollated(target.collated_file);
  if (!data) return res.status(404).json({ error: 'collated file missing' });
  res.json(data);
}
