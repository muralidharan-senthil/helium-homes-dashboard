import { useNavigate } from 'react-router-dom';
import type { Property } from '../types';
import { fmtINR, getPrimaryImage, STATUS_LABELS } from '../utils';

export function PropertyGrid({ properties }: { properties: Property[] }) {
  if (properties.length === 0) {
    return <div className="empty-state" style={{ gridColumn: '1/-1' }}>No properties match the current filters</div>;
  }
  return (
    <div className="props-grid">
      {properties.map((p) => <Card key={p.id} p={p} />)}
    </div>
  );
}

function Card({ p }: { p: Property }) {
  const navigate = useNavigate();
  const url = getPrimaryImage(p);
  const statusLabel = STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] || p.status || '—';

  return (
    <div className="prop-card" onClick={() => navigate(`/property/${encodeURIComponent(p.id)}`)}>
      <div className="prop-image">
        {url ? (
          <img src={url} alt={p.title} loading="lazy" onError={(e) => {
            const t = e.currentTarget;
            const ph = document.createElement('div');
            ph.className = 'prop-image-placeholder';
            ph.textContent = 'No image';
            t.replaceWith(ph);
          }} />
        ) : <div className="prop-image-placeholder">No image</div>}
        <span className={`prop-badge ${p.status ?? ''}`}>{statusLabel}</span>
        {p.rating != null && <span className="prop-rating-badge">★ {p.rating}</span>}
      </div>
      <div className="prop-body">
        <div className="prop-title">{p.title || p.property_code || '—'}</div>
        <div className="prop-society">{p.society || ''} · {p.locality || ''}</div>
        <div className="prop-meta">
          {p.bhk && <span className="prop-meta-tag">{p.bhk}</span>}
          {p.tier != null && <span className="prop-meta-tag">Tier {p.tier}</span>}
          {p.balconyFacing && <span className="prop-meta-tag">{p.balconyFacing}-facing</span>}
          {p.property_code && <span className="prop-meta-tag mono">{p.property_code}</span>}
        </div>
        <div className="prop-pricing">
          <div className="prop-pricing-row primary"><span className="label">Rent</span><span className="value">{fmtINR(p.pricing?.rent ?? p.rent)}/mo</span></div>
          <div className="prop-pricing-row"><span className="label">Maintenance</span><span className="value">{fmtINR(p.pricing?.maintainance)}</span></div>
          <div className="prop-pricing-row"><span className="label">Full deposit</span><span className="value">{fmtINR(p.pricing?.full_deposit)}</span></div>
        </div>
      </div>
    </div>
  );
}
