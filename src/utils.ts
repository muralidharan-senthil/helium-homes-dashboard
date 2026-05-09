import type { Property, GroupCalc, Status } from './types';

export const STATUS_LABELS: Record<Status, string> = {
  RENTED: 'Occupied',
  RESERVED: 'Reserved',
  ACTIVE: 'Unoccupied',
};
export const STATUS_GROUPS: Status[] = ['RENTED', 'RESERVED', 'ACTIVE'];
export const STATUS_COLORS: Record<Status, string> = {
  RENTED: '#10b981',
  RESERVED: '#f59e0b',
  ACTIVE: '#475569',
};

export function fmtINR(v: number | null | undefined): string {
  if (v == null || isNaN(Number(v))) return '—';
  return '₹' + Math.round(Number(v)).toLocaleString('en-IN');
}

export function fmtINRk(v: number | null | undefined): string {
  if (v == null || isNaN(Number(v))) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 10_000_000) return '₹' + (n / 10_000_000).toFixed(2) + 'Cr';
  if (Math.abs(n) >= 100_000) return '₹' + (n / 100_000).toFixed(2) + 'L';
  if (Math.abs(n) >= 1_000) return '₹' + (n / 1_000).toFixed(1) + 'k';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function fmtNum(v: number | null | undefined, d = 0): string {
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('en-IN', { maximumFractionDigits: d });
}

export function fmtDate(ms: number | string | null | undefined): string {
  if (ms == null) return '—';
  return new Date(Number(ms)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function avg(arr: Array<number | null | undefined>): number | null {
  const a = arr.filter((x): x is number => x != null && !isNaN(Number(x)));
  if (a.length === 0) return null;
  return a.reduce((s, v) => s + Number(v), 0) / a.length;
}

export function sum(arr: Array<number | null | undefined>): number {
  return arr.filter((x): x is number => x != null && !isNaN(Number(x))).reduce((s, v) => s + Number(v), 0);
}

export function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

export function debounce<F extends (...args: any[]) => void>(fn: F, ms = 200): (...args: Parameters<F>) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<F>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Helium's premium / margin — added on top of the owner's rent and listed on the
// website. Tenants pay the listed amount; Helium forwards (1 - PREMIUM) of that
// to the owner and keeps PREMIUM as its gross revenue.
export const HELIUM_PREMIUM = 0.10;

export function groupCalc(properties: Property[], group: Status, interestRate: number): GroupCalc {
  const inGroup = properties.filter((p) => p.status === group);
  const rents = inGroup.map((p) => p.pricing?.rent ?? p.rent ?? null);
  const deposits = inGroup.map((p) => p.pricing?.full_deposit ?? null);
  const visits = inGroup.map((p) => p.visits_booked ?? null);
  const days = inGroup
    .filter((p) => p.marketing_started_at && p.rented_at)
    .map((p) => (Number(p.rented_at) - Number(p.marketing_started_at)) / 86_400_000);

  const tenantRevenue = sum(rents);              // tenants pay listed rent
  const ownerPayout   = tenantRevenue * (1 - HELIUM_PREMIUM); // 90% goes to owners
  const heliumRevenue = tenantRevenue * HELIUM_PREMIUM;       // 10% margin
  const totalDeposit  = sum(deposits);
  const oneMonthRent  = tenantRevenue;           // 1 month of listed rent
  const loan          = totalDeposit - oneMonthRent;
  const monthlyInterest = (loan * (interestRate / 100)) / 12;
  const profit          = heliumRevenue - monthlyInterest;    // updated formula

  return {
    count: inGroup.length,
    avgRent: avg(rents),
    tenantRevenue,
    ownerPayout,
    heliumRevenue,
    monthlyRevenue: tenantRevenue, // alias kept so older code paths don't break
    avgDays: avg(days),
    avgVisits: avg(visits),
    avgDeposit: avg(deposits),
    oneMonthRent,
    loan,
    monthlyInterest,
    profit,
    interestRate,
  };
}

export function getPrimaryImage(p: Property): string | null {
  const imgs = p.images || [];
  const primary = imgs.find((i) => i.is_primary) || imgs[0];
  return primary?.medium_url || primary?.large_url || primary?.image_url || null;
}
