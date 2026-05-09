import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import type { CollatedSnapshot, SnapshotMeta, Status, Theme } from '../types';
import { api } from '../api';
import { compareSnapshots } from '../compare';
import { fmtINR, fmtINRk, fmtNum, STATUS_LABELS, STATUS_COLORS } from '../utils';
import { chartPalette } from '../theme';

interface Props {
  runs: SnapshotMeta[];
  preselectA?: string | null;
  preselectB?: string | null;
  theme: Theme;
}

export function Compare({ runs, preselectA, preselectB, theme }: Props) {
  const navigate = useNavigate();
  const ordered = [...runs];
  const [aTs, setATs] = useState<string>(preselectA || (ordered.length > 1 ? ordered[0].version_timestamp : ordered[0]?.version_timestamp || ''));
  const [bTs, setBTs] = useState<string>(preselectB || ordered[ordered.length - 1]?.version_timestamp || '');
  const [a, setA] = useState<CollatedSnapshot | null>(null);
  const [b, setB] = useState<CollatedSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!aTs || !bTs) return;
    setLoading(true); setErr(null);
    Promise.all([api.snapshot(aTs), api.snapshot(bTs)])
      .then(([sa, sb]) => { setA(sa); setB(sb); })
      .catch((e) => setErr(e?.message || 'Failed to load snapshots'))
      .finally(() => setLoading(false));
  }, [aTs, bTs]);

  if (runs.length < 2) {
    return (
      <>
        <div className="pd-back" onClick={() => navigate('/')}>← Back to dashboard</div>
        <div className="empty-state">You need at least 2 snapshots to compare. Click <strong>Get Data</strong> to fetch a fresh one.</div>
      </>
    );
  }

  return (
    <>
      <div className="pd-back" onClick={() => navigate('/')}>← Back to dashboard</div>
      <div className="page-head">
        <div>
          <div className="page-title">Compare snapshots</div>
          <div className="page-subtitle">See how the portfolio shifted between two points in time.</div>
        </div>
      </div>

      <div className="filters" style={{ alignItems: 'center' }}>
        <span className="stat-label">From</span>
        <select className="select" value={aTs} onChange={(e) => setATs(e.target.value)}>
          {ordered.map((r) => (
            <option key={r.version_timestamp} value={r.version_timestamp}>
              {new Date(r.generated_at_utc).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              {(r as any).backfilled ? ' · backfilled' : ''}
            </option>
          ))}
        </select>
        <span className="stat-label" style={{ marginLeft: 8 }}>to</span>
        <select className="select" value={bTs} onChange={(e) => setBTs(e.target.value)}>
          {ordered.map((r) => (
            <option key={r.version_timestamp} value={r.version_timestamp}>
              {new Date(r.generated_at_utc).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              {(r as any).backfilled ? ' · backfilled' : ''}
            </option>
          ))}
        </select>
        <button className="chip" onClick={() => { const t = aTs; setATs(bTs); setBTs(t); }} title="Swap">⇄ Swap</button>
      </div>

      {loading && <div className="loading-shell"><span className="spinner" /> Loading both snapshots...</div>}
      {err && <div className="empty-state">Error: {err}</div>}
      {!loading && a && b && <ComparisonView a={a} b={b} theme={theme} />}
    </>
  );
}

function ComparisonView({ a, b, theme }: { a: CollatedSnapshot; b: CollatedSnapshot; theme: Theme }) {
  const cmp = useMemo(() => compareSnapshots(a, b), [a, b]);
  const pal = chartPalette(theme);

  const aLabel = new Date(a.metadata.generated_at_utc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const bLabel = new Date(b.metadata.generated_at_utc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // KPI deltas
  const kpis: { label: string; aValue: number; bValue: number; variant?: string }[] = [
    { label: 'Total properties', aValue: a.properties.length, bValue: b.properties.length },
    { label: 'Occupied (RENTED)', aValue: cmp.countsByStatus.a.RENTED, bValue: cmp.countsByStatus.b.RENTED, variant: 'occupied' },
    { label: 'Reserved', aValue: cmp.countsByStatus.a.RESERVED, bValue: cmp.countsByStatus.b.RESERVED, variant: 'reserved' },
    { label: 'Unoccupied (ACTIVE)', aValue: cmp.countsByStatus.a.ACTIVE, bValue: cmp.countsByStatus.b.ACTIVE, variant: 'unoccupied' },
  ];

  return (
    <>
      <div style={{ marginBottom: 20, color: 'var(--text-muted)', fontSize: 13 }}>
        Comparing <strong>{aLabel}</strong> → <strong>{bLabel}</strong>{' '}
        ({a.properties.length} → {b.properties.length} properties)
      </div>

      <div className="kpi-row">
        {kpis.map((k) => <DeltaKpi key={k.label} {...k} />)}
      </div>

      <div className="charts-row">
        <div className="card chart-card">
          <div className="card-section-title">Inventory churn</div>
          <div className="card-section-subtitle">Properties added / removed / unchanged</div>
          <div className="stat-row"><span className="stat-label">Added in {bLabel}</span><span className="stat-value" style={{ color: 'var(--success)' }}>+{cmp.byId.added.length}</span></div>
          <div className="stat-row"><span className="stat-label">Removed since {aLabel}</span><span className="stat-value" style={{ color: 'var(--danger)' }}>−{cmp.byId.removed.length}</span></div>
          <div className="stat-row"><span className="stat-label">Common (in both)</span><span className="stat-value">{cmp.byId.common}</span></div>
          <div className="stat-row"><span className="stat-label">Status changed</span><span className="stat-value" style={{ color: 'var(--accent)' }}>{cmp.statusChanged.length}</span></div>
          <div className="stat-row"><span className="stat-label">Rent changed</span><span className="stat-value" style={{ color: 'var(--accent)' }}>{cmp.rentChanged.length}</span></div>
        </div>

        <div className="card chart-card">
          <div className="card-section-title">Rent stats</div>
          <div className="card-section-subtitle">Across all properties in each snapshot</div>
          <div className="stat-row"><span className="stat-label">Median rent</span><Pair a={cmp.rentStats.a.median} b={cmp.rentStats.b.median} fmt={fmtINR} /></div>
          <div className="stat-row"><span className="stat-label">Mean rent</span><Pair a={cmp.rentStats.a.mean} b={cmp.rentStats.b.mean} fmt={fmtINR} /></div>
          <div className="stat-row"><span className="stat-label">Total monthly</span><Pair a={cmp.rentStats.a.total} b={cmp.rentStats.b.total} fmt={fmtINRk} /></div>
        </div>

        <div className="card chart-card">
          <div className="card-section-title">Status flow</div>
          <div className="card-section-subtitle">Counts side-by-side</div>
          <div className="chart-canvas-wrap">
            <Bar
              data={{
                labels: (['RENTED', 'RESERVED', 'ACTIVE'] as Status[]).map((s) => STATUS_LABELS[s]),
                datasets: [
                  { label: aLabel, data: (['RENTED', 'RESERVED', 'ACTIVE'] as Status[]).map((s) => cmp.countsByStatus.a[s]), backgroundColor: pal.muted, borderRadius: 4 },
                  { label: bLabel, data: (['RENTED', 'RESERVED', 'ACTIVE'] as Status[]).map((s) => cmp.countsByStatus.b[s]), backgroundColor: pal.accent, borderRadius: 4 },
                ],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: pal.muted, boxWidth: 10 } } },
                scales: {
                  x: { ticks: { color: pal.muted }, grid: { display: false } },
                  y: { ticks: { color: pal.muted, precision: 0 }, grid: { color: pal.grid }, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
      </div>

      {cmp.statusChanged.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-section-title">Status changes ({cmp.statusChanged.length})</div>
          <div className="card-section-subtitle">Properties whose status differs between snapshots</div>
          <ChangeList items={cmp.statusChanged.map((d) => ({
            id: d.after.id,
            title: d.after.title || d.after.property_code || d.after.id,
            sub: (d.after.society || '') + ' · ' + (d.after.locality || ''),
            from: STATUS_LABELS[d.before.status as Status] || d.before.status || '—',
            to: STATUS_LABELS[d.after.status as Status] || d.after.status || '—',
            color: STATUS_COLORS[d.after.status as Status] || pal.accent,
          }))} />
        </div>
      )}

      {cmp.rentChanged.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-section-title">Rent changes ({cmp.rentChanged.length})</div>
          <div className="card-section-subtitle">Sorted by absolute rent shift</div>
          <ChangeList items={cmp.rentChanged.slice(0, 50).map((d) => ({
            id: d.after.id,
            title: d.after.title || d.after.property_code || d.after.id,
            sub: (d.after.society || '') + ' · ' + (d.after.locality || ''),
            from: fmtINR(d.before_rent),
            to: fmtINR(d.after_rent) + '  (' + (d.delta > 0 ? '+' : '') + fmtINRk(d.delta) + ', ' + (d.pct > 0 ? '+' : '') + d.pct.toFixed(1) + '%)',
            color: d.delta > 0 ? 'var(--success)' : 'var(--danger)',
          }))} />
          {cmp.rentChanged.length > 50 && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>showing top 50 of {cmp.rentChanged.length}</div>}
        </div>
      )}

      <div className="charts-row">
        <DiffList title="Locality shifts" subtitle="Where inventory grew or shrunk" rows={cmp.byLocality.slice(0, 12)} />
        <DiffList title="Society shifts" subtitle="Per-society count changes"   rows={cmp.bySociety.slice(0, 12)} />
        <DiffList title="BHK shifts"     subtitle="Bedroom configurations"      rows={cmp.byBhk} />
      </div>

      {cmp.byId.added.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-section-title">New in {bLabel} ({cmp.byId.added.length})</div>
          <div className="card-section-subtitle">Properties not present in {aLabel}</div>
          <ChangeList items={cmp.byId.added.map((p) => ({
            id: p.id, title: p.title || p.property_code || p.id,
            sub: (p.society || '') + ' · ' + (p.locality || ''),
            from: '—', to: STATUS_LABELS[p.status as Status] || p.status || '—',
            color: STATUS_COLORS[p.status as Status] || pal.accent,
          }))} />
        </div>
      )}

      {cmp.byId.removed.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-section-title">Removed since {aLabel} ({cmp.byId.removed.length})</div>
          <div className="card-section-subtitle">Present in {aLabel} but not in {bLabel}</div>
          <ChangeList items={cmp.byId.removed.map((p) => ({
            id: p.id, title: p.title || p.property_code || p.id,
            sub: (p.society || '') + ' · ' + (p.locality || ''),
            from: STATUS_LABELS[p.status as Status] || p.status || '—', to: '—',
            color: 'var(--danger)',
          }))} />
        </div>
      )}
    </>
  );
}

