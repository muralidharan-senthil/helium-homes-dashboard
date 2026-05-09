import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth';
import { readIndex, readCollated } from '../_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;
  const idx = await readIndex();
  const target = idx.runs?.[idx.runs.length - 1];
  if (!target) return res.status(404).json({ error: 'no snapshots' });
  const data = await readCollated(target.collated_file);
  if (!data) return res.status(404).json({ error: 'collated file missing' });
  res.json(data);
}
