import { useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler, RadialLinearScale,
} from 'chart.js';
import type { Property, SnapshotMeta, Theme } from '../types';
import { chartPalette } from '../theme';
import { fmtINRk } from '../utils';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler, RadialLinearScale,
);
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.font.size = 12;

export function SocietyList({ properties }: { properties: Property[] }) {
  const items = useMemo(() => {
    const c: Record<string, { count: number; society_id: string }> = {};
    properties.forEach((p) => {
      const k = p.society || 'Unknown';
      if (!c[k]) c[k] = { count: 0, society_id: p.society_id || '—' };
      c[k].count++;
    });
    return Object.entries(c).sort((a, b) => b[1].count - a[1].count);
  }, [properties]);

  return (
    <div className="chart-list">
      {items.map(([name, v]) => (
        <div className="chart-list-item" key={name}>
          <div>
            <div className="name">{name}</div>
            <div className="meta mono">{v.society_id}</div>
          </div>
          <div className="count">{v.count}</div>
        </div>
      ))}
      {items.length === 0 && <div className="empty-state">No data</div>}
    </div>
  );
}

export function LocalityList({ properties }: { properties: Property[] }) {
  const items = useMemo(() => {
    const c: Record<string, number> = {};
    properties.forEach((p) => { const k = p.locality || 'Unknown'; c[k] = (c[k] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [properties]);

  return (
    <div className="chart-list">
      {items.map(([name, n]) => (
        <div className="chart-list-item" key={name}>
          <div className="name">{name}</div>
          <div className="count">{n}</div>
        </div>
      ))}
      {items.length === 0 && <div className="empty-state">No data</div>}
    </div>
  );
}

export function TierChart({ properties, theme }: { properties: Property[]; theme: Theme }) {
  const p = chartPalette(theme);
  const data = useMemo(() => {
    const c: Record<string, number> = {};
    properties.forEach((pp) => { const k = String(pp.tier ?? 'Unknown'); c[k] = (c[k] || 0) + 1; });
    const ord = Object.keys(c).sort((a, b) => a.localeCompare(b));
    return {
      labels: ord.map((k) => 'Tier ' + k),
      datasets: [{ data: ord.map((k) => c[k]), backgroundColor: p.series, borderWidth: 0 }],
    };
  }, [properties, theme]);

  return (
    <div className="chart-canvas-wrap">
      <Doughnut
        data={data}
        options={{
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: { legend: { position: 'bottom', labels: { color: p.muted, padding: 12, boxWidth: 10 } } },
        }}
      />
    </div>
  );
}

export function BhkChart({ properties, theme }: { properties: Property[]; theme: Theme }) {
  const p = chartPalette(theme);
  const data = useMemo(() => {
    const c: Record<string, number> = {};
    properties.forEach((pp) => { const k = pp.bhk || 'Unknown'; c[k] = (c[k] || 0) + 1; });
    const ord = Object.keys(c).sort();
    return { labels: ord, datasets: [{ data: ord.map((k) => c[k]), backgroundColor: p.accent, borderRadius: 6 }] };
  }, [properties, theme]);

  return (
    <div className="chart-canvas-wrap">
      <Bar
        data={data}
        options={{
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: p.muted }, grid: { display: false } },
            y: { ticks: { color: p.muted, precision: 0 }, grid: { color: p.grid }, beginAtZero: true },
          },
        }}
      />
    </div>
  );
}

export function RentHistogram({ properties, theme }: { properties: Property[]; theme: Theme }) {
  const p = chartPalette(theme);
  const data = useMemo(() => {
    const rents = properties.map((pp) => pp.pricing?.rent ?? pp.rent).filter((v): v is number => v != null && v > 0).sort((a, b) => a - b);
    if (rents.length === 0) return null;
    const min = rents[0], max = rents[rents.length - 1];
    const bins = 12; const step = (max - min) / bins || 1;
    const buckets = new Array(bins).fill(0);
    rents.forEach((v) => { const i = Math.min(bins - 1, Math.floor((v - min) / step)); buckets[i]++; });
    return {
      labels: buckets.map((_, i) => fmtINRk(min + i * step)),
      datasets: [{ data: buckets, backgroundColor: p.accent2, borderRadius: 4 }],
    };
  }, [properties, theme]);

  if (!data) return <div className="empty-state">No data</div>;
  return (
    <div className="chart-canvas-wrap">
      <Bar
        data={data}
        options={{
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { title: (items) => 'From ' + items[0].label } } },
          scales: {
            x: { ticks: { color: p.muted, maxRotation: 0, autoSkip: true }, grid: { display: false } },
            y: { ticks: { color: p.muted, precision: 0 }, grid: { color: p.grid }, beginAtZero: true },
          },
        }}
      />
    </div>
  );
}

export function RatingChart({ properties, theme }: { properties: Property[]; theme: Theme }) {
  const p = chartPalette(theme);
  const data = useMemo(() => {
    const c: Record<string, number> = {};
    properties.forEach((pp) => { const k = String(pp.rating ?? 'N/A'); c[k] = (c[k] || 0) + 1; });
    const ord = Object.keys(c).sort((a, b) => Number(a) - Number(b));
    return { labels: ord, datasets: [{ data: ord.map((k) => c[k]), backgroundColor: p.success, borderRadius: 4 }] };
  }, [properties, theme]);

  return (
    <div className="chart-canvas-wrap">
      <Bar
        data={data}
        options={{
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: p.muted }, grid: { display: false } },
            y: { ticks: { color: p.muted, precision: 0 }, grid: { color: p.grid }, beginAtZero: true },
          },
        }}
      />
    </div>
  );
}

export function TrendChart({ runs, theme }: { runs: SnapshotMeta[]; theme: Theme }) {
  const p = chartPalette(theme);
  const data = useMemo(() => ({
    labels: runs.map((r) => new Date(r.generated_at_utc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })),
    datasets: [
      { label: 'Listings', data: runs.map((r) => r.counts.listings), borderColor: p.accent, backgroundColor: p.accent + '22', tension: 0.35, fill: true },
      { label: 'Rented', data: runs.map((r) => r.counts.rented), borderColor: p.success, backgroundColor: p.success + '22', tension: 0.35, fill: true },
      { label: 'Perfect', data: runs.map((r) => r.counts.perfect), borderColor: p.warning, backgroundColor: p.warning + '22', tension: 0.35, fill: true },
    ],
  }), [runs, theme]);

  return (
    <Line
      data={data}
      options={{
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { position: 'top', align: 'end', labels: { color: p.muted, boxWidth: 10 } } },
        scales: {
          x: { ticks: { color: p.muted }, grid: { display: false } },
          y: { ticks: { color: p.muted, precision: 0 }, grid: { color: p.grid }, beginAtZero: true },
        },
      }}
    />
  );
}
