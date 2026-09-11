import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
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

// Marker icons
const fireIcon = L.divIcon({
  className: 'fire-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#FF3B30;box-shadow:0 0 10px #FF3B30,0 0 5px #FF6A3D;border:2px solid rgba(255,255,255,0.7);animation:pulse-dot 2s infinite;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const containedIcon = L.divIcon({
  className: 'fire-marker',
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#FFB020;box-shadow:0 0 8px #FFB020;border:1.5px solid rgba(255,255,255,0.5);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const monitoredIcon = L.divIcon({
  className: 'fire-marker',
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#00F5FF;box-shadow:0 0 8px #00F5FF;border:1.5px solid rgba(255,255,255,0.5);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const controlledIcon = L.divIcon({
  className: 'fire-marker',
  html: '<div style="width:10px;height:10px;border-radius:50%;background:#00FF88;box-shadow:0 0 6px #00FF88;border:1.5px solid rgba(255,255,255,0.3);"></div>',
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
  const s = (ev.status || '').toLowerCase();
  if (s === 'active') return fireIcon;
  if (s === 'contained') return containedIcon;
  if (s === 'controlled') return controlledIcon;
  return monitoredIcon;
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
  events?: FireEvent[];
}

// 100% free, high-performance Esri Basemaps (No API key, No watermarks)
const ESRI_DARK_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_DARK_REF_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const ESRI_SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTR = '&copy; <a href="https://www.esri.com">Esri</a> &mdash; Earthstar Geographics';

/**
 * Controller to handle dynamic bounds fitting and resize invalidation
 */
function MapController({
  center,
  zoom,
  events,
  selectedEventId,
}: {
  center: [number, number];
  zoom: number;
  events: FireEvent[];
  selectedEventId?: string | null;
}) {
  const map = useMap();

  // Fix partial square tile bug when rendering inside flex/grid tabs
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  // Pan to selected event if clicked
  useEffect(() => {
    if (selectedEventId) {
      const target = events.find((e) => e.id === selectedEventId);
      if (target) {
        map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 7), { duration: 1.0 });
      }
    }
  }, [selectedEventId, events, map]);

  // Auto-fit bounds to actual active detections across India
  useEffect(() => {
    if (!events || events.length === 0) {
      map.setView(center, zoom);
      return;
    }
    const valid = events.filter((e) => e.lat >= 6 && e.lat <= 38 && e.lng >= 68 && e.lng <= 98);
    if (valid.length > 0) {
      const lats = valid.map((e) => e.lat);
      const lngs = valid.map((e) => e.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const latPad = Math.max(1.0, (maxLat - minLat) * 0.2);
      const lngPad = Math.max(1.0, (maxLng - minLng) * 0.2);

      map.fitBounds(
        [
          [Math.max(6.0, minLat - latPad), Math.max(68.0, minLng - lngPad)],
          [Math.min(37.5, maxLat + latPad), Math.min(98.0, maxLng + lngPad)],
        ],
        { padding: [35, 35], maxZoom: 8 }
      );
    }
  }, [events, map, center, zoom]);

  return null;
}

export function MapView({
  layers = defaultLayers,
  center = [22.5, 79.0],
  zoom = 5,
  selectedEventId,
  onSelectEvent,
  height = '100%',
  showLegend = true,
  className = '',
  events,
}: MapViewProps) {
  const [basemap, setBasemap] = useState<'dark' | 'satellite'>('dark');
  const fireEvents = useMemo(() => events || allFireEvents, [events]);
  const riskZones = useMemo(() => allRiskZones, []);
  const settlements = useMemo(() => allSettlements, []);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Basemap Switcher Pill */}
      <div className="absolute top-3 left-14 z-[500] flex items-center bg-void/90 p-1 rounded-lg border border-panel-line text-xs shadow-lg">
        <button
          type="button"
          onClick={() => setBasemap('dark')}
          className={`px-2.5 py-1 rounded transition-colors ${
            basemap === 'dark' ? 'bg-cyan/20 text-cyan font-medium' : 'text-fog hover:text-paper'
          }`}
        >
          Tactical Dark
        </button>
        <button
          type="button"
          onClick={() => setBasemap('satellite')}
          className={`px-2.5 py-1 rounded transition-colors ${
            basemap === 'satellite' ? 'bg-cyan/20 text-cyan font-medium' : 'text-fog hover:text-paper'
          }`}
        >
          Satellite
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <MapController
          center={center}
          zoom={zoom}
          events={fireEvents}
          selectedEventId={selectedEventId}
        />

        {basemap === 'dark' ? (
          <>
            <TileLayer
              url={ESRI_DARK_URL}
              attribution={ESRI_ATTR}
              maxZoom={16}
            />
            <TileLayer
              url={ESRI_DARK_REF_URL}
              maxZoom={16}
            />
          </>
        ) : (
          <TileLayer
            url={ESRI_SATELLITE_URL}
            attribution={ESRI_ATTR}
            maxZoom={18}
          />
        )}

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
          <>
            <Polyline
              positions={[
                [28.61, 77.20],
                [30.31, 78.03],
                [29.38, 79.46],
              ]}
              pathOptions={{ color: '#00F5FF', weight: 1.5, opacity: 0.5, dashArray: '4 6' }}
            />
            <Polyline
              positions={[
                [20.29, 85.82],
                [21.85, 86.34],
                [21.93, 86.72],
              ]}
              pathOptions={{ color: '#00F5FF', weight: 1.5, opacity: 0.5, dashArray: '4 6' }}
            />
          </>
        )}

        {layers.emergencyInfra && (
          <>
            <CircleMarker center={[29.39, 79.45]} radius={6} pathOptions={{ color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.3 }} >
              <Popup>Uttarakhand Forest Fire Post — Nainital</Popup>
            </CircleMarker>
            <CircleMarker center={[21.93, 86.72]} radius={6} pathOptions={{ color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.3 }} >
              <Popup>Odisha Forest Response Division — Baripada</Popup>
            </CircleMarker>
            <CircleMarker center={[22.46, 78.43]} radius={6} pathOptions={{ color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.3 }} >
              <Popup>MP Forest Quick Response — Pachmarhi</Popup>
            </CircleMarker>
            <CircleMarker center={[30.31, 78.03]} radius={6} pathOptions={{ color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.3 }} >
              <Popup>SDRF Headquarters — Dehradun</Popup>
            </CircleMarker>
          </>
        )}
      </MapContainer>

      {showLegend && <MapLegend />}

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[500] text-[10px] font-mono text-fog bg-void/80 px-3 py-1 rounded-full border border-panel-line">
        INDIA INTELLIGENCE — NASA FIRMS & Random Forest Scored
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
