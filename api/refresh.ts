import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SnapshotMeta } from './_lib/storage.js';

const SOURCES: Record<string, string> = {
  rented:   'https://api.heliumhomes.in/api/v1/listings/rented?limit=200',
  listings: 'https://api.heliumhomes.in/api/v1/listings?limit=100',
  perfect:  'https://api.heliumhomes.in/api/v1/listings/perfect?limit=50',
};

const toNum = (v: any) => { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x,y)=>x-y); const m = Math.floor(s.length/2); return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
const statsFor = (vals: (number|null)[]) => {
  const a = vals.filter((v): v is number => v != null);
  if (!a.length) return { count: 0 };
  return { count: a.length, min: Math.min(...a), max: Math.max(...a), mean: Math.round(a.reduce((s,v)=>s+v,0)/a.length*100)/100, median: median(a) };
};
const counter = (vals: any[]) => {
  const out: Record<string, number> = {};
  for (let v of vals) { if (v == null || v === '') v = 'Unknown'; out[v] = (out[v]||0)+1; }
  return Object.fromEntries(Object.entries(out).sort((a,b) => b[1]-a[1]));
};
const sectionSummary = (items: any[]) => ({
  count: items.length,
  by_locality: counter(items.map(i => i.locality)),
  by_society:  counter(items.map(i => i.society)),
  by_bhk:      counter(items.map(i => i.bhk)),
  by_facing:   counter(items.map(i => i.facing)),
  by_tier:     counter(items.map(i => i.tier)),
  by_status:   counter(items.map(i => i.status)),
  rent:        statsFor(items.map(i => toNum(i.rent))),
  total_rent:  statsFor(items.map(i => toNum(i.total_rent))),
  square_feet: statsFor(items.map(i => toNum(i.square_feet))),
  rating:      statsFor(items.map(i => toNum(i.rating))),
  bedrooms:    statsFor(items.map(i => toNum(i.bedrooms))),
  bathrooms:   statsFor(items.map(i => toNum(i.bathrooms))),
});

async function fetchJson(url: string) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Force JSON for every response shape we emit, including unexpected throws.
  res.setHeader('content-type', 'application/json');

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method must be POST' });
    }

    const { readIndex, writeIndex, writeFile, isBlob } = await import('./_lib/storage.js');

    if (process.env.VERCEL && !isBlob) {
      return res.status(503).json({
        ok: false,
        error: 'BLOB_READ_WRITE_TOKEN is not set on this deployment',
        hint: 'Connect a Vercel Blob store to persist new snapshots: Project → Storage → Blob → Create. Vercel auto-injects the token and redeploys.',
      });
    }

    // Fetch all three endpoints in parallel
    const [rentedRaw, listingsRaw, perfectRaw] = await Promise.all([
      fetchJson(SOURCES.rented), fetchJson(SOURCES.listings), fetchJson(SOURCES.perfect),
    ]);
    const rented = rentedRaw?.data || [], listings = listingsRaw?.data || [], perfect = perfectRaw?.data || [];

    const fetchedAt = new Date();
    const ts = fetchedAt.toISOString().replace(/[:.]/g, '-');
    const generatedAtUtc = fetchedAt.toISOString();

    const rawObj = {
      _metadata: { generated_at_utc: generatedAtUtc, version_timestamp: ts, sources: SOURCES, counts: { rented: rented.length, listings: listings.length, perfect: perfect.length } },
      rented, listings, perfect,
    };
    const rawPath = `raw/helium_homes_raw_${ts}.json`;

    const master = new Map<string, any>();
    for (const [cat, items] of [['rented', rented], ['listings', listings], ['perfect', perfect]] as [string, any[]][]) {
      for (const item of items) {
        const pid = item.id || item.property_code;
        if (!master.has(pid)) master.set(pid, { ...item, _categories: [cat] });
        else master.get(pid)._categories.push(cat);
      }
    }
    const properties = [...master.values()];
    const idSet = (a: any[]) => new Set(a.map((i) => i.id));
    const ids = { rented: idSet(rented), listings: idSet(listings), perfect: idSet(perfect) };
    const inter = (a: Set<any>, b: Set<any>) => [...a].filter((x) => b.has(x));
    const overlap = {
      listings_and_perfect: inter(ids.listings, ids.perfect).length,
      listings_and_rented:  inter(ids.listings, ids.rented).length,
      perfect_and_rented:   inter(ids.perfect, ids.rented).length,
      in_all_three:         [...ids.listings].filter((x) => ids.perfect.has(x) && ids.rented.has(x)).length,
      perfect_subset_of_listings: [...ids.perfect].every((x) => ids.listings.has(x)),
      unique_properties_total: master.size,
    };
    const schemaFields = [...new Set(properties.flatMap((p: any) => Object.keys(p).filter((k) => !k.startsWith('_'))))].sort();

    const collated = {
      metadata: {
        generated_at_utc: generatedAtUtc, version_timestamp: ts, sources: SOURCES,
        api_meta: { rented: rentedRaw?.meta ?? null, listings: listingsRaw?.meta ?? null, perfect: perfectRaw?.meta ?? null },
        counts: { rented: rented.length, listings: listings.length, perfect: perfect.length, unique_properties: master.size },
        overlap, schema_fields: schemaFields, notes: ['Generated by /api/refresh on Vercel.'],
      },
      summary: { rented: sectionSummary(rented), listings: sectionSummary(listings), perfect: sectionSummary(perfect), all_unique: sectionSummary(properties) },
      properties,
    };
    const colPath = `collated/helium_homes_collated_${ts}.json`;

    await Promise.all([
      writeFile(rawPath, JSON.stringify(rawObj, null, 2)),
      writeFile(colPath, JSON.stringify(collated, null, 2)),
    ]);

    const idx = await readIndex();
    const newRun = {
      generated_at_utc: generatedAtUtc, version_timestamp: ts, raw_file: rawPath, collated_file: colPath,
      counts: { rented: rented.length, listings: listings.length, perfect: perfect.length, unique_properties: master.size },
      summary_quick: {
        listings_rent_median: collated.summary.listings.rent.median ?? null,
        listings_rent_mean:   collated.summary.listings.rent.mean ?? null,
        rented_rent_median:   collated.summary.rented.rent.median ?? null,
        rented_rent_mean:     collated.summary.rented.rent.mean ?? null,
      },
    };
    idx.runs = (idx.runs || []).filter((r: any) => r.version_timestamp !== ts);
    idx.runs.push(newRun);
    idx.runs.sort((a: any, b: any) => a.generated_at_utc.localeCompare(b.generated_at_utc));
    await writeIndex(idx);

    return res.status(200).json({ ok: true, latest: newRun, runs: idx.runs.length });
  } catch (err: unknown) {
    // Top-level catch: anything we missed gets returned as JSON, never as an
    // HTML error page. The Vercel function logs will still capture the stack.
    console.error('refresh handler crashed:', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: process.env.VERCEL_ENV === 'production' ? undefined : (err instanceof Error ? err.stack : undefined),
    });
  }
}
