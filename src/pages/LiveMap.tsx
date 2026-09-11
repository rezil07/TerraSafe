import { useState } from 'react';
import { MapView, getDefaultLayers, type MapLayers } from '@/components/MapView';
import { RiskBadge, StatusBadge, ConfidenceBar } from '@/components/ui';
import { fireEvents } from '@/data/mockData';
import { RISK_COLORS, type RiskLevel } from '@/types';
import { Sliders, ChevronDown, ChevronUp } from 'lucide-react';

export function LiveMap() {
  const [layers, setLayers] = useState<MapLayers>(getDefaultLayers());
  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [source, setSource] = useState('all');
  const [minConfidence, setMinConfidence] = useState(50);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');

  const layerLabels: { key: keyof MapLayers; label: string }[] = [
    { key: 'activeFires', label: 'Active Fires' },
    { key: 'riskZones', label: 'Risk Zones' },
    { key: 'settlements', label: 'Settlements' },
    { key: 'roads', label: 'Roads' },
    { key: 'forestCover', label: 'Forest/Land Cover' },
    { key: 'weather', label: 'Weather' },
    { key: 'emergencyInfra', label: 'Emergency Infrastructure' },
  ];

  const filteredEvents = fireEvents.filter((e) => {
    if (e.confidence < minConfidence) return false;
    if (source !== 'all' && e.source !== source) return false;
    if (riskFilter !== 'all' && e.riskLevel !== riskFilter) return false;
    return true;
  });

  const selectedEvent = fireEvents.find((e) => e.id === selectedId);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-paper tracking-tight">Live Map</h1>
        <p className="text-fog text-sm mt-1">Real-time fire event map with multi-layer overlays</p>
      </div>

      {/* Filters bar */}
      <div className="panel p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-fog uppercase tracking-wider">Time</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-void border border-panel-line rounded-lg px-3 py-1.5 text-xs text-paper focus:outline-none focus:border-cyan/40"
          >
            <option value="6h">6 hours</option>
            <option value="24h">24 hours</option>
            <option value="48h">48 hours</option>
            <option value="7d">7 days</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-fog uppercase tracking-wider">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-void border border-panel-line rounded-lg px-3 py-1.5 text-xs text-paper focus:outline-none focus:border-cyan/40"
          >
            <option value="all">All sources</option>
            <option value="NASA FIRMS">NASA FIRMS</option>
            <option value="MODIS">MODIS</option>
            <option value="VIIRS">VIIRS</option>
            <option value="GOES">GOES</option>
            <option value="Ground Report">Ground Report</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-fog uppercase tracking-wider">Min. Confidence</label>
          <input
            type="range"
            min="0"
            max="100"
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-24 accent-cyan"
          />
          <span className="text-xs font-mono text-cyan">{minConfidence}%</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-fog uppercase tracking-wider">Risk</label>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}
            className="bg-void border border-panel-line rounded-lg px-3 py-1.5 text-xs text-paper focus:outline-none focus:border-cyan/40"
          >
            <option value="all">All levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <button
          onClick={() => setLayersOpen(!layersOpen)}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border border-panel-line hover:border-cyan/30 text-xs text-paper transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan" />
          Map Layers
          {layersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 panel panel-glow p-1 relative">
          <div className="h-[500px] rounded-lg overflow-hidden">
            <MapView
              layers={layers}
              selectedEventId={selectedId}
              onSelectEvent={(id) => setSelectedId(id)}
              height="100%"
            />
          </div>

          {/* Layers panel — collapsible */}
          {layersOpen && (
            <div className="absolute top-3 left-3 z-[500] panel p-3 w-52 space-y-1.5">
              <div className="text-fog uppercase tracking-wider text-[10px] font-semibold mb-1">Map Layers</div>
              {layerLabels.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={layers[key]}
                    onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                    className="accent-cyan w-3.5 h-3.5"
                  />
                  <span className="text-xs text-paper group-hover:text-cyan transition-colors">{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Events list */}
        <div className="panel panel-glow p-4 flex flex-col" style={{ maxHeight: '500px' }}>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-paper">Fire Events</h2>
            <p className="text-xs text-fog mt-0.5">{filteredEvents.length} events on map</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setSelectedId(ev.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedId === ev.id
                    ? 'border-cyan/50 bg-cyan/5'
                    : 'border-panel-line bg-void/50 hover:border-cyan/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-paper truncate">{ev.name}</p>
                    <p className="text-xs text-fog mt-0.5 truncate">{ev.location}</p>
                  </div>
                  <RiskBadge level={ev.riskLevel} size="sm" />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <StatusBadge status={ev.status} />
                  <span className="text-[10px] font-mono text-fog">{ev.detectedRelative}</span>
                </div>
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <div className="text-center py-8 text-fog text-sm">No events match current filters</div>
            )}
          </div>

          {selectedEvent && (
            <div className="mt-3 pt-3 border-t border-panel-line">
              <div className="text-xs text-fog mb-2">Selected Event</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-fog">ID</span>
                  <span className="font-mono text-paper">{selectedEvent.id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-fog">Confidence</span>
                  <ConfidenceBar value={selectedEvent.confidence} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-fog">Risk Score</span>
                  <span className="font-mono" style={{ color: RISK_COLORS[selectedEvent.riskLevel] }}>
                    {selectedEvent.riskScore}/100
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-fog">Coordinates</span>
                  <span className="font-mono text-paper">
                    {selectedEvent.lat.toFixed(2)}, {selectedEvent.lng.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
