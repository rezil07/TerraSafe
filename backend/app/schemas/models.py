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
    event_id: Optional[str] = None
    location_name: Optional[str] = "India Sector"


class SOSEvaluateResponse(BaseModel):
    decision_id: str
    event_id: str
    risk_score: float
    risk_level: str
    agent_score: int
    decision: str
    sos_status: str
    action_summary: str
    simulation_action: str
    mode: str = "SIMULATION ONLY"
    evidence_strength: str
    evidence_points: int
    evidence: Dict[str, bool]
    reasons: List[str]
    escalation_ready: bool
    data_quality: Dict[str, Any]
    agent_version: str
    timestamp: str


class SOSFeedbackRequest(BaseModel):
    decision_id: str
    feedback: str  # 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'TRUE_NEGATIVE' | 'FALSE_NEGATIVE' | 'UNKNOWN'
    notes: Optional[str] = ""


class SOSFeedbackResponse(BaseModel):
    decision_id: str
    event_id: str
    decision: str
    feedback_outcome: str
    error_type: str
    timestamp: str
    mode: str = "SIMULATION ONLY"
    notes: str = ""


class SOSMetricsResponse(BaseModel):
    total_decisions: int
    breakdown: Dict[str, int]
    feedback_records: int
    has_sufficient_data: bool
    status_message: str
    true_positives: Optional[int] = None
    false_positives: Optional[int] = None
    true_negatives: Optional[int] = None
    false_negatives: Optional[int] = None
    over_escalations: int
    under_escalations: int
    precision: Optional[float] = None
    recall: Optional[float] = None
    false_positive_rate: Optional[float] = None
    false_negative_rate: Optional[float] = None
    mode: str = "SIMULATION ONLY"
    disclaimer: str


class SOSLearningReportResponse(BaseModel):
    report_id: str
    timestamp: str
    analyzed_count: int
    over_escalations: int
    under_escalations: int
    insights: List[str]
    proposed_adjustments: List[str]
    policy_promoted: bool
    active_policy_version: str
    mode: str = "SIMULATION ONLY"
    message: str


class SOSPolicyResponse(BaseModel):
    version: str
    created_at: str
    reason: str
    parameters: Dict[str, Any]
    changes: List[str]
    mode: str = "SIMULATION ONLY"


