"""
Pydantic schemas mirroring TerraSafe frontend TypeScript contracts.
Ensures seamless end-to-end type safety between FastAPI and React.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FireEventModel(BaseModel):
    id: str
    name: str
    location: str
    state: str = "National"
    lat: float
    lng: float
    detected: str
    detectedRelative: str
    source: str = "NASA FIRMS"
    confidence: float
    riskScore: float
    riskLevel: str  # 'low' | 'medium' | 'high' | 'critical'
    status: str = "Active"  # 'Active' | 'Contained' | 'Monitored' | 'Controlled'
    area: Optional[float] = None
    frp: Optional[float] = None
    bright_ti4: Optional[float] = None
    persistence: int = 1
    nearbyCount: int = 0
    evidence: List[str] = Field(default_factory=list)
    sosStatus: str = "NO_ESCALATION"


class RiskZoneModel(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    riskScore: float
    riskLevel: str


class SettlementModel(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    population: int


class WeatherForecastPointModel(BaseModel):
    time: str
    temperature: float
    humidity: float
    windSpeed: float


class WeatherDataModel(BaseModel):
    temperature: float
    humidity: float
    windSpeed: float
    windDirection: float
    windDirectionLabel: str
    rainfall: float
    pressure: float
    visibility: float
    dewPoint: float
    heatIndex: float
    fuelMoisture: float
    windChill: float
    fireWeatherIndex: float
    forecast: List[WeatherForecastPointModel] = Field(default_factory=list)


class ContributingFactorModel(BaseModel):
    label: str
    percentage: int


class AlertModel(BaseModel):
    id: str
    title: str
    region: str
    severity: str
    time: str
    description: str
    sosStatus: str = "MONITOR"


class RegionalStatusModel(BaseModel):
    region: str
    count: int
    status: str  # 'active' | 'clear'


class DashboardSummaryModel(BaseModel):
    activeCount: int
    highRiskZones: int
    avgRisk: int
    alertCount: int
    lastUpdated: str
    fireEvents: List[FireEventModel]
    activeAlerts: List[AlertModel]
    regions: List[RegionalStatusModel]


class SOSEvaluateRequest(BaseModel):
    risk_score: float
    satellite: Dict[str, Any]
    weather: Dict[str, Any]
    landcover: Optional[Dict[str, Any]] = None
    staleness_hours: float = 0.0


class SOSEvaluateResponse(BaseModel):
    risk_score: float
    risk_level: str
    sos_status: str
    action_summary: str
    evidence_strength: str
    evidence_points: int
    reasons: List[str]
    escalation_ready: bool
    data_quality: Dict[str, Any]

