import type { CollatedSnapshot, IndexFile, SnapshotMeta } from './types';

const BASE = '/api';

/**
 * Robust JSON fetch.
 * If the server returns non-JSON (e.g. Vercel's HTML error page), surface a
 * useful message instead of a cryptic "Unexpected token 'A'" parse error.
 */
async function parseOrThrow<T>(res: Response, label: string): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      const msg = (data as any)?.error || `HTTP ${res.status}`;
      throw new Error(`${label}: ${msg}`);
    }
    return data as T;
  }
  // Non-JSON response — read text and craft a helpful message
  const text = (await res.text()).slice(0, 200);
  throw new Error(
    `${label}: HTTP ${res.status} (non-JSON response). ` +
    `This usually means the serverless function crashed. ` +
    `Check Vercel → Deployments → Functions → ${label.replace(/^[A-Z]/, (c) => c.toLowerCase())} for logs. ` +
    `Server said: ${text || '(empty)'}`
  );
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(BASE + url);
  return parseOrThrow<T>(res, url);
}

export const api = {
  index: () => getJson<IndexFile>('/index'),
  latest: () => getJson<CollatedSnapshot>('/snapshot/latest'),
  snapshot: (ts: string) => getJson<CollatedSnapshot>('/snapshot/' + encodeURIComponent(ts)),
  refresh: async (): Promise<{ ok: boolean; latest: SnapshotMeta | null; runs: number; log?: string; error?: string; stderr?: string }> => {
    const res = await fetch(BASE + '/refresh', { method: 'POST' });
    return parseOrThrow(res, '/refresh');
  },
};
