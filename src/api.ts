import type { CollatedSnapshot, IndexFile, SnapshotMeta } from './types';

const BASE = '/api';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(BASE + url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  return res.json();
}

export const api = {
  index: () => getJson<IndexFile>('/index'),
  latest: () => getJson<CollatedSnapshot>('/snapshot/latest'),
  snapshot: (ts: string) => getJson<CollatedSnapshot>('/snapshot/' + encodeURIComponent(ts)),
  refresh: async (): Promise<{ ok: boolean; latest: SnapshotMeta | null; runs: number; log?: string; error?: string; stderr?: string }> => {
    const res = await fetch(BASE + '/refresh', { method: 'POST' });
    return res.json();
  },
};
