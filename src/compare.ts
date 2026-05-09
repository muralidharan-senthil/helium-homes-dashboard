// Diff logic between two collated snapshots.
import type { CollatedSnapshot, Property, Status } from './types';

export interface PropertyDiff {
  before: Property;
  after: Property;
}
export interface RentDiff extends PropertyDiff {
  before_rent: number;
  after_rent: number;
  delta: number;
  pct: number;
}
export interface ComparisonResult {
  a: CollatedSnapshot;
  b: CollatedSnapshot;
  byId: {
    added: Property[];     // in b, not in a
    removed: Property[];   // in a, not in b
    common: number;
  };
  statusChanged: PropertyDiff[];
  rentChanged: RentDiff[];
  countsByStatus: {
    a: Record<Status, number>;
    b: Record<Status, number>;
  };
  rentStats: {
    a: { median: number | null; mean: number | null; total: number };
    b: { median: number | null; mean: number | null; total: number };
  };
  byLocality: { name: string; a: number; b: number; delta: number }[];
  bySociety:  { name: string; a: number; b: number; delta: number }[];
  byBhk:      { name: string; a: number; b: number; delta: number }[];
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const s = [...arr].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mean(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function statusCounts(props: Property[]): Record<Status, number> {
  const c: Record<Status, number> = { RENTED: 0, RESERVED: 0, ACTIVE: 0 };
  for (const p of props) { if (p.status && p.status in c) c[p.status]++; }
  return c;
}
function rentOf(p: Property): number | null {
  return p.pricing?.rent ?? p.rent ?? null;
}
function counter(arr: Property[], key: (p: Property) => string | undefined): Map<string, number> {
  const c = new Map<string, number>();
  for (const p of arr) {
    const k = key(p) || 'Unknown';
    c.set(k, (c.get(k) || 0) + 1);
  }
  return c;
}
function diffCounts(a: Map<string, number>, b: Map<string, number>): { name: string; a: number; b: number; delta: number }[] {
  const names = new Set([...a.keys(), ...b.keys()]);
  const out: { name: string; a: number; b: number; delta: number }[] = [];
  for (const name of names) {
    const av = a.get(name) || 0;
    const bv = b.get(name) || 0;
    out.push({ name, a: av, b: bv, delta: bv - av });
  }
  return out.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta) || (y.b + y.a) - (x.b + x.a));
}

export function compareSnapshots(a: CollatedSnapshot, b: CollatedSnapshot): ComparisonResult {
  const aMap = new Map(a.properties.map((p) => [p.id, p]));
  const bMap = new Map(b.properties.map((p) => [p.id, p]));

  const added: Property[] = [];
  const removed: Property[] = [];
  const statusChanged: PropertyDiff[] = [];
  const rentChanged: RentDiff[] = [];
  let common = 0;

  for (const [id, aProp] of aMap) {
    const bProp = bMap.get(id);
    if (!bProp) { removed.push(aProp); continue; }
    common++;
    if (aProp.status !== bProp.status) statusChanged.push({ before: aProp, after: bProp });
    const aR = rentOf(aProp), bR = rentOf(bProp);
    if (aR != null && bR != null && aR !== bR) {
      rentChanged.push({
        before: aProp, after: bProp,
        before_rent: aR, after_rent: bR,
        delta: bR - aR,
        pct: ((bR - aR) / aR) * 100,
      });
    }
  }
  for (const [id, bProp] of bMap) if (!aMap.has(id)) added.push(bProp);

  const aRents = a.properties.map(rentOf).filter((v): v is number => v != null);
  const bRents = b.properties.map(rentOf).filter((v): v is number => v != null);

  return {
    a, b,
    byId: { added, removed, common },
    statusChanged: statusChanged.sort((x, y) => (x.after.title || '').localeCompare(y.after.title || '')),
    rentChanged:   rentChanged.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)),
    countsByStatus: { a: statusCounts(a.properties), b: statusCounts(b.properties) },
    rentStats: {
      a: { median: median(aRents), mean: mean(aRents), total: aRents.reduce((s, v) => s + v, 0) },
      b: { median: median(bRents), mean: mean(bRents), total: bRents.reduce((s, v) => s + v, 0) },
    },
    byLocality: diffCounts(counter(a.properties, (p) => p.locality), counter(b.properties, (p) => p.locality)),
    bySociety:  diffCounts(counter(a.properties, (p) => p.society),  counter(b.properties, (p) => p.society)),
    byBhk:      diffCounts(counter(a.properties, (p) => p.bhk),      counter(b.properties, (p) => p.bhk)),
  };
}
