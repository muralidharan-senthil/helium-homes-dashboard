import crypto from 'node:crypto';

const COOKIE_NAME = 'hh_auth';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET env var not set');
  return s;
}

export function makeAuthToken(): string {
  const exp = String(Date.now() + TTL_MS);
  const sig = crypto.createHmac('sha256', getSecret()).update(exp).digest('hex');
  return `${exp}.${sig}`;
}

export function verifyAuthToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  try {
    const expected = crypto.createHmac('sha256', getSecret()).update(exp).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
}

export function getAuthCookie(req: { headers: Record<string, any> }): string | null {
  const cookie = (req.headers['cookie'] || req.headers['Cookie'] || '') as string;
  const m = cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE_NAME + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export function setAuthCookie(token: string): string {
  const maxAge = Math.floor(TTL_MS / 1000);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}

export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export function requireAuth(req: { headers: Record<string, any> }, res: { status: (n: number) => any; json: (o: any) => any }): boolean {
  const ok = verifyAuthToken(getAuthCookie(req));
  if (!ok) { res.status(401).json({ error: 'unauthorized' }); return false; }
  return true;
}
