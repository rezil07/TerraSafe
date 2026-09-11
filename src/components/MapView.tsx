import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import { useMemo } from 'react';
import {
  fireEvents as allFireEvents,
  riskZones as allRiskZones,
  settlements as allSettlements,
} from '@/data/mockData';
import { RISK_COLORS, STATUS_COLORS, type FireEvent } from '@/types';

export interface MapLayers {
  activeFires: boolean;
  riskZones: boolean;
  settlements: boolean;
  roads: boolean;
  forestCover: boolean;
  weather: boolean;
  emergencyInfra: boolean;
}

const defaultLayers: MapLayers = {
  activeFires: true,
  riskZones: false,
  settlements: true,
  roads: false,
  forestCover: false,
  weather: false,
  emergencyInfra: false,
};

export function getDefaultLayers() {
  return { ...defaultLayers };
}

// Fix default marker icon
const fireIcon = L.divIcon({
  className: 'fire-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#FF3B30;box-shadow:0 0 8px #FF3B30,0 0 4px #FF6A3D;border:1.5px solid rgba(255,255,255,0.3);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const containedIcon = L.divIcon({
  className: 'fire-marker',
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#FFB020;box-shadow:0 0 6px #FFB020;border:1.5px solid rgba(255,255,255,0.3);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const monitoredIcon = L.divIcon({
  className: 'fire-marker',
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#00F5FF;box-shadow:0 0 6px #00F5FF;border:1.5px solid rgba(255,255,255,0.3);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const controlledIcon = L.divIcon({
  className: 'fire-marker',
  html: '<div style="width:10px;height:10px;border-radius:50%;background:#00FF88;box-shadow:0 0 4px #00FF88;border:1.5px solid rgba(255,255,255,0.2);"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const settlementIcon = L.divIcon({
  className: 'settlement-marker',
  html: '<div style="width:10px;height:10px;background:#8FA3AD;clip-path:polygon(50% 0,100% 100%,0 100%);opacity:0.8;"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 10],
});

function getFireIcon(ev: FireEvent) {
  switch (ev.status) {
    case 'Active': return fireIcon;
    case 'Contained': return containedIcon;
    case 'Monitored': return monitoredIcon;
    case 'Controlled': return controlledIcon;
  }
}

interface MapViewProps {
  layers?: MapLayers;
  center?: [number, number];
  zoom?: number;
  selectedEventId?: string | null;
  onSelectEvent?: (id: string) => void;
  height?: string;
  showLegend?: boolean;
  className?: string;
}

const CARTO_DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function MapView({
  layers = defaultLayers,
  center = [39.5, -115],
  zoom = 5,
  selectedEventId,
  onSelectEvent,
  height = '100%',
  showLegend = true,
  className = '',
}: MapViewProps) {
  const fireEvents = useMemo(() => allFireEvents, []);
  const riskZones = useMemo(() => allRiskZones, []);
  const settlements = useMemo(() => allSettlements, []);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url={CARTO_DARK_URL}
          attribution={CARTO_ATTR}
        />

        {layers.activeFires && fireEvents.map((ev) => (
          <Marker
            key={ev.id}
            position={[ev.lat, ev.lng]}
            icon={getFireIcon(ev)}
            eventHandlers={{
              click: () => onSelectEvent?.(ev.id),
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold" style={{ color: STATUS_COLORS[ev.status] }}>
                  {ev.name}
                </div>
                <div className="text-fog text-xs mt-1">{ev.location}</div>
                <div className="mt-2 space-y-0.5 text-xs">
                  <div>Source: <span className="font-mono">{ev.source}</span></div>
                  <div>Confidence: <span className="font-mono">{ev.confidence}%</span></div>
                  <div>Risk: <span style={{ color: RISK_COLORS[ev.riskLevel] }}>{ev.riskScore}/100</span></div>
                  <div>Status: {ev.status}</div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {layers.riskZones && riskZones.map((zone) => (
          <CircleMarker
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={18}
            pathOptions={{
              color: RISK_COLORS[zone.riskLevel],
              fillColor: RISK_COLORS[zone.riskLevel],
              fillOpacity: 0.1,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{zone.name}</div>
                <div className="text-xs mt-1">
                  Risk: <span style={{ color: RISK_COLORS[zone.riskLevel] }}>{zone.riskScore}/100</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {layers.settlements && settlements.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={settlementIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{s.name}</div>
                <div className="text-fog text-xs">Pop: {s.population.toLocaleString()}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {layers.roads && (
          <Polyline
            positions={[
              [34.0, -118.2],
              [36.0, -118.5],
              [38.5, -120.5],
              [40.0, -122.0],
            ]}
            pathOptions={{ color: '#8FA3AD', weight: 1, opacity: 0.4, dashArray: '4 6' }}
          />
        )}

        {layers.emergencyInfra && (
          <>
            <CircleMarker center={[34.1, -117.5]} radius={6} pathOptions={{ color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.3 }} >
              <Popup>Fire Station — Riverside</Popup>
            </CircleMarker>
            <CircleMarker center={[38.7, -120.3]} radius={6} pathOptions={{ color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.3 }} >
              <Popup>Fire Station — Plumas</Popup>
            </CircleMarker>
            <CircleMarker center={[44.0, -121.2]} radius={6} pathOptions={{ color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.3 }} >
              <Popup>Fire Station — Bend</Popup>
            </CircleMarker>
          </>
        )}
      </MapContainer>

      {showLegend && <MapLegend />}

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[500] text-[10px] font-mono text-fog bg-void/80 px-3 py-1 rounded-full border border-panel-line">
        DEMO DATA — Not live satellite feed
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="absolute top-3 right-3 z-[500] panel p-3 text-xs space-y-2 max-w-[180px]">
      <div className="text-fog uppercase tracking-wider text-[10px] font-semibold mb-1">Legend</div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: '#FF3B30', boxShadow: '0 0 4px #FF3B30' }} />
        <span className="text-paper">Active fire</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: '#FFB020', boxShadow: '0 0 4px #FFB020' }} />
        <span className="text-paper">Contained</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: '#00F5FF', boxShadow: '0 0 4px #00F5FF' }} />
        <span className="text-paper">Monitored</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: '#00FF88' }} />
        <span className="text-paper">Controlled</span>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-panel-line">
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-l-transparent border-r-transparent" style={{ borderBottomColor: '#8FA3AD' }} />
        <span className="text-paper">Settlement</span>
      </div>
    </div>
  );
}
