import { PageHeader } from '@/components/ui';
import { currentWeather, weatherForecast } from '@/data/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Thermometer, Droplets, Wind, Compass, CloudRain, Gauge as GaugeIcon,
  Eye, Zap,
} from 'lucide-react';

export function Weather() {
  const conditions = [
    { label: 'Temperature', value: `${currentWeather.temperature}°C`, icon: Thermometer },
    { label: 'Humidity', value: `${currentWeather.humidity}%`, icon: Droplets },
    { label: 'Wind Speed', value: `${currentWeather.windSpeed} km/h`, icon: Wind },
    { label: 'Wind Direction', value: `${currentWeather.windDirectionLabel} ${currentWeather.windDirection}°`, icon: Compass },
    { label: 'Rainfall', value: `${currentWeather.rainfall} mm`, icon: CloudRain },
    { label: 'Pressure', value: `${currentWeather.pressure} hPa`, icon: GaugeIcon },
    { label: 'Visibility', value: `${currentWeather.visibility} km`, icon: Eye },
    { label: 'Dew Point', value: `${currentWeather.dewPoint}°C`, icon: Droplets },
  ];

  const derived = [
    { label: 'Heat Index', value: `${currentWeather.heatIndex}°C`, interp: 'Extreme heat stress', risk: 'critical' as const },
    { label: 'Fuel Moisture', value: `${currentWeather.fuelMoisture}%`, interp: 'Critically dry fuels', risk: 'critical' as const },
    { label: 'Wind Chill', value: `${currentWeather.windChill}°C`, interp: 'Elevated fire spread risk', risk: 'high' as const },
    { label: 'Fire Weather Index', value: currentWeather.fireWeatherIndex, interp: 'Extreme fire danger', risk: 'critical' as const },
  ];

  const riskColors: Record<string, string> = {
    low: '#00F5FF',
    medium: '#FFB020',
    high: '#FF6A3D',
    critical: '#FF3B30',
  };

  const fwiBands = [
    { range: '0–20', label: 'Low', color: '#00F5FF' },
    { range: '21–40', label: 'Moderate', color: '#FFB020' },
    { range: '41–60', label: 'High', color: '#FF6A3D' },
    { range: '61–100', label: 'Extreme', color: '#FF3B30' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Weather" subtitle="Current conditions and fire-relevant metrics" />

      {/* Current Conditions */}
      <div>
        <h2 className="text-sm font-semibold text-paper mb-3">Current Conditions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {conditions.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="panel panel-glow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-cyan/70" />
                  <span className="text-xs text-fog uppercase tracking-wider">{c.label}</span>
                </div>
                <div className="text-xl font-mono font-medium text-paper">{c.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Derived fire-relevant metrics */}
      <div>
        <h2 className="text-sm font-semibold text-paper mb-3">Fire-Relevant Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {derived.map((d) => (
            <div key={d.label} className="panel panel-glow p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" style={{ color: riskColors[d.risk] }} />
                <span className="text-xs text-fog uppercase tracking-wider">{d.label}</span>
              </div>
              <div className="text-2xl font-mono font-bold" style={{ color: riskColors[d.risk] }}>
                {d.value}
              </div>
              <div className="text-xs mt-1.5" style={{ color: riskColors[d.risk] }}>{d.interp}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FWI Legend */}
      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-fog uppercase tracking-wider">Fire Weather Index Scale</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {fwiBands.map((band) => (
            <div key={band.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: band.color }} />
              <span className="text-xs font-mono text-paper">{band.range}</span>
              <span className="text-xs text-fog">{band.label}</span>
            </div>
          ))}
          <div className="ml-auto text-xs font-mono">
            <span className="text-fog">Current: </span>
            <span style={{ color: '#FF3B30' }}>{currentWeather.fireWeatherIndex} — Extreme</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel panel-glow p-5">
          <h2 className="text-sm font-semibold text-paper mb-4">Temperature & Humidity (48h)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weatherForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,247,250,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#8FA3AD', fontSize: 10 }} />
              <YAxis tick={{ fill: '#8FA3AD', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#06131A', border: '1px solid rgba(0,245,255,0.2)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#8FA3AD' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="temperature" stroke="#FF6A3D" strokeWidth={2} name="Temp (°C)" dot={false} />
              <Line type="monotone" dataKey="humidity" stroke="#00F5FF" strokeWidth={2} name="Humidity (%)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="panel panel-glow p-5">
          <h2 className="text-sm font-semibold text-paper mb-4">Wind Speed (48h)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weatherForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,247,250,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#8FA3AD', fontSize: 10 }} />
              <YAxis tick={{ fill: '#8FA3AD', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#06131A', border: '1px solid rgba(0,245,255,0.2)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#8FA3AD' }}
              />
              <Line type="monotone" dataKey="windSpeed" stroke="#FFB020" strokeWidth={2} name="Wind (km/h)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
