import { useMemo } from 'react';
import type { CollatedSnapshot, FilterState, InterestState, SnapshotMeta, Theme } from '../types';
import { fmtDateTime } from '../utils';
import { KPIRow } from '../components/KPIRow';
import { FinancialCard } from '../components/FinancialCard';
import { SocietyList, LocalityList, TierChart, BhkChart, RentHistogram, RatingChart, TrendChart } from '../components/Charts';
import { OverviewMap } from '../components/MapView';
import { Filters } from '../components/Filters';
import { PropertyGrid } from '../components/PropertyGrid';

interface Props {
  snapshot: CollatedSnapshot;
  runs: SnapshotMeta[];
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
  interest: InterestState;
  onInterestChange: (next: InterestState) => void;
  theme: Theme;
}

export function Dashboard({ snapshot, runs, filter, onFilterChange, interest, onInterestChange, theme }: Props) {
  const props = snapshot.properties;
  const meta = snapshot.metadata;

  const localities = useMemo(() => Object.keys(snapshot.summary.all_unique.by_locality).filter((k) => k !== 'Unknown').length, [snapshot]);
  const societies = useMemo(() => Object.keys(snapshot.summary.all_unique.by_society).filter((k) => k !== 'Unknown').length, [snapshot]);

  const filtered = useMemo(() => {
    const q = (filter.q || '').toLowerCase().trim();
    return props.filter((p) => {
      if (filter.status !== 'ALL' && p.status !== filter.status) return false;
      if (filter.tier !== 'ALL' && String(p.tier) !== filter.tier) return false;
      if (filter.bhk !== 'ALL' && p.bhk !== filter.bhk) return false;
      if (filter.locality !== 'ALL' && p.locality !== filter.locality) return false;
      if (q) {
        const hay = ((p.title || '') + ' ' + (p.society || '') + ' ' + (p.locality || '') + ' ' + (p.property_code || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [props, filter]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Portfolio overview</div>
          <div className="page-subtitle">
            {props.length} properties · {meta.counts.unique_properties} unique · across {localities} localities, {societies} societies
          </div>
        </div>
        <div className="timestamp-pill"><span className="dot" /> Snapshot · {fmtDateTime(meta.generated_at_utc)}</div>
      </div>

      <KPIRow properties={props} runs={runs.length} />

      <div className="fin-row">
        <FinancialCard properties={props} group="RENTED" title="Occupied units" interest={interest} onInterestChange={onInterestChange} />
        <FinancialCard properties={props} group="RESERVED" title="Reserved units" interest={interest} onInterestChange={onInterestChange} />
        <FinancialCard properties={props} group="ACTIVE" title="Unoccupied units" interest={interest} onInterestChange={onInterestChange} />
      </div>

      <div className="charts-row">
        <div className="card chart-card">
          <div className="card-section-title">By society</div>
          <div className="card-section-subtitle">Top concentrations of inventory</div>
          <SocietyList properties={props} />
        </div>
        <div className="card chart-card">
          <div className="card-section-title">By tier</div>
          <div className="card-section-subtitle">Property tier distribution</div>
          <TierChart properties={props} theme={theme} />
        </div>
        <div className="card chart-card">
          <div className="card-section-title">By locality</div>
          <div className="card-section-subtitle">Where the portfolio sits</div>
          <LocalityList properties={props} />
        </div>
      </div>

      <div className="charts-row">
        <div className="card chart-card">
          <div className="card-section-title">By BHK</div>
          <div className="card-section-subtitle">Bedroom configurations</div>
          <BhkChart properties={props} theme={theme} />
        </div>
        <div className="card chart-card">
          <div className="card-section-title">Rent distribution</div>
          <div className="card-section-subtitle">Monthly rent across all units</div>
          <RentHistogram properties={props} theme={theme} />
        </div>
        <div className="card chart-card">
          <div className="card-section-title">Ratings</div>
          <div className="card-section-subtitle">Helium internal ratings</div>
          <RatingChart properties={props} theme={theme} />
        </div>
      </div>

      {runs.length > 1 && (
        <div className="card trend-card">
          <div className="trend-head">
            <div>
              <div className="card-section-title">Snapshot trends</div>
              <div className="card-section-subtitle">How counts have moved across snapshots</div>
            </div>
          </div>
          <div className="trend-body"><TrendChart runs={runs} theme={theme} /></div>
        </div>
      )}

      <div className="card chart-card" style={{ marginBottom: 28 }}>
        <div className="card-section-title">Map</div>
        <div className="card-section-subtitle">All properties plotted by latitude / longitude</div>
        <div className="map-wrap" style={{ marginTop: 12 }}>
          <OverviewMap properties={props} />
        </div>
      </div>

      <div className="page-head">
        <div><div className="page-title" style={{ fontSize: 18 }}>Properties ({filtered.length})</div></div>
      </div>
      <Filters properties={props} filter={filter} onChange={onFilterChange} />
      <PropertyGrid properties={filtered} />
    </>
  );
}
