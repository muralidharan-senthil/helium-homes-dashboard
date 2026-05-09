import fs from 'node:fs';
import path from 'node:path';

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

// Resolve the data directory robustly across:
//   - local dev (cwd = project root)
//   - vercel dev (cwd = project root)
//   - vercel prod serverless (cwd = /var/task, files bundled relative to function source)
function resolveDataDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'data'),
    path.resolve(__dirname, '..', '..', 'data'),  // api/_lib/ → ../../data
    path.resolve(__dirname, '..', '..', '..', 'data'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return candidates[0];
}
const LOCAL_DIR = resolveDataDir();

export interface SnapshotMeta {
  generated_at_utc: string;
  version_timestamp: string;
  raw_file: string;
  collated_file: string;
  counts: { rented: number; listings: number; perfect: number; unique_properties: number };
  summary_quick?: any;
  backfilled?: boolean;
}
export interface IndexFile { runs: SnapshotMeta[]; }

const INDEX_KEY = 'index.json';

async function blobPut(key: string, body: string): Promise<void> {
  const { put } = await import('@vercel/blob');
  await put(key, body, {
    access: 'public', contentType: 'application/json',
    addRandomSuffix: false, allowOverwrite: true,
  });
}
async function blobGet(key: string): Promise<string | null> {
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: key });
  const found = blobs.find((b) => b.pathname === key);
  if (!found) return null;
  const r = await fetch(found.url);
  return r.ok ? r.text() : null;
}

export async function readIndex(): Promise<IndexFile> {
  if (useBlob) {
    const raw = await blobGet(INDEX_KEY);
    return raw ? JSON.parse(raw) : { runs: [] };
  }
  const p = path.join(LOCAL_DIR, 'index.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : { runs: [] };
}

export async function writeIndex(idx: IndexFile): Promise<void> {
  if (useBlob) return blobPut(INDEX_KEY, JSON.stringify(idx, null, 2));
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_DIR, 'index.json'), JSON.stringify(idx, null, 2));
}

export async function readCollated(filePath: string): Promise<any | null> {
  if (useBlob) {
    const raw = await blobGet(filePath);
    return raw ? JSON.parse(raw) : null;
  }
  const p = path.join(LOCAL_DIR, filePath);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

export async function writeFile(filePath: string, body: string): Promise<void> {
  if (useBlob) return blobPut(filePath, body);
  const p = path.join(LOCAL_DIR, filePath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}

export const isBlob = useBlob;
