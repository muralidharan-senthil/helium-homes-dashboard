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

// New business model:
//   - Homeowner pays Helium HELIUM_RETAINER (4%) of rent each month as a service fee.
//   - Helium pays full rent to homeowner regardless of occupancy.
//   - Tenant pays the same listed rent (no premium on top).
//   - On move-in, tenant pays Helium 1 month rent as brokerage (one-time).
//   - On move-in, tenant pays Helium 1 month rent as security deposit, which
//     reduces the FinTree loan principal for that unit.
//   - FinTree interest on the loan is paid out of the recurring 4% retainer.
export const HELIUM_RETAINER = 0.04;
// Kept for back-compat with older imports — points at the new retainer constant.
export const HELIUM_PREMIUM = HELIUM_RETAINER;

export function groupCalc(properties: Property[], group: Status, interestRate: number): GroupCalc {
  const inGroup = properties.filter((p) => p.status === group);
  const rents = inGroup.map((p) => p.pricing?.rent ?? p.rent ?? null);
  const deposits = inGroup.map((p) => p.pricing?.full_deposit ?? null);
  const visits = inGroup.map((p) => p.visits_booked ?? null);
  const days = inGroup
    .filter((p) => p.marketing_started_at && p.rented_at)
    .map((p) => (Number(p.rented_at) - Number(p.marketing_started_at)) / 86_400_000);

  const tenantRevenue     = sum(rents);
  const ownerPayout       = tenantRevenue;             // Helium pays owner full rent always
  const heliumServiceFee  = tenantRevenue * HELIUM_RETAINER;
  const heliumBrokerage   = tenantRevenue;             // 1 month rent, one-time per tenancy
  const totalDeposit      = sum(deposits);
  const oneMonthRent      = tenantRevenue;

  // Tenant security deposit reduces loan principal once they move in. Reserved
  // tenants are treated as having paid (they're committed). Vacant units carry
  // the full FinTree loan.
  const tenantSecurityApplied = group === 'ACTIVE' ? 0 : oneMonthRent;
  const loan                  = totalDeposit - tenantSecurityApplied;
  const monthlyInterest       = (loan * (interestRate / 100)) / 12;

  // When occupied/reserved, tenant rent flows through to owner — net zero on
  // rent. When vacant, Helium still pays owner but no tenant rent comes in.
  const netRentImpact = group === 'ACTIVE' ? -ownerPayout : 0;

  const profit = heliumServiceFee + netRentImpact - monthlyInterest;

  return {
    count: inGroup.length,
    avgRent: avg(rents),
    tenantRevenue,
    ownerPayout,
    heliumServiceFee,
    heliumBrokerage,
    heliumRevenue: heliumServiceFee, // alias for back-compat
    monthlyRevenue: tenantRevenue,   // alias for back-compat
    avgDays: avg(days),
    avgVisits: avg(visits),
    avgDeposit: avg(deposits),
    oneMonthRent,
    loan,
    monthlyInterest,
    netRentImpact,
    profit,
    interestRate,
  };
}

export function getPrimaryImage(p: Property): string | null {
  const imgs = p.images || [];
  const primary = imgs.find((i) => i.is_primary) || imgs[0];
  return primary?.medium_url || primary?.large_url || primary?.image_url || null;
}
