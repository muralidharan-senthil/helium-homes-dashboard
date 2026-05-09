import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readIndex } from './_lib/storage';
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.json(await readIndex());
}
