"""
TerraSafe Deterministic SOS Safety Agent.

Separation of Concerns:
The AI model estimates risk (0-100).
The SOS Safety Agent evaluates whether the empirical evidence is strong enough
to warrant operational escalation, or whether data quality flags require
declaring INSUFFICIENT_EVIDENCE.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.core.config import settings
from app.ml.preprocessing import is_in_india


class SOSStatus:
    NO_ESCALATION = "NO_ESCALATION"
    MONITOR = "MONITOR"
    ESCALATION_INITIATED = "ESCALATION_INITIATED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class SOSEvaluationResult(BaseModel):
    risk_score: float
    risk_level: str
    sos_status: str
    action_summary: str
    evidence_strength: str  # WEAK, MODERATE, STRONG
    evidence_points: int
    reasons: List[str]
    data_quality: Dict[str, Any]
    escalation_ready: bool


class SOSAgent:
    """
    Deterministic safety evaluation agent.
    Tests explicit conditions regarding data freshness, satellite corroboration,
    weather support, and spatial clustering before sanctioning escalation.
    """

    def __init__(
        self,
        staleness_limit_hours: float = settings.DATA_STALENESS_HOURS_LIMIT,
        high_frp_threshold: float = settings.HIGH_FRP_THRESHOLD,
        min_persistence: int = settings.MIN_PERSISTENCE_COUNT,
        min_confidence: float = settings.MIN_CONFIDENCE_THRESHOLD,
    ):
        self.staleness_limit = staleness_limit_hours
        self.high_frp = high_frp_threshold
        self.min_persistence = min_persistence
        self.min_confidence = min_confidence

    def evaluate(
        self,
        risk_score: float,
        satellite: Dict[str, Any],
        weather: Dict[str, Any],
        landcover: Optional[Dict[str, Any]] = None,
        staleness_hours: float = 0.0,
    ) -> SOSEvaluationResult:
        """
        Evaluate fire incident evidence and return escalation status.
        """
        landcover = landcover or {}
        reasons: List[str] = []
        data_quality: Dict[str, Any] = {
            "staleness_hours": round(staleness_hours, 1),
            "is_stale": staleness_hours > self.staleness_limit,
            "coordinate_valid": True,
            "missing_critical_data": False,
        }

        # -------------------------------------------------------------
        # STEP 1: Coordinate & Quality Validation
        # -------------------------------------------------------------
        lat = satellite.get("lat", satellite.get("latitude"))
        lng = satellite.get("lng", satellite.get("longitude"))

        if lat is None or lng is None:
            data_quality["missing_critical_data"] = True
            data_quality["coordinate_valid"] = False
            return SOSEvaluationResult(
                risk_score=risk_score,
                risk_level=settings.get_risk_level(risk_score),
                sos_status=SOSStatus.INSUFFICIENT_EVIDENCE,
                action_summary="Detection coordinates missing. Cannot verify incident location.",
                evidence_strength="WEAK",
                evidence_points=0,
                reasons=["Invalid or missing spatial coordinates"],
                data_quality=data_quality,
                escalation_ready=False,
            )

        if not is_in_india(float(lat), float(lng)):
            data_quality["coordinate_valid"] = False
            return SOSEvaluationResult(
                risk_score=risk_score,
                risk_level=settings.get_risk_level(risk_score),
                sos_status=SOSStatus.INSUFFICIENT_EVIDENCE,
                action_summary="Coordinates outside monitored Indian territory.",
                evidence_strength="WEAK",
                evidence_points=0,
                reasons=[f"Coordinates ({lat}, {lng}) fall outside monitored India bounding box"],
                data_quality=data_quality,
                escalation_ready=False,
            )

        # -------------------------------------------------------------
        # STEP 2: Data Staleness Check (Section 9 & 13)
        # -------------------------------------------------------------
        if staleness_hours > self.staleness_limit:
            reasons.append(
                f"Data is stale ({staleness_hours:.1f}h old, exceeds {self.staleness_limit:.0f}h limit). "
                "Fresh satellite overpass required before escalation."
            )
            return SOSEvaluationResult(
                risk_score=risk_score,
                risk_level=settings.get_risk_level(risk_score),
                sos_status=SOSStatus.INSUFFICIENT_EVIDENCE,
                action_summary="Observation stale; escalation withheld pending fresh satellite pass.",
                evidence_strength="WEAK",
                evidence_points=0,
                reasons=reasons,
                data_quality=data_quality,
                escalation_ready=False,
            )

        # -------------------------------------------------------------
        # STEP 3: Missing Critical Weather Evidence Check
        # -------------------------------------------------------------
        # If weather data is completely empty or missing required metrics
        if not weather or "temperature" not in weather or "humidity" not in weather:
            data_quality["missing_critical_data"] = True
            reasons.append("Missing critical weather telemetry (temperature/humidity).")
            # If risk is critical but weather is missing, we must NOT initiate full escalation
            return SOSEvaluationResult(
                risk_score=risk_score,
                risk_level=settings.get_risk_level(risk_score),
                sos_status=SOSStatus.MONITOR if risk_score >= 40 else SOSStatus.NO_ESCALATION,
                action_summary="Incomplete weather telemetry. Escalation withheld; monitoring active.",
                evidence_strength="WEAK",
                evidence_points=0,
                reasons=reasons,
                data_quality=data_quality,
                escalation_ready=False,
            )

        # -------------------------------------------------------------
        # STEP 4: Evidence Scoring
        # -------------------------------------------------------------
        evidence_points = 0
        frp = float(satellite.get("frp", 0.0))
        conf = float(satellite.get("confidence", 50.0))
        persistence = int(satellite.get("detection_persistence", satellite.get("persistence", 1)))
        nearby = int(satellite.get("nearby_detection_count", satellite.get("nearby_count", 0)))

        temp = float(weather.get("temperature", 25.0))
        humidity = float(weather.get("humidity", 50.0))
        wind = float(weather.get("windSpeed", weather.get("wind_speed", 10.0)))
        temp_anomaly = float(weather.get("temp_anomaly", 0.0))

        # Thermal intensity evidence
        if frp >= self.high_frp:
            evidence_points += 2
            reasons.append(f"Strong thermal radiation verified (FRP: {frp:.1f} MW >= {self.high_frp} MW threshold)")
        elif frp >= 5.0:
            evidence_points += 1
            reasons.append(f"Moderate thermal radiation (FRP: {frp:.1f} MW)")
        else:
            reasons.append(f"Weak thermal radiation (FRP: {frp:.1f} MW)")

        # Persistence evidence
        if persistence >= self.min_persistence:
            evidence_points += 2
            reasons.append(f"Confirmed persistence across {persistence} satellite overpasses")
        else:
            reasons.append("Single isolated overpass observation (unconfirmed persistence)")

        # Nearby clustering
        if nearby >= 4:
            evidence_points += 2
            reasons.append(f"High cluster density: {nearby} hotspot detections within 25km radius")
        elif nearby >= 2:
            evidence_points += 1
            reasons.append(f"Nearby clustering: {nearby} detections within 25km radius")

        # Weather support
        weather_support = False
        if humidity <= 25.0:
            evidence_points += 1
            weather_support = True
            reasons.append(f"Critical atmospheric dryness (relative humidity: {humidity:.0f}%)")
        if wind >= 25.0:
            evidence_points += 1
            weather_support = True
            reasons.append(f"Sustained spread winds ({wind:.0f} km/h)")
        if temp_anomaly >= 2.0:
            evidence_points += 1
            weather_support = True
            reasons.append(f"Abnormal regional heat (+{temp_anomaly:.1f}°C anomaly)")

        # Satellite confidence
        if conf >= 75.0:
            evidence_points += 1
            reasons.append(f"High sensor confidence ({conf:.0f}%)")
        elif conf < self.min_confidence:
            reasons.append(f"Sub-threshold sensor confidence ({conf:.0f}% < {self.min_confidence:.0f}%)")

        # Determine evidence strength label
        if evidence_points >= 5:
            strength = "STRONG"
        elif evidence_points >= 3:
            strength = "MODERATE"
        else:
            strength = "WEAK"

        # -------------------------------------------------------------
        # STEP 5: Escalation Decision Matrix
        # -------------------------------------------------------------
        risk_level = settings.get_risk_level(risk_score)

        # CASE 1: Low Risk (0 - 39) -> WATCH
        if risk_level == "WATCH":
            return SOSEvaluationResult(
                risk_score=risk_score,
                risk_level="WATCH",
                sos_status=SOSStatus.NO_ESCALATION,
                action_summary="Normal surveillance active. No escalation warranted.",
                evidence_strength=strength,
                evidence_points=evidence_points,
                reasons=reasons,
                data_quality=data_quality,
                escalation_ready=False,
            )

        # CASE 2: Elevated Risk (40 - 69) -> MONITOR
        if risk_level == "ELEVATED":
            return SOSEvaluationResult(
                risk_score=risk_score,
                risk_level="ELEVATED",
                sos_status=SOSStatus.MONITOR,
                action_summary="Elevated risk detected. Active monitoring and sensor tracking engaged.",
                evidence_strength=strength,
                evidence_points=evidence_points,
                reasons=reasons,
                data_quality=data_quality,
                escalation_ready=False,
            )

        # CASE 3: Critical Risk (>= 70) -> Evaluate Evidence Strength
        if risk_level == "CRITICAL":
            # Must have at least MODERATE/STRONG evidence (>= 4 points) AND either high FRP or persistence
            has_anchor_evidence = (frp >= self.high_frp) or (persistence >= self.min_persistence) or (nearby >= 4)

            if evidence_points >= 4 and has_anchor_evidence and weather_support:
                return SOSEvaluationResult(
                    risk_score=risk_score,
                    risk_level="CRITICAL",
                    sos_status=SOSStatus.ESCALATION_INITIATED,
                    action_summary="CRITICAL risk verified with multi-signal evidence. Escalation initiated.",
                    evidence_strength=strength,
                    evidence_points=evidence_points,
                    reasons=reasons,
                    data_quality=data_quality,
                    escalation_ready=True,
                )
            else:
                # High risk score but weak/unconfirmed evidence -> Do NOT escalate, MONITOR instead
                reasons.insert(
                    0,
                    "High risk score indicated, but physical evidence lacks multi-signal persistence/intensity. "
                    "Escalation withheld to prevent false alarms; incident placed on heightened MONITOR."
                )
                return SOSEvaluationResult(
                    risk_score=risk_score,
                    risk_level="CRITICAL",
                    sos_status=SOSStatus.MONITOR,
                    action_summary="High risk but weak corroborating evidence. Escalation withheld; monitoring.",
                    evidence_strength=strength,
                    evidence_points=evidence_points,
                    reasons=reasons,
                    data_quality=data_quality,
                    escalation_ready=False,
                )


# Global singleton agent
sos_agent = SOSAgent()

