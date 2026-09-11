import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  Tooltip,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useMemo } from 'react';
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

const settlementIcon = L.divIcon({
  className: 'settlement-marker',
  html: '<div style="width:10px;height:10px;background:#8FA3AD;clip-path:polygon(50% 0,100% 100%,0 100%);opacity:0.8;"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 10],
});

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
 * Controller to handle camera view modes, auto-fit, and tile resize invalidation
 */
function MapController({
  events,
  selectedEventId,
  viewMode,
}: {
  events: FireEvent[];
  selectedEventId?: string | null;
  viewMode: 'india' | 'hotspots';
}) {
  const map = useMap();

  // Fix tile rendering and sizing across mounts and resizes
  useEffect(() => {
    map.invalidateSize();
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  // Pan smoothly to selected event if clicked from the list
  useEffect(() => {
    if (selectedEventId) {
      const target = events.find((e) => e.id === selectedEventId);
      if (target) {
        map.flyTo([target.lat, target.lng], 8, { duration: 1.2 });
      }
    }
  }, [selectedEventId, events, map]);

  // Handle India whole view vs Zoom Hotspots mode
  useEffect(() => {
    if (selectedEventId) return;

    if (viewMode === 'india' || !events || events.length === 0) {
      map.setView([22.8, 80.0], 5);
      map.invalidateSize();
      return;
    }

    // Fit to live detected Indian hotspots
    const valid = events.filter((e) => e.lat >= 6 && e.lat <= 38 && e.lng >= 68 && e.lng <= 98);
    if (valid.length > 0) {
      const lats = valid.map((e) => e.lat);
      const lngs = valid.map((e) => e.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const latPad = Math.max(1.2, (maxLat - minLat) * 0.25);
      const lngPad = Math.max(1.2, (maxLng - minLng) * 0.25);

      map.fitBounds(
        [
          [Math.max(6.0, minLat - latPad), Math.max(68.0, minLng - lngPad)],
          [Math.min(37.5, maxLat + latPad), Math.min(98.0, maxLng + lngPad)],
        ],
        { padding: [40, 40], maxZoom: 7 }
      );
    }
  }, [viewMode, events, map, selectedEventId]);

  return null;
}

export function MapView({
  layers = defaultLayers,
  center = [22.8, 80.0],
  zoom = 5,
  selectedEventId,
  onSelectEvent,
  height = '100%',
  showLegend = true,
  className = '',
  events,
}: MapViewProps) {
  const [basemap, setBasemap] = useState<'dark' | 'satellite'>('dark');
  const [viewMode, setViewMode] = useState<'india' | 'hotspots'>('india');
  const fireEvents = useMemo(() => events || allFireEvents, [events]);
  const riskZones = useMemo(() => allRiskZones, []);
  const settlements = useMemo(() => allSettlements, []);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Top Controls Bar: Basemap & Camera View */}
      <div className="absolute top-3 left-14 z-[500] flex flex-wrap items-center gap-2">
        {/* Basemap Switcher */}
        <div className="flex items-center bg-void/90 p-0.5 rounded-lg border border-panel-line text-xs shadow-lg">
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

        {/* Camera View Switcher */}
        <div className="flex items-center bg-void/90 p-0.5 rounded-lg border border-panel-line text-xs shadow-lg">
          <button
            type="button"
            onClick={() => setViewMode('india')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'india' ? 'bg-cyan/20 text-cyan font-medium' : 'text-fog hover:text-paper'
            }`}
          >
            View India
          </button>
          <button
            type="button"
            onClick={() => setViewMode('hotspots')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'hotspots' ? 'bg-cyan/20 text-cyan font-medium' : 'text-fog hover:text-paper'
            }`}
          >
            Focus Hotspots
          </button>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <MapController
          events={fireEvents}
          selectedEventId={selectedEventId}
          viewMode={viewMode}
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

        {/* Hotspot Outer Thermal Aura */}
        {layers.activeFires && fireEvents.map((ev) => {
          const s = (ev.status || '').toLowerCase();
          const color = s === 'active' ? '#FF3B30' : (s === 'contained' ? '#FFB020' : '#00F5FF');
          return (
            <CircleMarker
              key={`aura-${ev.id}`}
              center={[ev.lat, ev.lng]}
              radius={s === 'active' ? 14 : 10}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.22,
                weight: 1,
              }}
            />
          );
        })}

        {/* Hotspot Core Glowing Markers with Tooltips & Popups */}
        {layers.activeFires && fireEvents.map((ev) => {
          const isSelected = selectedEventId === ev.id;
          const s = (ev.status || '').toLowerCase();
          const color = s === 'active' ? '#FF3B30' : (s === 'contained' ? '#FFB020' : '#00F5FF');
          const radius = isSelected ? 9 : (s === 'active' ? 7 : 6);

          return (
            <CircleMarker
              key={ev.id}
              center={[ev.lat, ev.lng]}
              radius={radius}
              pathOptions={{
                color: isSelected ? '#FFFFFF' : color,
                fillColor: color,
                fillOpacity: 0.92,
                weight: isSelected ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onSelectEvent?.(ev.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div className="text-xs font-semibold">{ev.name}</div>
                <div className="text-[10px] text-fog">{ev.location}</div>
                <div className="text-[10px] font-mono text-cyan">
                  Risk: {ev.riskScore}/100 • {ev.status}
                </div>
              </Tooltip>
              <Popup>
                <div className="text-sm p-1 min-w-[200px]">
                  <div className="font-semibold text-base" style={{ color: STATUS_COLORS[ev.status] || color }}>
                    {ev.name}
                  </div>
                  <div className="text-fog text-xs mt-0.5">{ev.location}</div>
                  <div className="mt-2 space-y-1 text-xs border-t border-panel-line pt-2">
                    <div>Coordinates: <span className="font-mono text-cyan">{ev.lat.toFixed(4)}°N, {ev.lng.toFixed(4)}°E</span></div>
                    <div>Source: <span className="font-mono">{ev.source}</span></div>
                    <div>Confidence: <span className="font-mono">{ev.confidence}%</span></div>
                    <div>Risk Score: <span className="font-bold" style={{ color: RISK_COLORS[ev.riskLevel] }}>{ev.riskScore}/100</span></div>
                    <div>Status: <span className="font-semibold">{ev.status}</span></div>
                    {ev.sosStatus && (
                      <div>SOS Safety State: <span className="font-mono text-cyan">{ev.sosStatus}</span></div>
                    )}
                    {ev.frp !== undefined && (
                      <div>Radiative Power: <span className="font-mono">{ev.frp} MW</span></div>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

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
