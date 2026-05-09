import { useMemo } from 'react';
import type { FilterState, Property } from '../types';

interface Props {
  properties: Property[];
  filter: FilterState;
  onChange: (f: FilterState) => void;
}

export function Filters({ properties, filter, onChange }: Props) {
  const tiers = useMemo(() => Array.from(new Set(properties.map((p) => p.tier).filter((v): v is number => v != null))).sort((a, b) => a - b), [properties]);
  const bhks = useMemo(() => Array.from(new Set(properties.map((p) => p.bhk).filter((v): v is string => Boolean(v)))).sort(), [properties]);
  const localities = useMemo(() => Array.from(new Set(properties.map((p) => p.locality).filter((v): v is string => Boolean(v)))).sort(), [properties]);

  return (
    <div className="filters">
      <ChipGroup
        dim="status" value={filter.status} onChange={(v) => onChange({ ...filter, status: v as any })}
        options={[['ALL', 'All'], ['RENTED', 'Occupied'], ['RESERVED', 'Reserved'], ['ACTIVE', 'Unoccupied']]}
      />
      <ChipGroup
        dim="tier" value={filter.tier} onChange={(v) => onChange({ ...filter, tier: v })}
        options={[['ALL', 'All tiers'] as [string, string]].concat(tiers.map((t) => [String(t), 'Tier ' + t]))}
      />
      <ChipGroup
        dim="bhk" value={filter.bhk} onChange={(v) => onChange({ ...filter, bhk: v })}
        options={[['ALL', 'All BHK'] as [string, string]].concat(bhks.map((b) => [b, b]))}
      />
      <select className="select" value={filter.locality} onChange={(e) => onChange({ ...filter, locality: e.target.value })}>
        <option value="ALL">All localities</option>
        {localities.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
    </div>
  );
}

function ChipGroup({ dim, value, onChange, options }: { dim: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <>
      {options.map(([v, lbl]) => (
        <button key={dim + v} className={`chip ${value === v ? 'active' : ''}`} onClick={() => onChange(v)}>
          {lbl}
        </button>
      ))}
    </>
  );
}
