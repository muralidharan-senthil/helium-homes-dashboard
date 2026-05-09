import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { makeAuthToken, setAuthCookie } from './_lib/auth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const password = String(req.body?.password ?? '');
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'DASHBOARD_PASSWORD not configured' });

  // Constant-time compare to avoid timing leaks
  const a = Buffer.from(password.padEnd(64, '\0').slice(0, 64));
  const b = Buffer.from(expected.padEnd(64, '\0').slice(0, 64));
  if (!crypto.timingSafeEqual(a, b) || password.length !== expected.length) {
    return res.status(401).json({ error: 'bad password' });
  }
  res.setHeader('Set-Cookie', setAuthCookie(makeAuthToken()));
  return res.status(200).json({ ok: true });
}
