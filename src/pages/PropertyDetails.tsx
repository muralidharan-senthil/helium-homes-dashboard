import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Radar } from 'react-chartjs-2';
import type { CollatedSnapshot, Theme } from '../types';
import { fmtINR, fmtNum, fmtDate, fmtDateTime, STATUS_LABELS } from '../utils';
import { chartPalette } from '../theme';
import { PropertyMap } from '../components/MapView';
import { Lightbox } from '../components/Lightbox';

export function PropertyDetails({ snapshot, theme }: { snapshot: CollatedSnapshot; theme: Theme }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const property = useMemo(() => snapshot.properties.find((p) => p.id === id), [snapshot, id]);
  if (!property) {
    return (
      <>
        <div className="pd-back" onClick={() => navigate('/')}>← Back to dashboard</div>
        <div className="empty-state">Property not found</div>
      </>
    );
  }
  const p = property;
  const imgs = (p.images || []).slice(0, 5);
  const primary = imgs.find((i) => i.is_primary) || imgs[0];
  const others = imgs.filter((i) => i !== primary).slice(0, 4);
  const days = p.marketing_started_at && p.rented_at
    ? Math.round((Number(p.rented_at) - Number(p.marketing_started_at)) / 86_400_000)
    : null;
  const rentPerSqft = p.pricing?.rent && p.square_feet ? p.pricing.rent / p.square_feet : null;

  const vibeLabels = p.vibeMetrics ? Object.keys(p.vibeMetrics) : [];
  const pal = chartPalette(theme);

  return (
    <>
      <div className="pd-back" onClick={() => navigate('/')}>← Back to dashboard</div>

      <div className="pd-hero">
        <div className="pd-gallery">
          {primary?.large_url || primary?.image_url ? (
            <img className="main-img" src={primary.large_url || primary.image_url} alt="" onClick={() => setLightbox(primary.large_url || primary.image_url || null)} />
          ) : <div className="main-img prop-image-placeholder">No image</div>}
          {others.map((im, i) => (
            <img key={i} src={im.medium_url || im.image_url} alt="" onClick={() => setLightbox(im.large_url || im.image_url || null)} />
          ))}
        </div>
      </div>

      <div className="pd-header">
        <div>
          <div className="pd-title">{p.title || p.property_code || '—'}</div>
          <div className="pd-loc">
            <span>{p.society || '—'}</span>
            <span>· {p.locality || '—'}</span>
            <span className="mono">· {p.property_code || '—'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {p.is_featured && <span className="prop-meta-tag" style={{ background: '#fef3c7', color: '#92400e' }}>FEATURED</span>}
          {p.is_sponsored && <span className="prop-meta-tag" style={{ background: '#dbeafe', color: '#1e40af' }}>SPONSORED</span>}
          <div className={`pd-status-pill ${p.status || ''}`}>{STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] || p.status || '—'}</div>
        </div>
      </div>

      <div className="stat-grid">
        <StatBox label="Rent" value={fmtINR(p.pricing?.rent ?? p.rent)} sub="per month" />
        <StatBox label="Total monthly" value={fmtINR(p.pricing?.total_monthly ?? p.total_rent)} sub="incl. maintenance" />
        <StatBox label="Full deposit" value={fmtINR(p.pricing?.full_deposit)} sub={p.pricing?.deposit_months ? p.pricing.deposit_months + ' months' : ''} />
        <StatBox label="BHK" value={p.bhk || '—'} sub={`${p.bedrooms ?? '?'} bed · ${p.bathrooms ?? '?'} bath`} />
        <StatBox label="Square feet" value={p.square_feet ? fmtNum(p.square_feet) : '—'} sub={rentPerSqft ? '₹' + rentPerSqft.toFixed(1) + '/sqft' : ''} />
        <StatBox label="Floor" value={(p.floor != null ? String(p.floor) : '—') + (p.total_floors ? ' / ' + p.total_floors : '')} sub={`facing ${p.facing || '—'}`} />
        <StatBox label="Tier" value={p.tier != null ? String(p.tier) : '—'} sub={`rating ${p.rating != null ? p.rating : '—'}`} />
        <StatBox label="Visits booked" value={p.visits_booked != null ? String(p.visits_booked) : '—'} sub={days != null ? days + ' days to rent' : 'on market'} />
      </div>

      <div className="pd-grid" style={{ marginTop: 24 }}>
        <div>
          <div className="section">
            <div className="section-title">About this property</div>
            <div className="card">{p.description || p.seo_description || '—'}</div>
          </div>

          {p.amenities && p.amenities.length > 0 && (
            <div className="section">
              <div className="section-title">Amenities ({p.amenities.length})</div>
              <div className="section-grid amenity-grid">
                {p.amenities.map((a, i) => (
                  <div className="amenity-pill" key={i}>✓ {typeof a === 'string' ? a : a.name}</div>
                ))}
              </div>
            </div>
          )}

          {p.features && p.features.length > 0 && (
            <div className="section">
              <div className="section-title">Features</div>
              <div className="card">
                <div className="section-grid amenity-grid">
                  {p.features.map((f, i) => (
                    <div className="amenity-pill" key={i}>• {typeof f === 'string' ? f : f.label}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {p.nearbyPlaces && p.nearbyPlaces.length > 0 && (
            <div className="section">
              <div className="section-title">Nearby places</div>
              <div className="card">
                <div className="section-grid amenity-grid">
                  {p.nearbyPlaces.slice(0, 30).map((np, i) => (
                    <div className="amenity-pill" key={i}>
                      {np.name || np.type || 'Place'}{np.distance != null ? ' · ' + np.distance + 'm' : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {p.latitude != null && p.longitude != null && (
            <div className="section">
              <div className="section-title">Location</div>
              <div className="map-wrap"><PropertyMap property={p} /></div>
            </div>
          )}
        </div>

        <div>
          <div className="section">
            <div className="section-title">Pricing breakdown</div>
            <div className="card">
              <table className="pricing-table">
                <tbody>
                  <tr><td>Rent</td><td>{fmtINR(p.pricing?.rent)}</td></tr>
                  <tr><td>Maintenance</td><td>{fmtINR(p.pricing?.maintainance)}</td></tr>
                  <tr><td>Service fee</td><td>{fmtINR(p.pricing?.service_fee)}</td></tr>
                  <tr><td>Total monthly</td><td>{fmtINR(p.pricing?.total_monthly)}</td></tr>
                  <tr><td>Full deposit</td><td>{fmtINR(p.pricing?.full_deposit)}</td></tr>
                  <tr><td>Deposit months</td><td>{p.pricing?.deposit_months ?? '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="section">
            <div className="section-title">Timeline</div>
            <div className="card">
              <div className="timeline">
                {p.createdAt && <TimelineItem when={fmtDateTime(p.createdAt)} what="Listed in system" muted />}
                {p.marketing_started_at && <TimelineItem when={fmtDate(p.marketing_started_at)} what="Marketing started" />}
                {p.available_from && <TimelineItem when={fmtDate(p.available_from)} what="Available from" muted />}
                {p.rented_at && <TimelineItem when={fmtDate(p.rented_at)} what="Rented" />}
                {p.updatedAt && <TimelineItem when={fmtDateTime(p.updatedAt)} what="Last updated" muted />}
              </div>
            </div>
          </div>

          {(p.balconies != null || p.balconyFacing) && (
            <div className="section">
              <div className="section-title">Balconies</div>
              <div className="card">
                <div className="stat-row"><span className="stat-label">Count</span><span className="stat-value">{p.balconies ?? '—'}</span></div>
                <div className="stat-row"><span className="stat-label">Facing</span><span className="stat-value">{p.balconyFacing || '—'}</span></div>
              </div>
            </div>
          )}

          {p.poc && (p.poc.name || p.poc.phone || p.poc.email) && (
            <div className="section">
              <div className="section-title">Point of contact</div>
              <div className="card">
                {p.poc.name && <div className="stat-row"><span className="stat-label">Name</span><span className="stat-value">{p.poc.name}</span></div>}
                {p.poc.phone && <div className="stat-row"><span className="stat-label">Phone</span><span className="stat-value mono">{p.poc.phone}</span></div>}
                {p.poc.email && <div className="stat-row"><span className="stat-label">Email</span><span className="stat-value">{p.poc.email}</span></div>}
              </div>
            </div>
          )}

          {vibeLabels.length > 0 && (
            <div className="section">
              <div className="section-title">Vibe metrics</div>
              <div className="card">
                <div className="chart-canvas-wrap" style={{ minHeight: 220 }}>
                  <Radar
                    data={{
                      labels: vibeLabels,
                      datasets: [{
                        label: 'Score',
                        data: vibeLabels.map((l) => Number((p.vibeMetrics as any)[l]) || 0),
                        backgroundColor: pal.accent + '33',
                        borderColor: pal.accent,
                        pointBackgroundColor: pal.accent,
                      }],
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      scales: {
                        r: {
                          ticks: { color: pal.muted, backdropColor: 'transparent' },
                          grid: { color: pal.grid }, angleLines: { color: pal.grid },
                          pointLabels: { color: pal.muted },
                        },
                      },
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {p.rooms && p.rooms.length > 0 && (
            <div className="section">
              <div className="section-title">Rooms ({p.rooms.length})</div>
              <div className="card">
                {p.rooms.map((r, i) => (
                  <div className="stat-row" key={i}>
                    <span className="stat-label">{r.name || r.type || 'Room'}</span>
                    <span className="stat-value">{r.size ?? ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.video_url && (
            <div className="section">
              <div className="section-title">Video</div>
              <div className="card"><a href={p.video_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Open video walkthrough →</a></div>
            </div>
          )}

          <div className="section">
            <div className="section-title">Categories in this snapshot</div>
            <div className="card">
              {(p._categories || []).map((c) => <span className="prop-meta-tag" key={c} style={{ marginRight: 4 }}>{c}</span>)}
            </div>
          </div>
        </div>
      </div>

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-box">
      <div className="stat-box-label">{label}</div>
      <div className="stat-box-value">{value}</div>
      {sub && <div className="stat-box-sub">{sub}</div>}
    </div>
  );
}

function TimelineItem({ when, what, muted }: { when: string; what: string; muted?: boolean }) {
  return (
    <div className={`timeline-item ${muted ? 'muted' : ''}`}>
      <div className="when">{when}</div>
      <div className="what">{what}</div>
    </div>
  );
}