function DeltaKpi({ label, aValue, bValue, variant }: { label: string; aValue: number; bValue: number; variant?: string }) {
  const delta = bValue - aValue;
  const pct = aValue === 0 ? null : ((delta / aValue) * 100);
  const color = delta === 0 ? 'var(--text-muted)' : delta > 0 ? 'var(--success)' : 'var(--danger)';
  return (
    <div className={`kpi ${variant ?? ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {bValue}
        <span style={{ fontSize: 13, fontWeight: 500, color, marginLeft: 8 }}>
          {delta === 0 ? '—' : (delta > 0 ? '↑ +' : '↓ ') + Math.abs(delta) + (pct != null ? ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)` : '')}
        </span>
      </div>
      <div className="kpi-sub mono">was {aValue}</div>
    </div>
  );
}

function Pair({ a, b, fmt }: { a: number | null; b: number | null; fmt: (v: number | null) => string }) {
  const delta = a != null && b != null ? b - a : null;
  return (
    <span className="stat-value">
      {fmt(a)} → {fmt(b)}
      {delta != null && delta !== 0 && (
        <span style={{ marginLeft: 8, color: delta > 0 ? 'var(--success)' : 'var(--danger)' }}>
          {delta > 0 ? '+' : ''}{fmtINRk(delta)}
        </span>
      )}
    </span>
  );
}

