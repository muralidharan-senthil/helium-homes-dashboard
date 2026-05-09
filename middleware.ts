// Vercel Edge Middleware — runs before any request hits routes/static.
// Validates the auth cookie via Web Crypto (HMAC-SHA256) so it works in Edge runtime.

export const config = {
  // Bypass middleware for the login page, login/logout/me APIs, and static assets
  matcher: '/((?!login\\.html|api/login|api/logout|api/me|favicon|assets|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|js|css|woff|woff2)).*)',
};

const COOKIE_NAME = 'hh_auth';

function getCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function hexToBuf(hex: string): ArrayBuffer {
  const len = hex.length / 2;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) buf[i] = parseInt(hex.substr(i * 2, 2), 16);
  return buf.buffer;
}

async function verifyToken(token: string | null, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('HMAC', key, hexToBuf(sig), enc.encode(exp));
  } catch { return false; }
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const token = getCookie(request, COOKIE_NAME);
  const ok = await verifyToken(token, process.env.AUTH_SECRET || '');
  if (ok) return; // proceed
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'content-type': 'application/json' },
    });
  }
  const dest = encodeURIComponent(url.pathname + url.search);
  return Response.redirect(new URL('/login.html?next=' + dest, request.url), 302);
}
