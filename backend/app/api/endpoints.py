"""
TerraSafe REST API Endpoints.
Provides complete API contracts for the React dashboard:
Fires, Risk, States, Weather, Dashboard, Alerts, and SOS Safety Agent.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.services.firms import fetch_firms_hotspots, resolve_indian_state
from app.services.weather import get_live_weather
from app.services.landcover import get_landcover_for_location
from app.services.osm import get_indian_settlements, get_indian_risk_zones, generate_indian_alerts
from app.ml.predict import predict_risk_score, compute_contributing_factors
from app.agents.sos_agent import sos_agent
from app.schemas.models import (
    FireEventModel,
    RiskZoneModel,
    SettlementModel,
    WeatherDataModel,
    AlertModel,
    DashboardSummaryModel,
    RegionalStatusModel,
    SOSEvaluateRequest,
    SOSEvaluateResponse
)

router = APIRouter(prefix="/api")


@router.get("/health", tags=["System"])
async def health_check():
    """Service health and operational status."""
    return {
        "status": "operational",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "model_loaded": True,
        "region_coverage": "India",
    }


@router.get("/fires", response_model=List[FireEventModel], tags=["Fires"])
async def get_fire_events(
    state: Optional[str] = Query(None, description="Filter by Indian State"),
    min_confidence: Optional[float] = Query(0.0, description="Minimum detection confidence (0-100)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (low, medium, high, critical)")
):
    """Retrieve active wildfire events and hotspots scored by the AI engine."""
    events = await fetch_firms_hotspots()
    filtered = events

    if state:
        filtered = [e for e in filtered if e.state.lower() == state.lower()]
    if min_confidence and min_confidence > 0:
        filtered = [e for e in filtered if e.confidence >= min_confidence]
    if risk_level and risk_level.lower() != "all":
        filtered = [e for e in filtered if e.riskLevel.lower() == risk_level.lower()]

    return filtered


@router.get("/fires/{fire_id}", response_model=FireEventModel, tags=["Fires"])
async def get_fire_by_id(fire_id: str):
    """Retrieve individual fire incident details, evidence factors, and SOS status."""
    events = await fetch_firms_hotspots()
    for e in events:
        if e.id.lower() == fire_id.lower():
            return e
    raise HTTPException(status_code=404, detail=f"Fire event '{fire_id}' not found.")


@router.get("/risk", tags=["Risk Analysis"])
async def get_risk_analysis(
    lat: float = Query(29.38, description="Latitude"),
    lng: float = Query(79.46, description="Longitude"),
    frp: float = Query(25.0, description="Fire Radiative Power (MW)"),
    confidence: float = Query(85.0, description="Confidence (0-100)")
):
    """
    On-demand risk scoring for arbitrary coordinates.
    Runs real-time weather acquisition and Random Forest prediction.
    """
    weather = await get_live_weather(lat, lng)
    landcover = get_landcover_for_location(lat, lng)

    sat_data = {
        "lat": lat,
        "lng": lng,
        "frp": frp,
        "confidence": confidence,
        "nearby_count": 2,
        "persistence": 2 if frp > 15 else 1
    }
    weather_dict = {
        "temperature": weather.temperature,
        "humidity": weather.humidity,
        "wind_speed": weather.windSpeed,
        "wind_direction": weather.windDirection,
        "rainfall": weather.rainfall,
    }

    pred = predict_risk_score(sat_data, weather_dict, landcover)
    sos_eval = sos_agent.evaluate(pred["risk_score"], sat_data, weather_dict)

    return {
        "risk_score": pred["risk_score"],
        "risk_level": pred["risk_level"],
        "sos_status": sos_eval.sos_status,
        "action_summary": sos_eval.action_summary,
        "evidence_strength": sos_eval.evidence_strength,
        "contributing_factors": pred["contributing_factors"],
        "evidence": pred["evidence"],
        "environmental_conditions": {
            "temperature": f"{weather.temperature}°C",
            "humidity": f"{weather.humidity}%",
            "wind_speed": f"{weather.windSpeed} km/h",
            "wind_direction": f"{weather.windDirectionLabel} ({weather.windDirection}°)",
            "rainfall": f"{weather.rainfall} mm",
            "pressure": f"{weather.pressure} hPa",
            "dew_point": f"{weather.dewPoint}°C",
            "fuel_moisture": f"{weather.fuelMoisture}%",
            "fire_weather_index": weather.fireWeatherIndex,
        },
        "landcover": landcover,
    }


@router.get("/risk/{location}", tags=["Risk Analysis"])
async def get_risk_by_location(location: str):
    """Retrieve risk profile for known Indian location or state."""
    coords = {
        "nainital": (29.38, 79.46),
        "uttarakhand": (30.06, 79.01),
        "simlipal": (21.85, 86.34),
        "odisha": (20.95, 85.09),
        "bandipur": (11.66, 76.62),
        "karnataka": (15.31, 75.71),
        "satpura": (22.45, 78.22),
        "madhya-pradesh": (22.97, 78.65),
        "himachal": (31.10, 77.17),
        "bastar": (19.07, 82.03),
    }
    key = location.lower().replace(" ", "-")
    lat, lng = coords.get(key, (28.6139, 77.2090))
    return await get_risk_analysis(lat=lat, lng=lng)


@router.get("/states", tags=["States"])
async def get_all_states():
    """Retrieve monitored Indian states and active incident counts."""
    fires = await fetch_firms_hotspots()
    state_counts = {}
    for f in fires:
        state_counts[f.state] = state_counts.get(f.state, 0) + 1

    states_list = [
        {"state": "Uttarakhand", "region": "Western Himalayas", "activeFires": state_counts.get("Uttarakhand", 0), "riskLevel": "high"},
        {"state": "Odisha", "region": "Eastern Highlands", "activeFires": state_counts.get("Odisha", 0), "riskLevel": "critical"},
        {"state": "Madhya Pradesh", "region": "Central India", "activeFires": state_counts.get("Madhya Pradesh", 0), "riskLevel": "high"},
        {"state": "Karnataka", "region": "Western Ghats South", "activeFires": state_counts.get("Karnataka", 0), "riskLevel": "medium"},
        {"state": "Himachal Pradesh", "region": "Western Himalayas", "activeFires": state_counts.get("Himachal Pradesh", 0), "riskLevel": "medium"},
        {"state": "Chhattisgarh", "region": "Central Forests", "activeFires": state_counts.get("Chhattisgarh", 0), "riskLevel": "medium"},
    ]
    return states_list


@router.get("/states/{state_name}", tags=["States"])
async def get_state_details(state_name: str):
    """Retrieve detailed state telemetry, incidents, and risk zones."""
    fires = await fetch_firms_hotspots(state=state_name)
    risk_zones = [z for z in get_indian_risk_zones() if state_name.lower() in z.name.lower()]
    return {
        "state": state_name,
        "active_fires": fires,
        "risk_zones": risk_zones,
    }


@router.get("/weather/{location}", response_model=WeatherDataModel, tags=["Weather"])
async def get_weather_for_location(location: str):
    """Retrieve live weather and fire weather telemetry for Indian coordinate or city."""
    coords = {
        "nainital": (29.38, 79.46),
        "dehradun": (30.31, 78.03),
        "shimla": (31.10, 77.17),
        "delhi": (28.61, 77.20),
        "bhubaneswar": (20.29, 85.82),
        "bhopal": (23.25, 77.41),
        "bengaluru": (12.97, 77.59),
    }
    lat, lng = coords.get(location.lower(), (28.6139, 77.2090))
    return await get_live_weather(lat, lng)


@router.get("/dashboard", response_model=DashboardSummaryModel, tags=["Dashboard"])
async def get_dashboard_summary():
    """Consolidated intelligence payload powering the main dashboard."""
    fires = await fetch_firms_hotspots()
    active_count = sum(1 for f in fires if f.status == "Active")
    high_risk_zones = sum(1 for f in fires if f.riskLevel in ["high", "critical"])
    avg_risk = int(round(sum(f.riskScore for f in fires) / max(1, len(fires))))

    alerts = generate_indian_alerts(fires)

    # Regional status summary
    reg_counts = {}
    for f in fires:
        reg = resolve_indian_state(f.lat, f.lng)["region"]
        reg_counts[reg] = reg_counts.get(reg, 0) + 1

    regions = [
        RegionalStatusModel(region="Western Himalayas", count=reg_counts.get("Western Himalayas", 0), status="active" if reg_counts.get("Western Himalayas", 0) > 0 else "clear"),
        RegionalStatusModel(region="Eastern Highlands", count=reg_counts.get("Eastern Highlands", 0), status="active" if reg_counts.get("Eastern Highlands", 0) > 0 else "clear"),
        RegionalStatusModel(region="Central Forests", count=reg_counts.get("Central Forests", 0), status="active" if reg_counts.get("Central Forests", 0) > 0 else "clear"),
    ]

    return DashboardSummaryModel(
        activeCount=active_count,
        highRiskZones=high_risk_zones,
        avgRisk=avg_risk,
        alertCount=len(alerts),
        lastUpdated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        fireEvents=fires,
        activeAlerts=alerts,
        regions=regions
    )


@router.get("/alerts", response_model=List[AlertModel], tags=["Alerts"])
async def get_active_alerts():
    """Retrieve active early-warning alerts for disaster response operations."""
    fires = await fetch_firms_hotspots()
    return generate_indian_alerts(fires)


@router.post("/sos/evaluate", response_model=SOSEvaluateResponse, tags=["SOS Safety Agent"])
async def evaluate_incident_safety(req: SOSEvaluateRequest):
    """
    Dedicated endpoint for the Deterministic SOS Safety Agent.
    Evaluates evidence sufficiency, staleness, and corroboration before sanctioning escalation.
    """
    eval_result = sos_agent.evaluate(
        risk_score=req.risk_score,
        satellite=req.satellite,
        weather=req.weather,
        landcover=req.landcover,
        staleness_hours=req.staleness_hours
    )
    return SOSEvaluateResponse(
        risk_score=eval_result.risk_score,
        risk_level=eval_result.risk_level,
        sos_status=eval_result.sos_status,
        action_summary=eval_result.action_summary,
        evidence_strength=eval_result.evidence_strength,
        evidence_points=eval_result.evidence_points,
        reasons=eval_result.reasons,
        escalation_ready=eval_result.escalation_ready,
        data_quality=eval_result.data_quality
    )

