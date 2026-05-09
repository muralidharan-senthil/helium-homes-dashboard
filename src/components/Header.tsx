import { useNavigate, useLocation } from 'react-router-dom';
import type { SnapshotMeta, Theme } from '../types';

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  runs: SnapshotMeta[];
  selectedTs: string | null;
  onSnapshotChange: (ts: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  searchQuery: string;
  onSearch: (q: string) => void;
}

export function Header({
  theme, onToggleTheme, runs, selectedTs, onSnapshotChange, onRefresh, refreshing, searchQuery, onSearch,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const onCompare = location.pathname.startsWith('/compare');
  const ordered = [...runs].reverse();
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand" onClick={() => navigate('/')}>
          <BrandMark />
          <span>Helium Homes</span>
        </div>
        <div className="header-actions">
          {runs.length > 0 && !onCompare && (
            <select
              className="select"
              value={selectedTs ?? ''}
              onChange={(e) => onSnapshotChange(e.target.value)}
              title="Snapshot date"
            >
              {ordered.map((r) => (
                <option key={r.version_timestamp} value={r.version_timestamp}>
                  {new Date(r.generated_at_utc).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  {(r as any).backfilled ? ' · backfilled' : ''}
                </option>
              ))}
            </select>
          )}
          {!onCompare && (
            <input
              className="input"
              placeholder="Search property, society, locality..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
            />
          )}
          {runs.length >= 2 && (
            <button
              className={onCompare ? 'btn' : 'btn btn-secondary'}
              onClick={() => navigate(onCompare ? '/' : '/compare')}
              title="Compare two snapshots"
            >
              <CompareIcon /> {onCompare ? 'Exit compare' : 'Compare'}
            </button>
          )}
          <button className="btn" onClick={onRefresh} disabled={refreshing} title="Run fetch_helium_homes.js to pull fresh data">
            {refreshing ? <><span className="spinner" /> Fetching</> : <><RefreshIcon /> Get Data</>}
          </button>
          <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle theme">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}


function BrandMark() {
  return (
    <svg className="brand-mark" width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="brand-mark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8" fill="url(#brand-mark-grad)" />
      <text x="14" y="19" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="white" fontFamily="Inter, sans-serif" letterSpacing="-0.02em">He</text>
    </svg>
  );
}

function CompareIcon() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>);
}
function SunIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>);
}
function MoonIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>);
}
function RefreshIcon() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>);
}
