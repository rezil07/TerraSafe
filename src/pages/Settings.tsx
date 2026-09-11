import React, { useState, useRef } from 'react';
import { PageHeader } from '@/components/ui';
import {
  Bell,
  Sliders,
  User as UserIcon,
  Upload,
  Trash2,
  Check,
  Save,
  RefreshCw,
  Camera,
  Satellite,
  Shield,
  Flame,
  Radio,
  Sparkles,
} from 'lucide-react';
import {
  useSettings,
  getInitials,
  compressAvatarImage,
  type UserProfile,
  type AppSettings,
} from '@/context/SettingsContext';

const AVATAR_PRESETS: { id: UserProfile['avatarPreset']; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'satellite', label: 'Satellite', icon: Satellite },
  { id: 'shield', label: 'Shield', icon: Shield },
  { id: 'flame', label: 'Firewatch', icon: Flame },
  { id: 'radio', label: 'Comms', icon: Radio },
  { id: 'user', label: 'Operator', icon: UserIcon },
];

export function Settings() {
  const {
    profile: globalProfile,
    settings: globalSettings,
    updateProfile,
    updateSettings,
    resetToDefaults,
  } = useSettings();

  // Local editable state
  const [localProfile, setLocalProfile] = useState<UserProfile>(globalProfile);
  const [localSettings, setLocalSettings] = useState<AppSettings>(globalSettings);

  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setSavedBanner(msg);
    setTimeout(() => {
      setSavedBanner(null);
    }, 3500);
  };

  const handleSaveProfile = (e?: React.FormEvent) => {
    e?.preventDefault();
    updateProfile(localProfile);
    showFeedback('Profile & Avatar saved successfully! Top-right command bar updated.');
  };

  const handleSaveSettings = () => {
    updateSettings(localSettings);
    showFeedback('Settings saved successfully! Applied across all monitoring pages.');
  };

  const handleSaveAll = () => {
    updateProfile(localProfile);
    updateSettings(localSettings);
    showFeedback('All changes saved successfully!');
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings and profile back to original system defaults?')) {
      resetToDefaults();
      // Reload defaults into local state
      setLocalProfile({
        name: 'Operations Command',
        org: 'TERRASAFE',
        email: 'ops@terrasafe.io',
        pfp: null,
        avatarPreset: null,
      });
      setLocalSettings({
        alertsEnabled: true,
        highRiskOnly: false,
        autoRefresh: true,
        showDemo: true,
        minConfidence: 60,
        refreshInterval: '30s',
      });
      showFeedback('Reset to default system configurations.');
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressAvatarImage(file, 160);
      const updated = { ...localProfile, pfp: compressedDataUrl, avatarPreset: null };
      setLocalProfile(updated);
      updateProfile(updated);
      showFeedback('Profile photo uploaded and saved! Check top-right corner.');
    } catch (err) {
      console.error('Failed to process avatar', err);
      alert('Could not process this image file. Please choose a standard PNG or JPG file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectPreset = (presetId: UserProfile['avatarPreset']) => {
    const updated = { ...localProfile, pfp: null, avatarPreset: presetId };
    setLocalProfile(updated);
    updateProfile(updated);
    showFeedback(`Selected ${presetId} badge as profile icon!`);
  };

  const handleRemovePhoto = () => {
    const updated = { ...localProfile, pfp: null, avatarPreset: null };
    setLocalProfile(updated);
    updateProfile(updated);
    showFeedback('Reverted to dynamic initials avatar.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Settings" subtitle="Configure profile, alert triggers, and telemetry display" />
        <button
          onClick={handleSaveAll}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-cyan text-void font-semibold text-sm hover:bg-cyan/90 transition-all shadow-[0_0_15px_rgba(0,245,255,0.4)] active:scale-95"
        >
          <Save className="w-4 h-4" />
          Save All Changes
        </button>
      </div>

      {/* Success Notification Banner */}
      {savedBanner && (
        <div className="p-4 rounded-xl border border-cyan/40 bg-cyan/10 flex items-center gap-3 text-sm text-cyan animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-6 h-6 rounded-full bg-cyan/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-cyan" />
          </div>
          <span className="font-medium">{savedBanner}</span>
        </div>
      )}

      {/* Account & Profile with PFP */}
      <div className="panel panel-glow p-5 sm:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-panel-line pb-3">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-cyan" />
            <h2 className="text-sm font-semibold text-paper">Account & Profile Details</h2>
          </div>
          <span className="text-[11px] text-fog font-mono uppercase tracking-wider">
            Live Command Center Identity
          </span>
        </div>

        {/* PFP (Profile Picture) Management */}
        <div className="bg-void/50 border border-panel-line rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center gap-5">
          {/* Avatar Preview */}
          <div className="relative group flex-shrink-0 mx-auto md:mx-0">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-cyan/60 shadow-[0_0_15px_rgba(0,245,255,0.3)] bg-void flex items-center justify-center">
              {localProfile.pfp ? (
                <img
                  src={localProfile.pfp}
                  alt={localProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : localProfile.avatarPreset === 'satellite' ? (
                <Satellite className="w-9 h-9 text-cyan" />
              ) : localProfile.avatarPreset === 'shield' ? (
                <Shield className="w-9 h-9 text-cyan" />
              ) : localProfile.avatarPreset === 'flame' ? (
                <Flame className="w-9 h-9 text-amber-400" />
              ) : localProfile.avatarPreset === 'radio' ? (
                <Radio className="w-9 h-9 text-cyan" />
              ) : localProfile.avatarPreset === 'user' ? (
                <UserIcon className="w-9 h-9 text-cyan" />
              ) : (
                <span className="text-2xl font-bold font-mono text-cyan tracking-wider">
                  {getInitials(localProfile.name)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-cyan text-void hover:bg-cyan/80 shadow-md transition-all active:scale-90"
              title="Upload new photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Avatar Actions & Presets */}
          <div className="flex-1 space-y-3 w-full">
            <div>
              <h3 className="text-sm font-medium text-paper">Profile Picture & Badge</h3>
              <p className="text-xs text-fog mt-0.5">
                Upload your custom photo or select an Earth Intelligence insignia. Changes appear in the top right corner.
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan/40 bg-cyan/10 hover:bg-cyan/20 text-xs font-medium text-cyan transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
              </button>

              {(localProfile.pfp || localProfile.avatarPreset) && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-panel-line hover:border-red-500/50 hover:bg-red-500/10 text-xs font-medium text-fog hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Use Initials
                </button>
              )}
            </div>

            {/* Presets Row */}
            <div className="pt-2 border-t border-panel-line/60">
              <span className="text-[11px] text-fog block mb-1.5">Or choose an insignia badge:</span>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = !localProfile.pfp && localProfile.avatarPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`
                        inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all
                        ${isSelected
                          ? 'bg-cyan/20 border border-cyan text-cyan shadow-[0_0_8px_rgba(0,245,255,0.3)]'
                          : 'bg-void border border-panel-line text-fog hover:text-paper hover:border-cyan/30'
                        }
                      `}
                    >
                      <Icon className="w-3 h-3" />
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Text Fields */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-fog uppercase tracking-wider block mb-1.5">
                Full Name / Role
              </label>
              <input
                type="text"
                value={localProfile.name}
                onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                placeholder="e.g. Operations Command"
                className="w-full bg-void border border-panel-line rounded-lg px-3.5 py-2 text-sm text-paper focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-fog uppercase tracking-wider block mb-1.5">
                Organization / Sector
              </label>
              <input
                type="text"
                value={localProfile.org}
                onChange={(e) => setLocalProfile({ ...localProfile, org: e.target.value })}
                placeholder="e.g. TERRASAFE"
                className="w-full bg-void border border-panel-line rounded-lg px-3.5 py-2 text-sm text-paper focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-fog uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={localProfile.email}
                onChange={(e) => setLocalProfile({ ...localProfile, email: e.target.value })}
                placeholder="e.g. ops@terrasafe.io"
                className="w-full bg-void border border-panel-line rounded-lg px-3.5 py-2 text-sm text-paper focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/30 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan/50 bg-cyan/15 hover:bg-cyan/25 text-cyan font-medium text-xs sm:text-sm transition-all shadow-[0_0_10px_rgba(0,245,255,0.2)] active:scale-95"
            >
              <Save className="w-4 h-4" />
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      {/* Alerts & Notifications */}
      <div className="panel panel-glow p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-panel-line pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan" />
            <h2 className="text-sm font-semibold text-paper">Alerts & Notifications</h2>
          </div>
          <span className="text-[11px] text-fog font-mono">EARLY WARNING TRIGGERS</span>
        </div>

        <div className="space-y-4">
          <ProperToggleRow
            label="Enable Early Warning Alerts"
            description="Broadcast real-time notifications for active fire incidents and wildfire risk spikes"
            checked={localSettings.alertsEnabled}
            onChange={(val) => setLocalSettings({ ...localSettings, alertsEnabled: val })}
          />
          <ProperToggleRow
            label="Critical & High-Risk Alerts Only"
            description="Filter out minor thermal anomalies and only notify for confirmed high or critical fire events"
            checked={localSettings.highRiskOnly}
            onChange={(val) => setLocalSettings({ ...localSettings, highRiskOnly: val })}
          />
        </div>
      </div>

      {/* Map & Data Display */}
      <div className="panel panel-glow p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-panel-line pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan" />
            <h2 className="text-sm font-semibold text-paper">Map & Telemetry Display</h2>
          </div>
          <span className="text-[11px] text-fog font-mono">SATELLITE & SENSOR FILTERS</span>
        </div>

        <div className="space-y-5">
          <ProperToggleRow
            label="Auto-refresh satellite hotspot data"
            description="Automatically synchronize active hotspots and FRP feeds with telemetry stream"
            checked={localSettings.autoRefresh}
            onChange={(val) => setLocalSettings({ ...localSettings, autoRefresh: val })}
          />
          <ProperToggleRow
            label="Show simulated test data indicator"
            description="Display the DEMO / SIMULATED banner when operating in offline fallback mode"
            checked={localSettings.showDemo}
            onChange={(val) => setLocalSettings({ ...localSettings, showDemo: val })}
          />

          <div className="pt-2 border-t border-panel-line/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-paper">Minimum Satellite Confidence Threshold</label>
              <span className="text-sm font-mono font-bold text-cyan bg-cyan/10 border border-cyan/30 px-2.5 py-0.5 rounded-full">
                {localSettings.minConfidence}%
              </span>
            </div>
            <p className="text-xs text-fog mb-3">
              Hotspots detected with confidence below this threshold will be hidden on satellite map layers.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={localSettings.minConfidence}
                onChange={(e) => setLocalSettings({ ...localSettings, minConfidence: Number(e.target.value) })}
                className="flex-1 h-2 bg-void border border-panel-line rounded-lg appearance-none cursor-pointer accent-cyan"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-panel-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-sm font-medium text-paper block">Data Refresh Interval</label>
              <span className="text-xs text-fog">Rate of polling for satellite FRP anomalies</span>
            </div>
            <select
              value={localSettings.refreshInterval}
              onChange={(e) => setLocalSettings({ ...localSettings, refreshInterval: e.target.value })}
              className="bg-void border border-panel-line rounded-lg px-3.5 py-2 text-sm text-paper focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/30"
            >
              <option value="10s">10 seconds (Live Fast)</option>
              <option value="30s">30 seconds (Recommended)</option>
              <option value="1m">1 minute</option>
              <option value="5m">5 minutes</option>
              <option value="manual">Manual Refresh Only</option>
            </select>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan/50 bg-cyan/15 hover:bg-cyan/25 text-cyan font-medium text-xs sm:text-sm transition-all shadow-[0_0_10px_rgba(0,245,255,0.2)] active:scale-95"
            >
              <Save className="w-4 h-4" />
              Save Display Settings
            </button>
          </div>
        </div>
      </div>

      {/* Footer Controls: Reset & Global Save */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-panel-line">
        <button
          type="button"
          onClick={handleReset}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-panel-line text-sm text-fog hover:text-paper hover:border-red-500/40 hover:bg-red-500/5 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reset All to Defaults
        </button>

        <button
          type="button"
          onClick={handleSaveAll}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-cyan text-void font-bold text-sm hover:bg-cyan/90 transition-all shadow-[0_0_15px_rgba(0,245,255,0.4)] active:scale-95"
        >
          <Check className="w-4 h-4" />
          Save All Settings & Profile
        </button>
      </div>
    </div>
  );
}

/**
 * High-precision, high-contrast toggle switch designed for mission-critical cyber UI
 */
function ProperToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-2 -mx-2 rounded-lg hover:bg-white/[0.02] transition-colors">
      <div className="flex-1 pr-2">
        <div className="text-sm font-medium text-paper">{label}</div>
        <div className="text-xs text-fog mt-0.5 leading-relaxed">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan/40
          ${checked
            ? 'bg-cyan/25 border-cyan shadow-[0_0_12px_rgba(0,245,255,0.3)]'
            : 'bg-void border-panel-line hover:border-fog/50'
          }
        `}
      >
        <span
          className={`
            pointer-events-none inline-flex items-center justify-center h-5 w-5 rounded-full
            transform transition-transform duration-200 ease-in-out my-auto
            ${checked
              ? 'translate-x-6 bg-cyan shadow-[0_0_8px_rgba(0,245,255,0.8)]'
              : 'translate-x-0.5 bg-fog/70'
            }
          `}
        >
          {checked && (
            <span className="w-1.5 h-1.5 rounded-full bg-void" />
          )}
        </span>
      </button>
    </div>
  );
}
