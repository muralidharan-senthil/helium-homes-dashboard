import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuthToken, getAuthCookie } from './_lib/auth';
export default function handler(req: VercelRequest, res: VercelResponse) {
  const ok = verifyAuthToken(getAuthCookie(req));
  return res.status(ok ? 200 : 401).json({ authed: ok });
}
