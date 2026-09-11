import { useState, useEffect } from 'react';
import { StatCard, SectionTitle, RiskBadge } from '@/components/ui';
import { MapView } from '@/components/MapView';
import { Database, CloudSun, Activity, Gauge, Siren, BarChart3 } from 'lucide-react';
import {
  fireEvents as defaultFires,
  activeAlerts as defaultAlerts,
} from '@/data/mockData';
import { RISK_COLORS, type PageId } from '@/types';
import { ChevronRight } from 'lucide-react';
import { fetchDashboard, type DashboardData } from '@/services/api';

interface DashboardProps {
  onNavigate: (page: PageId) => void;
}

const pipelineSteps: { id: PageId; label: string; icon: React.ReactNode }[] = [
  { id: 'data-sources', label: 'Satellite', icon: <Database className="w-4 h-4" /> },
  { id: 'weather', label: 'Weather', icon: <CloudSun className="w-4 h-4" /> },
  { id: 'data-sources', label: 'Land Cover', icon: <Activity className="w-4 h-4" /> },
  { id: 'data-sources', label: 'Historical', icon: <Activity className="w-4 h-4" /> },
  { id: 'risk-analysis', label: 'AI Risk Engine', icon: <Gauge className="w-4 h-4" /> },
  { id: 'emergency-response', label: 'Response', icon: <Siren className="w-4 h-4" /> },
];

export function Dashboard({ onNavigate }: DashboardProps) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboard().then(setDashboard);
  }, []);

  const fireEventsList = dashboard ? dashboard.fireEvents : defaultFires;
  const activeAlertsList = dashboard ? dashboard.activeAlerts : defaultAlerts;
  const activeCount = dashboard ? dashboard.activeCount : fireEventsList.filter((e) => e.status === 'Active').length;
  const highRiskZones = dashboard ? dashboard.highRiskZones : fireEventsList.filter((e) => e.riskLevel === 'high' || e.riskLevel === 'critical').length;
  const avgRisk = dashboard ? dashboard.avgRisk : Math.round(fireEventsList.reduce((s, e) => s + e.riskScore, 0) / fireEventsList.length);
  const alertCount = activeAlertsList.length;
  const lastUpdated = dashboard ? dashboard.lastUpdated : '2026-09-11 04:30 UTC';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-paper tracking-tight">Dashboard</h1>
          <p className="text-fog text-sm mt-1">Real-time overview of Indian wildfire intelligence & AI early-warning</p>
        </div>
        <div className="text-xs font-mono text-fog">
          Last updated: {lastUpdated}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Fire Events" value={activeCount} delta="3" deltaPositive icon={<Activity className="w-4 h-4" />} valueColor="#FF3B30" />
        <StatCard label="High-Risk Zones" value={highRiskZones} delta="2" deltaPositive icon={<Gauge className="w-4 h-4" />} valueColor="#FF6A3D" />
        <StatCard label="Average Risk Score" value={avgRisk} delta="4%" deltaPositive={false} icon={<BarChart3 className="w-4 h-4" />} valueColor="#FFB020" />
        <StatCard label="Areas Under Alert" value={alertCount} delta="1" deltaPositive icon={<Siren className="w-4 h-4" />} valueColor="#00F5FF" />
      </div>

      {/* Intelligence Pipeline */}
      <div className="panel panel-glow p-5">
        <SectionTitle title="Intelligence Pipeline" subtitle="Data flow from source to response" />
        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-2">
          {pipelineSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <button
                onClick={() => onNavigate(step.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-panel-line bg-void hover:border-cyan/30 hover:bg-cyan/5 transition-all group"
              >
                <span className="text-cyan/70 group-hover:text-cyan transition-colors">{step.icon}</span>
                <span className="text-xs font-medium text-paper whitespace-nowrap">{step.label}</span>
              </button>
              {i < pipelineSteps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-fog flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Map + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 panel panel-glow p-5">
          <SectionTitle
            title="Map Overview"
            subtitle="Active fire events and risk zones"
            action={
              <button
                onClick={() => onNavigate('live-map')}
                className="text-xs text-cyan hover:underline flex items-center gap-1"
              >
                View full map <ChevronRight className="w-3 h-3" />
              </button>
            }
          />
          <div className="h-[500px] rounded-lg overflow-hidden border border-panel-line">
            <MapView height="100%" showLegend={false} events={fireEventsList} />
          </div>
        </div>

        <div className="panel panel-glow p-5 flex flex-col">
          <SectionTitle title="Active Alerts" subtitle={`${activeAlertsList.length} active`} />
          <div className="space-y-3 max-h-[500px] flex-1 overflow-y-auto pr-1">
            {activeAlertsList.map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-lg border border-panel-line bg-void/50 hover:border-cyan/20 transition-colors cursor-pointer"
                onClick={() => onNavigate('fire-events')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-paper truncate">{alert.title}</p>
                    <p className="text-xs text-fog mt-0.5">{alert.region}</p>
                  </div>
                  <RiskBadge level={alert.severity} size="sm" />
                </div>
                <p className="text-xs text-fog/80 mt-2 line-clamp-2">{alert.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-mono text-fog/60">{alert.time}</span>
                  {alert.sosStatus && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan/10 border border-cyan/30 text-cyan">
                      {alert.sosStatus}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indian Region Status */}
      <div className="panel panel-glow p-5">
        <SectionTitle title="Region Status" subtitle="Current fire activity by monitored Indian region" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(dashboard?.regions || [
            { region: 'Western Himalayas (UK & HP)', count: 3, status: 'active' as const },
            { region: 'Eastern Highlands (Simlipal)', count: 2, status: 'active' as const },
            { region: 'Central Forests (MP & Bastar)', count: 2, status: 'active' as const },
          ]).map((r) => (
            <div key={r.region} className="p-4 rounded-lg border border-panel-line bg-void/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-paper">{r.region}</span>
                {r.status === 'active' ? (
                  <span className="text-xs font-mono" style={{ color: RISK_COLORS.high }}>{r.count} active</span>
                ) : (
                  <span className="text-xs font-mono text-cyan">All clear</span>
                )}
              </div>
              {r.count === 0 ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="w-2 h-2 rounded-full bg-cyan pulse-dot" />
                  <span className="text-xs text-fog">No active fires in this region</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 pulse-dot" />
                  <span className="text-xs text-fog">{r.count} fire events being monitored</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
