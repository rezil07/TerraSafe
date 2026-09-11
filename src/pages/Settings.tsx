import { useState } from 'react';
import { PageHeader } from '@/components/ui';
import { RefreshCw, Bell, Sliders, User } from 'lucide-react';

export function Settings() {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDemo, setShowDemo] = useState(true);
  const [minConfidence, setMinConfidence] = useState(60);
  const [refreshInterval, setRefreshInterval] = useState('30s');
  const [profile, setProfile] = useState({ name: 'Operations Command', org: 'TERRASAFE', email: 'ops@terrasafe.io' });

  const handleReset = () => {
    setAlertsEnabled(true);
    setHighRiskOnly(false);
    setAutoRefresh(true);
    setShowDemo(true);
    setMinConfidence(60);
    setRefreshInterval('30s');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Settings" subtitle="Configure alerts, data display, and account" />

      {/* Account/Profile — REQUIRED */}
      <div className="panel panel-glow p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-cyan" />
          <h2 className="text-sm font-semibold text-paper">Account / Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-fog uppercase tracking-wider block mb-1.5">Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full bg-void border border-panel-line rounded-lg px-3 py-2 text-sm text-paper focus:outline-none focus:border-cyan/40"
            />
          </div>
          <div>
            <label className="text-xs text-fog uppercase tracking-wider block mb-1.5">Organization</label>
            <input
              type="text"
              value={profile.org}
              onChange={(e) => setProfile({ ...profile, org: e.target.value })}
              className="w-full bg-void border border-panel-line rounded-lg px-3 py-2 text-sm text-paper focus:outline-none focus:border-cyan/40"
            />
          </div>
          <div>
            <label className="text-xs text-fog uppercase tracking-wider block mb-1.5">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full bg-void border border-panel-line rounded-lg px-3 py-2 text-sm text-paper focus:outline-none focus:border-cyan/40"
            />
          </div>
        </div>
      </div>

      {/* Alerts & Notifications */}
      <div className="panel panel-glow p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-cyan" />
          <h2 className="text-sm font-semibold text-paper">Alerts & Notifications</h2>
        </div>
        <div className="space-y-4">
          <ToggleRow
            label="Enable alerts"
            description="Receive notifications for fire events and risk changes"
            checked={alertsEnabled}
            onChange={setAlertsEnabled}
          />
          <ToggleRow
            label="High-risk alerts only"
            description="Only notify for high and critical severity events"
            checked={highRiskOnly}
            onChange={setHighRiskOnly}
          />
        </div>
      </div>

      {/* Map & Data Display */}
      <div className="panel panel-glow p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-cyan" />
          <h2 className="text-sm font-semibold text-paper">Map & Data Display</h2>
        </div>
        <div className="space-y-4">
          <ToggleRow
            label="Auto-refresh map data"
            description="Automatically update map markers at the set interval"
            checked={autoRefresh}
            onChange={setAutoRefresh}
          />
          <ToggleRow
            label="Show demo data indicator"
            description="Display the DEMO DATA banner on the map"
            checked={showDemo}
            onChange={setShowDemo}
          />

          <div className="pt-2">
            <label className="text-sm text-paper block mb-2">Minimum confidence threshold</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="flex-1 accent-cyan"
              />
              <span className="text-sm font-mono text-cyan w-12 text-right">{minConfidence}%</span>
            </div>
          </div>

          <div className="pt-2">
            <label className="text-sm text-paper block mb-2">Data refresh interval</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              className="bg-void border border-panel-line rounded-lg px-3 py-2 text-sm text-paper focus:outline-none focus:border-cyan/40"
            >
              <option value="10s">10 seconds</option>
              <option value="30s">30 seconds</option>
              <option value="1m">1 minute</option>
              <option value="5m">5 minutes</option>
              <option value="manual">Manual only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reset to defaults — REQUIRED */}
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-panel-line text-sm text-fog hover:text-paper hover:border-cyan/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm text-paper">{label}</div>
        <div className="text-xs text-fog mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-cyan/30' : 'bg-white/10'}`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${
            checked ? 'translate-x-5 bg-cyan' : 'translate-x-0.5 bg-fog'
          }`}
          style={{ boxShadow: checked ? '0 0 8px rgba(0,245,255,0.4)' : 'none' }}
        />
      </button>
    </div>
  );
}