interface ChangeRow { id: string; title: string; sub: string; from: string; to: string; color: string; }
function ChangeList({ items }: { items: ChangeRow[] }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 360, overflowY: 'auto' }}>
      {items.map((it) => (
        <div
          key={it.id}
          onClick={() => navigate(`/property/${encodeURIComponent(it.id)}`)}
          style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '10px 0', borderBottom: '1px dashed var(--border)', cursor: 'pointer' }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{it.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{it.sub}</div>
          </div>
          <div style={{ fontSize: 12, color: it.color, alignSelf: 'center', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>
            {it.from} → {it.to}
          </div>
        </div>
      ))}
    </div>
  );
}

function DiffList({ title, subtitle, rows }: { title: string; subtitle: string; rows: { name: string; a: number; b: number; delta: number }[] }) {
  return (
    <div className="card chart-card">
      <div className="card-section-title">{title}</div>
      <div className="card-section-subtitle">{subtitle}</div>
      <div className="chart-list">
        {rows.map((r) => (
          <div className="chart-list-item" key={r.name}>
            <div>
              <div className="name">{r.name}</div>
              <div className="meta mono">{r.a} → {r.b}</div>
            </div>
            <div className="count" style={{ color: r.delta === 0 ? 'var(--text-muted)' : r.delta > 0 ? 'var(--success)' : 'var(--danger)' }}>
              {r.delta === 0 ? '—' : (r.delta > 0 ? '+' : '') + r.delta}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="empty-state">No changes</div>}
      </div>
    </div>
  );
}
