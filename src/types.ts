export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FireStatus = 'Active' | 'Contained' | 'Monitored' | 'Controlled';
export type PageId =
  | 'dashboard'
  | 'live-map'
  | 'risk-analysis'
  | 'fire-events'
  | 'weather'
  | 'emergency-response'
  | 'analytics'
  | 'data-sources'
  | 'settings';

export interface FireEvent {
  id: string;
  name: string;
  location: string;
  state?: string;
  lat: number;
  lng: number;
  detected: string;
  detectedRelative: string;
  source: 'NASA FIRMS' | 'MODIS' | 'VIIRS' | 'GOES' | 'Ground Report';
  confidence: number;
  riskScore: number;
  riskLevel: RiskLevel;
  status: FireStatus;
  area?: number;
  frp?: number;
  bright_ti4?: number;
  persistence?: number;
  nearbyCount?: number;
  evidence?: string[];
  sosStatus?: string;
}

export interface RiskZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface Settlement {
  id: string;
  name: string;
  lat: number;
  lng: number;
  population: number;
}

export interface ContributingFactor {
  label: string;
  percentage: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windDirectionLabel: string;
  rainfall: number;
  pressure: number;
  visibility: number;
  dewPoint: number;
  heatIndex: number;
  fuelMoisture: number;
  windChill: number;
  fireWeatherIndex: number;
}

export interface WeatherForecastPoint {
  time: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
}

export interface DataSource {
  id: string;
  name: string;
  provider: string;
  updateFrequency: string;
  coverage: string;
  features: string[];
  type: 'Observed' | 'Derived' | 'Predicted';
  simulated: boolean;
}

export interface ResponseUnit {
  type: string;
  count: number;
  eta: string;
}

export interface Alert {
  id: string;
  title: string;
  region: string;
  severity: RiskLevel;
  time: string;
  description: string;
  sosStatus?: string;
}

export interface NavItem {
  id: PageId;
  label: string;
  icon: string;
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#00F5FF',
  medium: '#FFB020',
  high: '#FF6A3D',
  critical: '#FF3B30',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const STATUS_COLORS: Record<FireStatus, string> = {
  Active: '#FF3B30',
  Contained: '#FFB020',
  Monitored: '#00F5FF',
  Controlled: '#00FF88',
};

export function riskFromScore(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
