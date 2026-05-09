import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import type { Property } from '../types';
import { STATUS_COLORS } from '../utils';

/** Re-runs invalidateSize on mount, after a couple of layout ticks, and on any
 *  container resize. Without this, Leaflet often paints into a 0×0 box (gray
 *  tiles, missing markers) when it mounts inside a flex/grid container. */
function MapAutoSize() {
  const map = useMap();
  useEffect(() => {
    const tick = () => map.invalidateSize();
    tick();
    const t1 = window.setTimeout(tick, 100);
    const t2 = window.setTimeout(tick, 400);
    const ro = new ResizeObserver(tick);
    ro.observe(map.getContainer());
    return () => {
      clearTimeout(t1); clearTimeout(t2); ro.disconnect();
    };
  }, [map]);
  return null;
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    // Defer to next frame so the container has its final size
    const id = requestAnimationFrame(() => map.fitBounds(bounds, { padding: [30, 30] }));
    return () => cancelAnimationFrame(id);
  }, [map, bounds]);
  return null;
}

export function OverviewMap({ properties }: { properties: Property[] }) {
  const pts = useMemo(
    () => properties.filter((p) => p.latitude != null && p.longitude != null),
    [properties],
  );
  const bounds = useMemo<[number, number][]>(
    () => pts.map((p) => [p.latitude!, p.longitude!]),
    [pts],
  );

  if (pts.length === 0) return <div className="empty-state">No coordinates available</div>;

  return (
    <MapContainer
      center={[pts[0].latitude!, pts[0].longitude!]}
      zoom={11}
      style={{ height: '100%', width: '100%', zIndex: '0' }}
      scrollWheelZoom={true}
    >
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pts.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.latitude!, p.longitude!]}
          radius={7} weight={2} color="#fff"
          fillColor={STATUS_COLORS[p.status as keyof typeof STATUS_COLORS] || '#004449'}
          fillOpacity={0.9}
        >
          <Popup>
            <strong>{p.title}</strong>
            <br />
            <span style={{ fontSize: 11, color: '#6b7280' }}>{p.locality}</span>
            <br />
            <Link to={`/property/${encodeURIComponent(p.id)}`} style={{ color: '#004449', fontSize: 12 }}>
              Open details →
            </Link>
          </Popup>
        </CircleMarker>
      ))}
      <FitBounds bounds={bounds} />
      <MapAutoSize />
    </MapContainer>
  );
}

export function PropertyMap({ property }: { property: Property }) {
  if (property.latitude == null || property.longitude == null) return null;
  const pos: [number, number] = [property.latitude, property.longitude];
  return (
    <MapContainer
      center={pos}
      zoom={15}
      style={{ height: '100%', width: '100%', zIndex: '0' }}
      scrollWheelZoom={true}
    >
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={pos}>
        <Popup>{property.title}</Popup>
      </Marker>
      <MapAutoSize />
    </MapContainer>
  );
}
