import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { PropertyDetails } from './pages/PropertyDetails';
import { Compare } from './pages/Compare';
import { useTheme } from './theme';
import { api } from './api';
import type { CollatedSnapshot, IndexFile, InterestState, FilterState, SnapshotMeta } from './types';

const INTEREST_KEY = 'hh.interest';
const defaultInterest: InterestState = { RENTED: 8, RESERVED: 8, ACTIVE: 8 };

export default function App() {
  const { theme, toggle } = useTheme();
  const [index, setIndex] = useState<IndexFile>({ runs: [] });
  const [snapshot, setSnapshot] = useState<CollatedSnapshot | null>(null);
  const [selectedTs, setSelectedTs] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterState>({ status: 'ALL', tier: 'ALL', bhk: 'ALL', locality: 'ALL', q: '' });
  const [interest, setInterest] = useState<InterestState>(() => {
    try { return { ...defaultInterest, ...JSON.parse(localStorage.getItem(INTEREST_KEY) || '{}') }; }
    catch { return defaultInterest; }
  });

  const persistInterest = (next: InterestState) => {
    setInterest(next);
    localStorage.setItem(INTEREST_KEY, JSON.stringify(next));
  };

  const loadIndexAndLatest = useCallback(async (preferTs?: string) => {
    setLoading(true);
    try {
      const idx = await api.index();
      setIndex(idx);
      if (idx.runs.length === 0) {
        setSnapshot(null);
        setSelectedTs(null);
      } else {
        const target = preferTs && idx.runs.find((r) => r.version_timestamp === preferTs)
          ? preferTs
          : idx.runs[idx.runs.length - 1].version_timestamp;
        const snap = preferTs ? await api.snapshot(target) : await api.latest();
        setSnapshot(snap);
        setSelectedTs(target);
      }
    } catch (err) {
      console.error(err);
      setToastWithTimeout('Failed to load data — is the API server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadIndexAndLatest(); }, [loadIndexAndLatest]);

  const setToastWithTimeout = (msg: string, ms = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  const onSnapshotChange = async (ts: string) => {
    setLoading(true);
    try {
      const snap = await api.snapshot(ts);
      setSnapshot(snap);
      setSelectedTs(ts);
    } catch (err) {
      console.error(err);
      setToastWithTimeout('Could not load that snapshot');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setToastWithTimeout('Fetching fresh data from heliumhomes.in...', 60000);
    try {
      const res = await api.refresh();
      if (!res.ok) {
        setToastWithTimeout('Refresh failed: ' + (res.error || res.stderr || 'unknown error'), 6000);
      } else {
        setToastWithTimeout(`Got fresh snapshot · ${res.runs} total · loading...`);
        const newTs = res.latest?.version_timestamp;
        await loadIndexAndLatest(newTs ?? undefined);
        setToastWithTimeout(`Snapshot saved · ${newTs ? new Date(res.latest!.generated_at_utc).toLocaleString() : ''}`);
      }
    } catch (err: any) {
      console.error(err);
      setToastWithTimeout('Refresh error: ' + (err?.message || err));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggle}
        runs={index.runs}
        selectedTs={selectedTs}
        onSnapshotChange={onSnapshotChange}
        onRefresh={onRefresh}
        refreshing={refreshing}
        searchQuery={filter.q}
        onSearch={(q) => setFilter((f) => ({ ...f, q }))}
      />
      <main>
        <div className="container">
          {loading ? (
            <div className="loading-shell"><span className="spinner" /> Loading snapshot...</div>
          ) : !snapshot ? (
            <EmptyState onRefresh={onRefresh} refreshing={refreshing} />
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    snapshot={snapshot}
                    runs={index.runs}
                    filter={filter}
                    onFilterChange={setFilter}
                    interest={interest}
                    onInterestChange={persistInterest}
                    theme={theme}
                  />
                }
              />
              <Route path="/property/:id" element={<PropertyDetails snapshot={snapshot} theme={theme} />} />
              <Route path="/compare" element={<Compare runs={index.runs} preselectA={index.runs[0]?.version_timestamp} preselectB={selectedTs ?? null} theme={theme} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </div>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function EmptyState({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <div className="empty-banner">
      <h2>No snapshots yet</h2>
      <p>
        Click <strong>Get Data</strong> below to fetch the first snapshot from heliumhomes.in. The script writes
        timestamped files to <code className="mono">../data/</code> and never overwrites previous runs.
      </p>
      <button className="btn" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? <><span className="spinner" /> Fetching...</> : 'Get Data'}
      </button>
    </div>
  );
}
