// Tiny Express API the React app talks to.
//   GET  /api/index           -> data/index.json
//   GET  /api/snapshot/latest -> latest collated snapshot
//   GET  /api/snapshot/:ts    -> a specific snapshot (by version_timestamp)
//   POST /api/refresh         -> spawns `node fetch_helium_homes.js` and returns its output
//   GET  /api/health
//
// In dev, Vite proxies /api/* to this server (see vite.config.ts).
// In prod, this server also serves the built /dist folder.

import express from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');           // dashboard-react/
const PARENT     = path.resolve(ROOT, '..');                // workspace root (where fetch_helium_homes.js lives)
const DATA_DIR   = path.resolve(PARENT, 'data');            // shared with the original CLI
const SCRIPT     = path.resolve(PARENT, 'fetch_helium_homes.js');

const app = express();
app.use(express.json());

// CORS for dev (Vite is on :5173)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    dataDir: DATA_DIR,
    scriptExists: fs.existsSync(SCRIPT),
    indexExists:  fs.existsSync(path.join(DATA_DIR, 'index.json')),
  });
});

app.get('/api/index', (_req, res) => {
  const p = path.join(DATA_DIR, 'index.json');
  if (!fs.existsSync(p)) return res.json({ runs: [] });
  res.json(readJson(p));
});

app.get('/api/snapshot/latest', (_req, res) => {
  const indexPath = path.join(DATA_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) return res.status(404).json({ error: 'no snapshots yet' });
  const idx = readJson(indexPath);
  const target = idx.runs?.[idx.runs.length - 1];
  if (!target) return res.status(404).json({ error: 'no runs in index' });
  const file = path.join(DATA_DIR, target.collated_file);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'collated file missing' });
  res.json(readJson(file));
});

app.get('/api/snapshot/:ts', (req, res) => {
  const indexPath = path.join(DATA_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) return res.status(404).json({ error: 'no snapshots yet' });
  const idx = readJson(indexPath);
  const target = idx.runs?.find((r) => r.version_timestamp === req.params.ts);
  if (!target) return res.status(404).json({ error: 'snapshot not found' });
  const file = path.join(DATA_DIR, target.collated_file);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'collated file missing' });
  res.json(readJson(file));
});

// Run the fetch script as a child process.
app.post('/api/refresh', (_req, res) => {
  if (!fs.existsSync(SCRIPT)) {
    return res.status(500).json({ ok: false, error: 'fetch_helium_homes.js not found at ' + SCRIPT });
  }
  const child = spawn(process.execPath, [SCRIPT, DATA_DIR], { cwd: PARENT });
  let stdout = '', stderr = '';
  child.stdout.on('data', (b) => (stdout += b.toString()));
  child.stderr.on('data', (b) => (stderr += b.toString()));
  child.on('error', (err) => res.status(500).json({ ok: false, error: err.message }));
  child.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ ok: false, exit: code, stdout, stderr });
    }
    // Return the new latest snapshot's metadata so the client can switch to it.
    const idxPath = path.join(DATA_DIR, 'index.json');
    const idx = fs.existsSync(idxPath) ? readJson(idxPath) : { runs: [] };
    res.json({
      ok: true,
      latest: idx.runs?.[idx.runs.length - 1] ?? null,
      runs: idx.runs?.length ?? 0,
      log: stdout,
    });
  });
});

// Serve the built React app in production.
const distDir = path.join(ROOT, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`Data dir: ${DATA_DIR}`);
  console.log(`Fetch script: ${SCRIPT}`);
});
