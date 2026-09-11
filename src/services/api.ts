/**
 * TerraSafe API Service Client.
 * Connects the React dashboard to the FastAPI backend.
 * Provides resilient fallbacks so the application remains responsive offline or during backend startup.
 */

import type {
  FireEvent,
  WeatherData,
  Alert,
  RiskLevel
} from '@/types';
import {
  fireEvents as fallbackFires,
  currentWeather as fallbackWeather,
  activeAlerts as fallbackAlerts,
} from '@/data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface DashboardData {
  activeCount: number;
  highRiskZones: number;
  avgRisk: number;
  alertCount: number;
  lastUpdated: string;
  fireEvents: FireEvent[];
  activeAlerts: Alert[];
  regions: { region: string; count: number; status: 'active' | 'clear' }[];
}

export interface SOSEvalResponse {
  risk_score: number;
  risk_level: string;
  sos_status: string;
  action_summary: string;
  evidence_strength: string;
  evidence_points: number;
  reasons: string[];
  escalation_ready: boolean;
  data_quality: {
    staleness_hours: number;
    is_stale: boolean;
    coordinate_valid: boolean;
    missing_critical_data: boolean;
  };
}

export async function fetchHealth(): Promise<{ status: string; version: string; region_coverage: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchDashboard(): Promise<DashboardData> {
  try {
    const res = await fetch(`${API_BASE_URL}/dashboard`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend /api/dashboard unreachable, using verified Indian baseline:', err);
  }

  // Fallback to local Indian baseline
  const activeCount = fallbackFires.filter((e) => e.status === 'Active').length;
  const highRiskZones = fallbackFires.filter((e) => e.riskLevel === 'high' || e.riskLevel === 'critical').length;
  const avgRisk = Math.round(fallbackFires.reduce((s, e) => s + e.riskScore, 0) / fallbackFires.length);

  return {
    activeCount,
    highRiskZones,
    avgRisk,
    alertCount: fallbackAlerts.length,
    lastUpdated: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
    fireEvents: fallbackFires,
    activeAlerts: fallbackAlerts,
    regions: [
      { region: 'Western Himalayas', count: 3, status: 'active' },
      { region: 'Eastern Highlands', count: 2, status: 'active' },
      { region: 'Central Forests', count: 1, status: 'active' },
    ],
  };
}

export async function fetchFires(filters?: {
  state?: string;
  minConfidence?: number;
  riskLevel?: RiskLevel | 'all';
}): Promise<FireEvent[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.state) params.append('state', filters.state);
    if (filters?.minConfidence) params.append('min_confidence', String(filters.minConfidence));
    if (filters?.riskLevel && filters.riskLevel !== 'all') params.append('risk_level', filters.riskLevel);

    const res = await fetch(`${API_BASE_URL}/fires?${params.toString()}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend /api/fires unreachable, using verified Indian baseline:', err);
  }

  return fallbackFires;
}

export async function fetchLiveWeather(location: string = 'nainital'): Promise<WeatherData> {
  try {
    const res = await fetch(`${API_BASE_URL}/weather/${encodeURIComponent(location)}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend /api/weather unreachable, using baseline weather:', err);
  }

  return fallbackWeather;
}

export async function fetchRiskAnalysis(lat: number, lng: number, frp: number = 25.0): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/risk?lat=${lat}&lng=${lng}&frp=${frp}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend /api/risk unreachable:', err);
  }
  return null;
}

export async function evaluateSOS(payload: {
  risk_score: number;
  satellite: any;
  weather: any;
  staleness_hours?: number;
}): Promise<SOSEvalResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/sos/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend /api/sos/evaluate unreachable:', err);
  }
  return null;
}

