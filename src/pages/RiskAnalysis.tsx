import { useState } from 'react';
import { MapView } from '@/components/MapView';
import { RiskBadge, PageHeader } from '@/components/ui';
import { contributingFactors, currentWeather, fireEvents } from '@/data/mockData';
import { RISK_COLORS, RISK_LABELS, riskFromScore } from '@/types';
import { Wind, Droplets, Thermometer, Compass, Eye, CloudRain, Gauge as GaugeIcon } from 'lucide-react';

export function RiskAnalysis() {
  const [selected, setSelected] = useState(fireEvents[0]);

  const riskLevel = riskFromScore(selected.riskScore);
  const riskColor = RISK_COLORS[riskLevel];
  const confidence = 87;
  const modelVersion = 'v2.1.4';

  const envConditions = [
    { label: 'Temperature', value: `${currentWeather.temperature}°C`, icon: Thermometer },
    { label: 'Humidity', value: `${currentWeather.humidity}%`, icon: Droplets },
    { label: 'Wind Speed', value: `${currentWeather.windSpeed} km/h`, icon: Wind },
    { label: 'Wind Direction', value: `${currentWeather.windDirectionLabel} (${currentWeather.windDirection}°)`, icon: Compass },
    { label: 'Visibility', value: `${currentWeather.visibility} km`, icon: Eye },
    { label: 'Rainfall', value: `${currentWeather.rainfall} mm`, icon: CloudRain },
    { label: 'Pressure', value: `${currentWeather.pressure} hPa`, icon: GaugeIcon },
    { label: 'Dew Point', value: `${currentWeather.dewPoint}°C`, icon: Droplets },
  ];

  const gaugeRotation = (selected.riskScore / 100) * 180 - 90;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Risk Analysis" subtitle="Explainable risk factors and environmental conditions" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map with click-to-analyze */}
        <div className="lg:col-span-2 panel panel-glow p-3">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-sm font-semibold text-paper">Click a fire event to analyze</span>
            <span className="text-xs font-mono text-fog">Click-to-analyze enabled</span>
          </div>
          <div className="h-[400px] rounded-lg overflow-hidden">
            <MapView
              height="100%"
              showLegend={false}
              selectedEventId={selected.id}
              onSelectEvent={(id) => {
                const ev = fireEvents.find((e) => e.id === id);
                if (ev) setSelected(ev);
              }}
            />
          </div>
        </div>

        {/* Risk gauge */}
        <div className="panel panel-glow p-5 flex flex-col items-center">
          <h2 className="text-sm font-semibold text-paper self-start mb-4">Risk Assessment</h2>

          {/* Circular gauge */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(245,247,250,0.08)" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={riskColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(selected.riskScore / 100) * 264} 264`}
                style={{ filter: `drop-shadow(0 0 6px ${riskColor})`, transition: 'stroke-dasharray 0.6s ease' }}
              />
            </svg>
            <div className="text-center">
              <div className="text-4xl font-bold font-mono" style={{ color: riskColor }}>
                {selected.riskScore}
              </div>
              <div className="text-xs text-fog font-mono">/ 100</div>
            </div>
          </div>

          <div className="mt-3">
            <RiskBadge level={riskLevel} />
          </div>

          <div className="w-full mt-5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-fog">Model Confidence</span>
              <span className="font-mono text-cyan">{confidence}%</span>
            </div>
            <div className="w-full h-1 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan" style={{ width: `${confidence}%` }} />
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-fog">Model Version</span>
              <span className="font-mono text-paper">{modelVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fog">Selected Event</span>
              <span className="font-mono text-paper">{selected.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fog">Location</span>
              <span className="text-paper text-right truncate max-w-[140px]">{selected.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contributing Factors — REQUIRED */}
      <div className="panel panel-glow p-5">
        <h2 className="text-sm font-semibold text-paper mb-4">Contributing Factors</h2>
        <p className="text-xs text-fog mb-4">Ranked factors driving the current risk score</p>
        <div className="space-y-3">
          {contributingFactors.map((factor) => (
            <div key={factor.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-paper">{factor.label}</span>
                <span className="text-xs font-mono text-cyan">{factor.percentage}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${factor.percentage}%`,
                    background: `linear-gradient(90deg, ${riskColor}80, ${riskColor})`,
                    boxShadow: `0 0 8px ${riskColor}40`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Environmental Conditions */}
      <div className="panel panel-glow p-5">
        <h2 className="text-sm font-semibold text-paper mb-4">Environmental Conditions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {envConditions.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="p-3 rounded-lg border border-panel-line bg-void/50">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-cyan/70" />
                  <span className="text-xs text-fog uppercase tracking-wider">{c.label}</span>
                </div>
                <div className="text-lg font-mono font-medium text-paper">{c.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
