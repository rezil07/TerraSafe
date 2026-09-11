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
from app.agents.sos_memory import sos_memory
from app.schemas.models import (
    FireEventModel,
    RiskZoneModel,
    SettlementModel,
    WeatherDataModel,
    AlertModel,
    DashboardSummaryModel,
    RegionalStatusModel,
    SOSEvaluateRequest,
    SOSEvaluateResponse,
    SOSFeedbackRequest,
    SOSFeedbackResponse,
    SOSMetricsResponse,
    SOSLearningReportResponse,
    SOSPolicyResponse,
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


@router.get("/sos/status", tags=["SOS Safety Agent"])
async def get_sos_agent_status():
    """
    Operational status of the TerraSafe Deterministic SOS Decision Agent.
    Strictly SIMULATION ONLY: No real emergency services contacted.
    """
    metrics = sos_memory.get_metrics()
    return {
        "status": "active",
        "agent": "TerraSafe SOS Decision Agent",
        "mode": "SIMULATION ONLY",
        "policy_version": sos_agent.policy_version,
        "total_decisions_recorded": metrics["total_decisions"],
        "feedback_records_accumulated": metrics["feedback_records"],
        "safety_guardrails": {
            "no_emergency_calling": True,
            "no_sms_dispatch": True,
            "no_external_apis": True,
            "staleness_limit_hours": sos_agent.staleness_limit,
            "min_confidence_threshold": sos_agent.min_confidence,
            "high_frp_threshold_mw": sos_agent.high_frp,
            "min_persistence_passes": sos_agent.min_persistence,
        }
    }


@router.post("/sos/evaluate", response_model=SOSEvaluateResponse, tags=["SOS Safety Agent"])
async def evaluate_incident_safety(req: SOSEvaluateRequest):
    """
    Dedicated evaluation endpoint for the Deterministic SOS Safety Agent.
    Evaluates evidence sufficiency, staleness, and corroboration before sanctioning escalation.
    GUARANTEE: Pure simulation, no external emergency service contacted.
    """
    eval_result = sos_agent.evaluate(
        risk_score=req.risk_score,
        satellite=req.satellite,
        weather=req.weather,
        landcover=req.landcover,
        staleness_hours=req.staleness_hours,
        event_id=req.event_id,
        location_name=req.location_name or "India Sector"
    )
    return SOSEvaluateResponse(
        decision_id=eval_result.decision_id,
        event_id=eval_result.event_id,
        risk_score=eval_result.risk_score,
        risk_level=eval_result.risk_level,
        agent_score=eval_result.agent_score,
        decision=eval_result.decision,
        sos_status=eval_result.decision,
        action_summary=eval_result.action_summary,
        simulation_action=eval_result.simulation_action,
        mode=eval_result.mode,
        evidence_strength=eval_result.evidence_strength,
        evidence_points=eval_result.evidence_points,
        evidence=eval_result.evidence,
        reasons=eval_result.reasons,
        escalation_ready=eval_result.escalation_ready,
        data_quality=eval_result.data_quality,
        agent_version=eval_result.agent_version,
        timestamp=eval_result.timestamp
    )


@router.post("/sos/feedback", response_model=SOSFeedbackResponse, tags=["SOS Safety Agent"])
async def submit_simulated_feedback(req: SOSFeedbackRequest):
    """
    Submit simulated ground-truth feedback for an SOS decision.
    Categorizes errors into OVER_ESCALATION or UNDER_ESCALATION to inform the learning cycle.
    """
    try:
        res = sos_memory.record_feedback(
            decision_id=req.decision_id,
            feedback_outcome=req.feedback,
            notes=req.notes or ""
        )
        return SOSFeedbackResponse(
            decision_id=res["decision_id"],
            event_id=res["event_id"],
            decision=res["decision"],
            feedback_outcome=res["feedback_outcome"],
            error_type=res["error_type"],
            timestamp=res["timestamp"],
            mode=res["mode"],
            notes=res["notes"]
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/sos/history", tags=["SOS Safety Agent"])
async def get_sos_history(limit: int = Query(50, description="Max history entries")):
    """Audit log of past SOS decisions, multi-source evidence, and simulated feedback."""
    return sos_memory.get_history(limit=limit)


@router.get("/sos/metrics", response_model=SOSMetricsResponse, tags=["SOS Safety Agent"])
async def get_sos_metrics():
    """
    Calculates empirical decision and error statistics.
    Returns 'Insufficient feedback data' if sample size is too small, rather than inventing accuracy.
    """
    metrics = sos_memory.get_metrics()
    return SOSMetricsResponse(**metrics)


@router.post("/sos/learn", response_model=SOSLearningReportResponse, tags=["SOS Safety Agent"])
async def trigger_learning_cycle():
    """
    Executes a controlled learning cycle:
    Analyzes historical errors, identifies corroboration patterns,
    proposes policy adjustments, and increments policy version (e.g. sos_policy_v1 -> sos_policy_v2).
    """
    report = sos_agent.run_learning_cycle()
    return SOSLearningReportResponse(**report)


@router.get("/sos/learning-report", tags=["SOS Safety Agent"])
async def get_latest_learning_report():
    """Fetch the latest learning report and policy changelog."""
    report = sos_memory.get_latest_learning_report()
    if not report:
        return {
            "status": "No learning cycles executed yet.",
            "mode": "SIMULATION ONLY",
            "active_policy_version": sos_agent.policy_version
        }
    return report


@router.get("/sos/policy", response_model=SOSPolicyResponse, tags=["SOS Safety Agent"])
async def get_active_policy():
    """Inspect active SOS decision policy rules, weights, and version details."""
    latest = sos_memory.get_latest_policy()
    if latest:
        return SOSPolicyResponse(
            version=latest["version"],
            created_at=latest["created_at"],
            reason=latest["reason"],
            parameters=latest["parameters"],
            changes=latest["changes"],
            mode="SIMULATION ONLY"
        )
    return SOSPolicyResponse(
        version=sos_agent.policy_version,
        created_at=datetime.now(timezone.utc).isoformat(),
        reason="Default calibrated baseline policy.",
        parameters={
            "staleness_limit_hours": sos_agent.staleness_limit,
            "high_frp_threshold": sos_agent.high_frp,
            "min_persistence": sos_agent.min_persistence,
            "min_confidence": sos_agent.min_confidence,
            "nearby_cluster_threshold": sos_agent.nearby_cluster_threshold
        },
        changes=["Baseline India bounding box weights."],
        mode="SIMULATION ONLY"
    )

