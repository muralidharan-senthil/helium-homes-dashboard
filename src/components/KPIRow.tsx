import type { Property } from '../types';
import { pct } from '../utils';

export function KPIRow({ properties, runs }: { properties: Property[]; runs: number }) {
  const total = properties.length;
  const occupied = properties.filter((p) => p.status === 'RENTED').length;
  const reserved = properties.filter((p) => p.status === 'RESERVED').length;
  const unoccupied = properties.filter((p) => p.status === 'ACTIVE').length;

  return (
    <div className="kpi-row">
      <Card label="Total properties" value={total} sub={`across ${runs} snapshot${runs === 1 ? '' : 's'}`} />
      <Card label="Occupied" value={occupied} sub={`${pct(occupied, total)}% · status: RENTED`} variant="occupied" />
      <Card label="Reserved" value={reserved} sub={`${pct(reserved, total)}% · status: RESERVED`} variant="reserved" />
      <Card label="Unoccupied" value={unoccupied} sub={`${pct(unoccupied, total)}% · status: ACTIVE`} variant="unoccupied" />
    </div>
  );
}

function Card({ label, value, sub, variant }: { label: string; value: number; sub: string; variant?: string }) {
  return (
    <div className={`kpi ${variant ?? ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}
