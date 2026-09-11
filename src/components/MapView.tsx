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

// 100% free, high-performance Esri Satellite Basemap (No API key, No watermarks)
const ESRI_SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTR = '&copy; <a href="https://www.esri.com">Esri</a> &mdash; Earthstar Geographics';

/**
 * Creates custom HTML hotspot markers that translate without SVG scaling distortion
 */
function getHotspotIcon(riskScore: number, isSelected: boolean) {
  const color = riskScore >= 70 ? '#FF3B30' : (riskScore >= 40 ? '#FF7A00' : '#FFD600');
  const size = isSelected ? 26 : (riskScore >= 70 ? 22 : (riskScore >= 40 ? 18 : 15));
  const core = isSelected ? 12 : (riskScore >= 70 ? 10 : (riskScore >= 40 ? 8 : 7));
  const shadow = isSelected ? `0 0 16px ${color}, 0 0 4px #FFFFFF` : `0 0 8px ${color}`;

  return L.divIcon({
    className: 'hotspot-vector-pin',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.35;box-shadow:0 0 10px ${color};"></div>
        <div style="width:${core}px;height:${core}px;border-radius:50%;background:${color};border:${isSelected ? '2px solid #FFFFFF' : '1.5px solid rgba(0,0,0,0.85)'};box-shadow:${shadow};position:relative;z-index:2;"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Controller to handle camera view modes, auto-fit, and tile resize invalidation
 */
function MapController({
  events,
  selectedEventId,
  viewMode,
  flyTarget,
}: {
  events: FireEvent[];
  selectedEventId?: string | null;
  viewMode: 'india' | 'hotspots';
  flyTarget?: { lat: number; lng: number; trigger: number } | null;
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

  // Pan and zoom smoothly to target coordinates with closest look (zoom 15)
  useEffect(() => {
    if (flyTarget) {
      map.flyTo([flyTarget.lat, flyTarget.lng], 15, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
      return;
    }
    if (selectedEventId) {
      const target = events.find((e) => e.id === selectedEventId);
      if (target) {
        map.flyTo([target.lat, target.lng], 15, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    }
  }, [flyTarget, selectedEventId, events, map]);

  // Handle India whole view vs Zoom Hotspots mode
  useEffect(() => {
    if (selectedEventId || flyTarget) return;

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
  }, [viewMode, events, map, selectedEventId, flyTarget]);

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
  const [viewMode, setViewMode] = useState<'india' | 'hotspots'>('india');
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [isHudOpen, setIsHudOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; trigger: number } | null>(null);

  const fireEvents = useMemo(() => events || allFireEvents, [events]);
  const riskZones = useMemo(() => allRiskZones, []);
  const settlements = useMemo(() => allSettlements, []);

  // Determine active selected ID (parent controlled or internal)
  const activeSelectedId = selectedEventId !== undefined ? selectedEventId : internalSelectedId;

  // Whenever parent prop changes to a valid event ID, open the HUD and fly to it
  useEffect(() => {
    if (selectedEventId) {
      setIsHudOpen(true);
      const ev = fireEvents.find((e) => e.id === selectedEventId);
      if (ev) {
        setFlyTarget({ lat: ev.lat, lng: ev.lng, trigger: Date.now() });
      }
    } else if (selectedEventId === '' || selectedEventId === null) {
      setIsHudOpen(false);
    }
  }, [selectedEventId, fireEvents]);

  const handleMarkerClick = (ev: FireEvent) => {
    setInternalSelectedId(ev.id);
    setIsHudOpen(true);
    setFlyTarget({ lat: ev.lat, lng: ev.lng, trigger: Date.now() });
    onSelectEvent?.(ev.id);
  };

  const handleCloseHud = () => {
    setIsHudOpen(false);
    setInternalSelectedId(null);
    onSelectEvent?.('');
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Top Controls Bar: Camera View Switcher */}
      <div className="absolute top-3 left-14 z-[500] flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-void/90 p-0.5 rounded-lg border border-panel-line text-xs shadow-lg">
          <button
            type="button"
            onClick={() => {
              setFlyTarget(null);
              setViewMode('india');
            }}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'india' ? 'bg-cyan/20 text-cyan font-medium' : 'text-fog hover:text-paper'
            }`}
          >
            View India
          </button>
          <button
            type="button"
            onClick={() => {
              setFlyTarget(null);
              setViewMode('hotspots');
            }}
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
        preferCanvas={true}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        wheelDebounceTime={40}
        wheelPxPerZoomLevel={90}
      >
        <MapController
          events={fireEvents}
          selectedEventId={activeSelectedId}
          viewMode={viewMode}
          flyTarget={flyTarget}
        />

        {/* Photorealistic High-Resolution Satellite Basemap */}
        <TileLayer
          url={ESRI_SATELLITE_URL}
          attribution={ESRI_ATTR}
          maxZoom={18}
          maxNativeZoom={18}
          keepBuffer={8}
          updateWhenZooming={false}
          updateWhenIdle={true}
        />

        {/* Hotspot Vector Markers (HTML DivIcon - Smooth translation without SVG zoom distortion) */}
        {layers.activeFires && fireEvents.map((ev) => {
          const isSelected = activeSelectedId === ev.id;
          const color = ev.riskScore >= 70 ? '#FF3B30' : (ev.riskScore >= 40 ? '#FF7A00' : '#FFD600');

          return (
            <Marker
              key={ev.id}
              position={[ev.lat, ev.lng]}
              icon={getHotspotIcon(ev.riskScore, isSelected)}
              eventHandlers={{
                click: () => handleMarkerClick(ev),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <div className="text-xs font-semibold text-paper">{ev.name}</div>
                <div className="text-[10px] text-fog">{ev.location}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color }}>
                  Risk: {ev.riskScore}/100 • {ev.riskScore >= 70 ? 'CRITICAL' : (ev.riskScore >= 40 ? 'MEDIUM' : 'WATCH')}
                </div>
              </Tooltip>
            </Marker>
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
            <Tooltip direction="top">
              <div className="text-xs font-semibold">{zone.name}</div>
              <div className="text-[10px] text-fog">Risk: {zone.riskScore}/100</div>
            </Tooltip>
          </CircleMarker>
        ))}

        {layers.settlements && settlements.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={settlementIcon}>
            <Tooltip direction="top">
              <div className="text-xs font-semibold">{s.name}</div>
              <div className="text-[10px] text-fog">Pop: {s.population.toLocaleString()}</div>
            </Tooltip>
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
              <Tooltip>Uttarakhand Forest Fire Post — Nainital</Tooltip>
            </CircleMarker>
            <CircleMarker center={[21.93, 86.72]} radius={6} pathOptions={{ color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.3 }} >
              <Tooltip>Odisha Forest Response Division — Baripada</Tooltip>
            </CircleMarker>
            <CircleMarker center={[22.46, 78.43]} radius={6} pathOptions={{ color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.3 }} >
              <Tooltip>MP Forest Quick Response — Pachmarhi</Tooltip>
            </CircleMarker>
            <CircleMarker center={[30.31, 78.03]} radius={6} pathOptions={{ color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.3 }} >
              <Tooltip>SDRF Headquarters — Dehradun</Tooltip>
            </CircleMarker>
          </>
        )}
      </MapContainer>

      {/* Non-intrusive Floating Telemetric HUD (responsive for mobile, tablet, and desktop) */}
      {isHudOpen && activeSelectedId && (() => {
        const selectedEvent = fireEvents.find((e) => e.id === activeSelectedId);
        if (!selectedEvent) return null;
        const color = selectedEvent.riskScore >= 70 ? '#FF3B30' : (selectedEvent.riskScore >= 40 ? '#FF7A00' : '#FFD600');
        const levelLabel = selectedEvent.riskScore >= 70 ? 'CRITICAL / CONFIRMED' : (selectedEvent.riskScore >= 40 ? 'MEDIUM RISK' : 'LOW / WATCH');

        return (
          <div className="absolute bottom-5 sm:bottom-8 left-2 sm:left-4 z-[500] panel p-2.5 sm:p-3 w-[calc(100%-1rem)] max-w-[360px] sm:w-80 bg-void/95 backdrop-blur-md border border-panel-line shadow-2xl rounded-xl transition-all">
            <div className="flex items-start justify-between gap-2 border-b border-panel-line pb-2 mb-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-semibold text-paper truncate">{selectedEvent.name}</div>
                <div className="text-[10px] sm:text-xs text-fog truncate">{selectedEvent.location}</div>
              </div>
              <button
                type="button"
                onClick={handleCloseHud}
                className="text-fog hover:text-paper text-xs px-1.5 py-0.5 rounded border border-panel-line hover:bg-panel transition-colors flex-shrink-0"
                title="Close Inspector"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
              <div className="bg-panel/70 p-1.5 sm:p-2 rounded-lg border border-panel-line">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-fog block">Wildfire Risk</span>
                <span className="font-bold text-sm sm:text-base block mt-0.5" style={{ color }}>
                  {selectedEvent.riskScore}/100
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono text-fog block truncate">{levelLabel}</span>
              </div>
              <div className="bg-panel/70 p-1.5 sm:p-2 rounded-lg border border-panel-line">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-fog block">Confidence</span>
                <span className="font-mono text-sm sm:text-base text-cyan block mt-0.5">{selectedEvent.confidence}%</span>
                <span className="text-[8px] sm:text-[9px] font-mono text-fog block truncate">Sensor: {selectedEvent.source}</span>
              </div>
              <div className="bg-panel/70 p-1.5 sm:p-2 rounded-lg border border-panel-line">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-fog block">GPS Coordinates</span>
                <span className="font-mono text-[10px] sm:text-xs text-paper block mt-0.5 leading-tight">
                  {selectedEvent.lat.toFixed(4)}° N<br />{selectedEvent.lng.toFixed(4)}° E
                </span>
              </div>
              <div className="bg-panel/70 p-1.5 sm:p-2 rounded-lg border border-panel-line">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-fog block">SOS State</span>
                <span className="font-mono text-[9px] sm:text-[10px] font-semibold text-cyan block mt-0.5 truncate">
                  {selectedEvent.sosStatus || 'MONITOR'}
                </span>
                {selectedEvent.frp !== undefined && (
                  <span className="text-[8px] sm:text-[9px] font-mono text-fog block mt-0.5 truncate">FRP: {selectedEvent.frp} MW</span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {showLegend && <MapLegend />}

      <div className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 z-[500] text-[10px] font-mono text-fog bg-void/80 px-3 py-1 rounded-full border border-panel-line pointer-events-none whitespace-nowrap">
        INDIA INTELLIGENCE — NASA FIRMS & Random Forest Scored
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="absolute top-12 sm:top-3 right-2 sm:right-3 z-[500] panel p-2.5 sm:p-3 text-xs space-y-1.5 sm:space-y-2 max-w-[190px] sm:max-w-[210px] bg-void/90 backdrop-blur border border-panel-line shadow-lg">
      <div className="text-fog uppercase tracking-wider text-[9px] sm:text-[10px] font-semibold mb-1">Wildfire Risk Tiers</div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ background: '#FF3B30', boxShadow: '0 0 6px #FF3B30' }} />
        <span className="text-paper text-[11px] sm:text-xs">High / Confirmed (70–100)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ background: '#FF7A00', boxShadow: '0 0 6px #FF7A00' }} />
        <span className="text-paper text-[11px] sm:text-xs">Medium Risk (40–69)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ background: '#FFD600', boxShadow: '0 0 6px #FFD600' }} />
        <span className="text-paper text-[11px] sm:text-xs">Low / Watch (0–39)</span>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-panel-line">
        <div className="w-0 h-0 border-l-[4px] sm:border-l-[5px] border-r-[4px] sm:border-r-[5px] border-b-[8px] sm:border-b-[10px] border-l-transparent border-r-transparent flex-shrink-0" style={{ borderBottomColor: '#8FA3AD' }} />
        <span className="text-paper text-[11px] sm:text-xs">Settlement / Station</span>
      </div>
    </div>
  );
}
