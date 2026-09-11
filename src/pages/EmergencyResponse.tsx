import { PageHeader, RiskBadge } from '@/components/ui';
import { fireEvents, currentWeather, responseUnits } from '@/data/mockData';
import { MapView } from '@/components/MapView';
import { AlertTriangle, Wind, Users, Clock, Compass, MapPin } from 'lucide-react';

export function EmergencyResponse() {
  const incident = fireEvents.find((e) => e.riskLevel === 'critical') || fireEvents[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Emergency Response" subtitle="Decision support for active fire incidents" />

      {/* Disclaimer banner — REQUIRED */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
        <p className="text-sm text-yellow-100">
          <span className="font-semibold">Decision Support</span> — not an automated dispatch system.
          This information supports human decision-making and should not replace official protocols.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident details */}
        <div className="panel panel-glow p-5">
          <h2 className="text-sm font-semibold text-paper mb-4">Incident Details</h2>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-fog uppercase tracking-wider mb-1">Incident</div>
              <div className="text-lg font-medium text-paper">{incident.name}</div>
              <div className="text-sm text-fog mt-0.5">{incident.id}</div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-cyan mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-fog uppercase tracking-wider">Incident Location</div>
                <div className="text-sm text-paper">{incident.location}</div>
                <div className="text-xs font-mono text-fog mt-0.5">
                  {incident.lat.toFixed(2)}, {incident.lng.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Wind className="w-4 h-4 text-cyan mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-fog uppercase tracking-wider">Wind → Spread Direction</div>
                <div className="text-sm text-paper">
                  Wind: {currentWeather.windDirectionLabel} at {currentWeather.windSpeed} km/h
                </div>
                <div className="text-sm text-paper mt-0.5">
                  Spread: <span style={{ color: 'var(--risk-high)' }}>Southeast</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-cyan mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-fog uppercase tracking-wider">Population at Risk</div>
                <div className="text-2xl font-mono font-bold text-paper">~12,400</div>
                <div className="text-xs text-fog mt-0.5">Within 10km radius</div>
              </div>
            </div>
          </div>
        </div>

        {/* Response priority */}
        <div className="panel panel-glow p-5">
          <h2 className="text-sm font-semibold text-paper mb-4">Response Priority</h2>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-fog uppercase tracking-wider mb-1">Recommended Priority & Safety Decision</div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-3xl font-bold font-mono" style={{ color: 'var(--risk-critical)' }}>
                  P1
                </div>
                <RiskBadge level="critical" />
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan/10 border border-cyan/30 text-cyan">
                  {incident.sosStatus || 'ESCALATION_INITIATED'}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-fog uppercase tracking-wider mb-1">
                <Clock className="w-3 h-3" /> Estimated Response Time
              </div>
              <div className="text-xl font-mono text-paper">25 minutes</div>
              <div className="text-xs text-fog mt-0.5">Nearest units dispatched</div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-fog uppercase tracking-wider mb-1">
                <Compass className="w-3 h-3" /> Containment Status
              </div>
              <div className="text-sm text-paper">{incident.status}</div>
              <div className="w-full h-2 rounded-full bg-white/10 mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '35%', backgroundColor: 'var(--risk-medium)' }} />
              </div>
              <div className="text-xs font-mono text-fog mt-1">35% contained · {incident.area} ha</div>
            </div>
          </div>
        </div>

        {/* Recommended response units */}
        <div className="panel panel-glow p-5">
          <h2 className="text-sm font-semibold text-paper mb-4">Recommended Response Units</h2>
          <div className="space-y-2">
            {responseUnits.map((unit) => (
              <div key={unit.type} className="flex items-center justify-between p-3 rounded-lg border border-panel-line bg-void/50">
                <div>
                  <div className="text-sm font-medium text-paper">{unit.type}</div>
                  <div className="text-xs text-fog">ETA: {unit.eta}</div>
                </div>
                <div className="text-2xl font-mono font-bold text-cyan">{unit.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="panel panel-glow p-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <h2 className="text-sm font-semibold text-paper">Incident Map</h2>
          <span className="text-xs font-mono text-fog">Fire location and spread direction</span>
        </div>
        <div className="h-[350px] rounded-lg overflow-hidden">
          <MapView
            center={[incident.lat, incident.lng]}
            zoom={8}
            height="100%"
            showLegend={false}
            events={[incident]}
          />
        </div>
      </div>
    </div>
  );
}
