"""
TerraSafe Deterministic SOS Safety Agent.

Smart India Hackathon Prototype.
MODE: SIMULATION ONLY.
NO REAL-WORLD EMERGENCY SERVICES ARE CONTACTED OR DISPATCHED.

Separation of Concerns:
- The Random Forest AI model estimates wildfire risk (0-100).
- The SOS Decision Agent evaluates whether multi-source empirical evidence,
  data quality, and persistence justify operational escalation, or whether
  escalation must be withheld/monitored.
- A controlled feedback loop learns from simulated feedback (TRUE/FALSE POSITIVES/NEGATIVES)
  to evolve policy versions (e.g. sos_policy_v1 -> sos_policy_v2) during explicit learning cycles.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.core.config import settings
from app.ml.preprocessing import is_in_india
from app.agents.sos_memory import sos_memory


class SOSStatus:
    NO_ESCALATION = "NO_ESCALATION"
    MONITOR = "MONITOR"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    ESCALATION_INITIATED = "ESCALATION_INITIATED"
    ESCALATION_WITHHELD = "ESCALATION_WITHHELD"


class SOSEvaluationResult(BaseModel):
    decision_id: str
    event_id: str
    risk_score: float
    risk_level: str
    agent_score: int
    decision: str  # SOSStatus
    sos_status: str = ""
    action_summary: str
    simulation_action: str
    mode: str = "SIMULATION ONLY"
    evidence_strength: str  # WEAK, MODERATE, STRONG
    evidence_points: int
    evidence: Dict[str, bool]
    reasons: List[str]
    data_quality: Dict[str, Any]
    escalation_ready: bool
    agent_version: str
    timestamp: str

    def model_post_init(self, __context: Any) -> None:
        if not self.sos_status:
            self.sos_status = self.decision


class SOSAgent:
    """
    Deterministic safety evaluation agent.
    Combines:
      MODEL RISK + SATELLITE EVIDENCE + PERSISTENCE + ENVIRONMENT + DATA QUALITY
    to make an explainable decision without calling any real emergency dispatch.
    """

    def __init__(
        self,
        policy_version: str = "sos_policy_v1",
        staleness_limit_hours: float = settings.DATA_STALENESS_HOURS_LIMIT,
        high_frp_threshold: float = settings.HIGH_FRP_THRESHOLD,
        min_persistence: int = settings.MIN_PERSISTENCE_COUNT,
        min_confidence: float = settings.MIN_CONFIDENCE_THRESHOLD,
        nearby_cluster_threshold: int = 2,
    ):
        self.policy_version = policy_version
        self.staleness_limit = staleness_limit_hours
        self.high_frp = high_frp_threshold
        self.min_persistence = min_persistence
        self.min_confidence = min_confidence
        self.nearby_cluster_threshold = nearby_cluster_threshold

        # Try to restore evolved policy from persistent memory if available
        self._load_active_policy()

    def _load_active_policy(self):
        try:
            latest = sos_memory.get_latest_policy()
            if latest:
                self.policy_version = latest["version"]
                params = latest.get("parameters", {})
                self.staleness_limit = params.get("staleness_limit_hours", self.staleness_limit)
                self.high_frp = params.get("high_frp_threshold", self.high_frp)
                self.min_persistence = params.get("min_persistence", self.min_persistence)
                self.min_confidence = params.get("min_confidence", self.min_confidence)
                self.nearby_cluster_threshold = params.get("nearby_cluster_threshold", self.nearby_cluster_threshold)
            else:
                # Save baseline policy v1
                sos_memory.save_policy(
                    version="sos_policy_v1",
                    reason="Baseline deterministic policy initialized for SIH prototype.",
                    parameters={
                        "staleness_limit_hours": self.staleness_limit,
                        "high_frp_threshold": self.high_frp,
                        "min_persistence": self.min_persistence,
                        "min_confidence": self.min_confidence,
                        "nearby_cluster_threshold": self.nearby_cluster_threshold,
                    },
                    changes=["Initial calibrated weights across India bounding box."]
                )
        except Exception:
            pass

    def evaluate(
        self,
        risk_score: float,
        satellite: Dict[str, Any],
        weather: Dict[str, Any],
        landcover: Optional[Dict[str, Any]] = None,
        staleness_hours: float = 0.0,
        event_id: Optional[str] = None,
        location_name: str = "India Sector",
    ) -> SOSEvaluationResult:
        """
        Evaluate fire incident evidence and return escalation status.
        GUARANTEE: Pure simulation, no external calling.
        """
        d_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
        ev_id = event_id or satellite.get("id") or f"FIRE-{uuid.uuid4().hex[:6].upper()}"
        now_utc = datetime.now(timezone.utc).isoformat()
        landcover = landcover or {}
        reasons: List[str] = []

        data_quality: Dict[str, Any] = {
            "staleness_hours": round(staleness_hours, 1),
            "is_stale": staleness_hours > self.staleness_limit,
            "coordinate_valid": True,
            "missing_critical_data": False,
        }

        evidence_flags = {
            "satellite": False,
            "persistence": False,
            "weather_anomaly": False,
            "nearby_detections": False,
            "environmental_support": False,
        }

        # -------------------------------------------------------------
        # STEP 1: Coordinate & Quality Validation
        # -------------------------------------------------------------
        lat = satellite.get("lat", satellite.get("latitude"))
        lng = satellite.get("lng", satellite.get("longitude"))

        if lat is None or lng is None:
            data_quality["missing_critical_data"] = True
            data_quality["coordinate_valid"] = False
            result = SOSEvaluationResult(
                decision_id=d_id,
                event_id=ev_id,
                risk_score=risk_score,
                risk_level=settings.get_risk_level(risk_score),
                agent_score=0,
                decision=SOSStatus.INSUFFICIENT_EVIDENCE,
                action_summary="Detection coordinates missing. Cannot verify incident location.",
                simulation_action="DATA_QUALITY_HOLD",
                evidence_strength="WEAK",
                evidence_points=0,
                evidence=evidence_flags,
                reasons=["Invalid or missing spatial coordinates."],
                data_quality=data_quality,
                escalation_ready=False,
                agent_version=self.policy_version,
                timestamp=now_utc,
            )
            self._record(result, lat, lng, location_name)
            return result

        try:
            lat_f = float(lat)
            lng_f = float(lng)
        except (ValueError, TypeError):
            data_quality["coordinate_valid"] = False
            result = SOSEvaluationResult(
                decision_id=d_id,
                event_id=ev_id,
                risk_score=risk_score,
                risk_level=settings.get_risk_level(risk_score),
                agent_score=0,
                decision=SOSStatus.INSUFFICIENT_EVIDENCE,
                action_summary="Invalid spatial coordinates format.",
                simulation_action="DATA_QUALITY_HOLD",
                evidence_strength="WEAK",
                evidence_points=0,
                evidence=evidence_flags,
                reasons=["Coordinates could not be parsed to numeric values."],
                data_quality=data_quality,
                escalation_ready=False,
                agent_version=self.policy_version,
                timestamp=now_utc,
            )
            self._record(result, None, None, location_name)
            return result

        if not is_in_india(lat_f, lng_f):
            data_quality["coordinate_valid"] = False
            result = SOSEvaluationResult(
                decision_id=d_id,
                event_id=ev_id,
                risk_score=risk_score,
                risk_level=settings.get_risk_level(risk_score),
                agent_score=0,
                decision=SOSStatus.INSUFFICIENT_EVIDENCE,
                action_summary="Coordinates outside monitored Indian territory.",
                simulation_action="JURISDICTION_HOLD",
                evidence_strength="WEAK",
                evidence_points=0,
                evidence=evidence_flags,
                reasons=[f"Coordinates ({lat_f:.2f}, {lng_f:.2f}) fall outside monitored India bounding box."],
                data_quality=data_quality,
                escalation_ready=False,
                agent_version=self.policy_version,
                timestamp=now_utc,
            )
            self._record(result, lat_f, lng_f, location_name)
            return result

        # -------------------------------------------------------------
        # STEP 2: Data Staleness Check
        # -------------------------------------------------------------
        if staleness_hours > self.staleness_limit:
            reasons.append(
                f"Data is stale ({staleness_hours:.1f}h old, exceeds {self.staleness_limit:.0f}h limit). "
                "Fresh satellite overpass required before operational escalation."
            )
            result = SOSEvaluationResult(
                decision_id=d_id,
                event_id=ev_id,
                risk_score=risk_score,
                risk_level=settings.get_risk_level(risk_score),
                agent_score=int(round(risk_score * 0.3)),
                decision=SOSStatus.INSUFFICIENT_EVIDENCE,
                action_summary="Observation stale; escalation withheld pending fresh satellite pass.",
                simulation_action="REFRESH_PENDING",
                evidence_strength="WEAK",
                evidence_points=0,
                evidence=evidence_flags,
                reasons=reasons,
                data_quality=data_quality,
                escalation_ready=False,
                agent_version=self.policy_version,
                timestamp=now_utc,
            )
            self._record(result, lat_f, lng_f, location_name)
            return result

        # -------------------------------------------------------------
        # STEP 3: Missing Critical Weather Telemetry Check
        # -------------------------------------------------------------
        if not weather or "temperature" not in weather or "humidity" not in weather:
            data_quality["missing_critical_data"] = True
            reasons.append("Missing critical weather telemetry (temperature/humidity).")
            result = SOSEvaluationResult(
                decision_id=d_id,
                event_id=ev_id,
                risk_score=risk_score,
                risk_level=settings.get_risk_level(risk_score),
                agent_score=int(round(risk_score * 0.5)),
                decision=SOSStatus.INSUFFICIENT_EVIDENCE if risk_score >= 70 else (SOSStatus.MONITOR if risk_score >= 40 else SOSStatus.NO_ESCALATION),
                action_summary="Incomplete weather telemetry. Escalation withheld; monitoring active.",
                simulation_action="DATA_QUALITY_HOLD",
                evidence_strength="WEAK",
                evidence_points=0,
                evidence=evidence_flags,
                reasons=reasons,
                data_quality=data_quality,
                escalation_ready=False,
                agent_version=self.policy_version,
                timestamp=now_utc,
            )
            self._record(result, lat_f, lng_f, location_name)
            return result

        # -------------------------------------------------------------
        # STEP 4: Evidence Scoring & Corroboration
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

        # 4a. Satellite Thermal Radiative Power (FRP)
        if frp >= self.high_frp:
            evidence_points += 2
            evidence_flags["satellite"] = True
            reasons.append(f"Strong thermal radiation verified (FRP: {frp:.1f} MW >= {self.high_frp} MW threshold)")
        elif frp >= 5.0:
            evidence_points += 1
            evidence_flags["satellite"] = True
            reasons.append(f"Moderate thermal radiation (FRP: {frp:.1f} MW)")
        else:
            reasons.append(f"Weak thermal radiation (FRP: {frp:.1f} MW)")

        # 4b. Detection Persistence across multiple overpasses
        if persistence >= self.min_persistence:
            evidence_points += 2
            evidence_flags["persistence"] = True
            reasons.append(f"Confirmed persistence across {persistence} satellite overpasses (>= {self.min_persistence})")
        else:
            reasons.append("Single isolated overpass observation (unconfirmed persistence)")

        # 4c. Nearby Cluster Density
        if nearby >= (self.nearby_cluster_threshold + 2):
            evidence_points += 2
            evidence_flags["nearby_detections"] = True
            reasons.append(f"High cluster density: {nearby} hotspot detections within 25km radius")
        elif nearby >= self.nearby_cluster_threshold:
            evidence_points += 1
            evidence_flags["nearby_detections"] = True
            reasons.append(f"Nearby clustering: {nearby} detections within 25km radius")
        else:
            reasons.append("Isolated thermal signature with zero nearby cluster support")

        # 4d. Fire-Weather Support & Anomalies
        weather_support = False
        if humidity <= 25.0:
            evidence_points += 1
            weather_support = True
            reasons.append(f"Critical atmospheric dryness (relative humidity: {humidity:.0f}%)")
        if wind >= 25.0:
            evidence_points += 1
            weather_support = True
            reasons.append(f"Sustained fire-spread winds ({wind:.0f} km/h)")
        if temp_anomaly >= 2.0:
            evidence_points += 1
            weather_support = True
            evidence_flags["weather_anomaly"] = True
            reasons.append(f"Abnormal regional heat (+{temp_anomaly:.1f}°C temperature anomaly)")

        evidence_flags["environmental_support"] = weather_support

        # 4e. Satellite Sensor Confidence
        if conf >= 75.0:
            evidence_points += 1
            reasons.append(f"High sensor confidence ({conf:.0f}%)")
        elif conf < self.min_confidence:
            reasons.append(f"Sub-threshold sensor confidence ({conf:.0f}% < {self.min_confidence:.0f}%)")

        # Determine overall evidence strength
        if evidence_points >= 5:
            strength = "STRONG"
        elif evidence_points >= 3:
            strength = "MODERATE"
        else:
            strength = "WEAK"

        # -------------------------------------------------------------
        # STEP 5: Composite Agent Score (0 - 100)
        # Combines model risk (40%), evidence points (40%), weather support (20%)
        # -------------------------------------------------------------
        evidence_fraction = min(1.0, evidence_points / 7.0)
        weather_fraction = 1.0 if weather_support else 0.3
        composite_agent_score = int(round(
            (risk_score * 0.45) +
            (evidence_fraction * 100 * 0.40) +
            (weather_fraction * 100 * 0.15)
        ))
        composite_agent_score = max(0, min(100, composite_agent_score))

        # -------------------------------------------------------------
        # STEP 6: Deterministic Escalation Decision Matrix
        # -------------------------------------------------------------
        risk_level = settings.get_risk_level(risk_score)

        # CASE 1: Low Risk (0 - 39) -> WATCH
        if risk_level == "WATCH":
            result = SOSEvaluationResult(
                decision_id=d_id,
                event_id=ev_id,
                risk_score=risk_score,
                risk_level="WATCH",
                agent_score=composite_agent_score,
                decision=SOSStatus.NO_ESCALATION,
                action_summary="Normal surveillance active. No escalation warranted.",
                simulation_action="ROUTINE_SURVEILLANCE",
                evidence_strength=strength,
                evidence_points=evidence_points,
                evidence=evidence_flags,
                reasons=reasons,
                data_quality=data_quality,
                escalation_ready=False,
                agent_version=self.policy_version,
                timestamp=now_utc,
            )
            self._record(result, lat_f, lng_f, location_name)
            return result

        # CASE 2: Elevated Risk (40 - 69) -> MONITOR
        if risk_level == "ELEVATED":
            result = SOSEvaluationResult(
                decision_id=d_id,
                event_id=ev_id,
                risk_score=risk_score,
                risk_level="ELEVATED",
                agent_score=composite_agent_score,
                decision=SOSStatus.MONITOR,
                action_summary="Elevated risk detected. Active monitoring and sensor tracking engaged.",
                simulation_action="ACTIVE_MONITORING",
                evidence_strength=strength,
                evidence_points=evidence_points,
                evidence=evidence_flags,
                reasons=reasons,
                data_quality=data_quality,
                escalation_ready=False,
                agent_version=self.policy_version,
                timestamp=now_utc,
            )
            self._record(result, lat_f, lng_f, location_name)
            return result

        # CASE 3: Critical Risk (>= 70) -> Evaluate Corroboration & Safety Policy
        if risk_level == "CRITICAL":
            has_anchor_evidence = (frp >= self.high_frp) or (persistence >= self.min_persistence) or (nearby >= 4)
            has_sufficient_points = evidence_points >= 4

            if has_sufficient_points and has_anchor_evidence and weather_support:
                result = SOSEvaluationResult(
                    decision_id=d_id,
                    event_id=ev_id,
                    risk_score=risk_score,
                    risk_level="CRITICAL",
                    agent_score=composite_agent_score,
                    decision=SOSStatus.ESCALATION_INITIATED,
                    action_summary="CRITICAL wildfire risk verified with multi-signal evidence. Escalation initiated.",
                    simulation_action="PROTOTYPE_ALERT_GENERATED",
                    evidence_strength=strength,
                    evidence_points=evidence_points,
                    evidence=evidence_flags,
                    reasons=reasons,
                    data_quality=data_quality,
                    escalation_ready=True,
                    agent_version=self.policy_version,
                    timestamp=now_utc,
                )
                self._record(result, lat_f, lng_f, location_name)
                return result
            else:
                # High model risk score but uncorroborated physical evidence
                # Withhold escalation to prevent false alarms; place on heightened MONITOR
                withheld_reason = (
                    "High model risk score indicated, but physical evidence lacks multi-signal corroboration "
                    f"(points: {evidence_points}/7, persistence: {persistence}, anchor: {has_anchor_evidence}). "
                    "Escalation withheld by safety policy to prevent false alarms; incident placed on heightened MONITOR."
                )
                reasons.insert(0, withheld_reason)

                result = SOSEvaluationResult(
                    decision_id=d_id,
                    event_id=ev_id,
                    risk_score=risk_score,
                    risk_level="CRITICAL",
                    agent_score=composite_agent_score,
                    decision=SOSStatus.ESCALATION_WITHHELD,
                    action_summary="High risk but weak corroborating evidence. Escalation withheld by safety policy.",
                    simulation_action="ESCALATION_WITHHELD_MONITORING",
                    evidence_strength=strength,
                    evidence_points=evidence_points,
                    evidence=evidence_flags,
                    reasons=reasons,
                    data_quality=data_quality,
                    escalation_ready=False,
                    agent_version=self.policy_version,
                    timestamp=now_utc,
                )
                self._record(result, lat_f, lng_f, location_name)
                return result

    def _record(self, result: SOSEvaluationResult, lat: Optional[float], lng: Optional[float], location_name: str):
        try:
            sos_memory.record_decision(
                event_id=result.event_id,
                lat=lat,
                lng=lng,
                location_name=location_name,
                risk_score=result.risk_score,
                agent_score=result.agent_score,
                decision=result.decision,
                action_summary=result.action_summary,
                evidence_strength=result.evidence_strength,
                evidence_points=result.evidence_points,
                evidence=result.evidence,
                data_quality=result.data_quality,
                reasons=result.reasons,
                simulation_action=result.simulation_action,
                model_version="rf_v1",
                agent_version=result.agent_version,
                decision_id=result.decision_id
            )
        except Exception:
            pass

    def run_learning_cycle(self) -> Dict[str, Any]:
        """
        Controlled learning cycle:
        1. Reads accumulated decisions with feedback from memory.
        2. Identifies error patterns (OVER_ESCALATION vs UNDER_ESCALATION).
        3. Proposes explainable policy adjustments.
        4. Increments policy version (e.g. sos_policy_v1 -> sos_policy_v2).
        5. Stores the learning report and promoted policy.
        """
        history = sos_memory.get_history(limit=200)
        feedback_items = [h for h in history if h.get("feedback_outcome") is not None]

        over_escalations = [h for h in feedback_items if h.get("error_type") == "OVER_ESCALATION"]
        under_escalations = [h for h in feedback_items if h.get("error_type") == "UNDER_ESCALATION"]

        report_id = f"LRN-{uuid.uuid4().hex[:6].upper()}"
        insights: List[str] = []
        proposed_adjustments: List[str] = []
        policy_promoted = False

        current_ver_num = 1
        if "_" in self.policy_version and self.policy_version.startswith("sos_policy_v"):
            try:
                current_ver_num = int(self.policy_version.replace("sos_policy_v", ""))
            except ValueError:
                pass
        next_version = f"sos_policy_v{current_ver_num + 1}"

        if len(feedback_items) < 2:
            insights.append("Sample size too small (<2 feedback records). Continuing observation under current policy.")
            proposed_adjustments.append("No policy adjustment promoted until more simulated feedback cases are accumulated.")
            sos_memory.save_learning_report(
                report_id=report_id,
                analyzed_count=len(feedback_items),
                over_escalations=len(over_escalations),
                under_escalations=len(under_escalations),
                insights=insights,
                proposed_adjustments=proposed_adjustments,
                policy_promoted=False,
                new_policy_version=self.policy_version
            )
            return {
                "report_id": report_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "analyzed_count": len(feedback_items),
                "over_escalations": len(over_escalations),
                "under_escalations": len(under_escalations),
                "insights": insights,
                "proposed_adjustments": proposed_adjustments,
                "policy_promoted": False,
                "active_policy_version": self.policy_version,
                "mode": "SIMULATION ONLY",
                "message": "Insufficient feedback records to justify policy recalibration."
            }

        # Analyze False Positives / Over-escalations
        if len(over_escalations) > 0:
            insights.append(
                f"Identified {len(over_escalations)} OVER_ESCALATION events where single high-risk scores triggered alerts on false alarms."
            )
            proposed_adjustments.append(
                "Increase required persistence threshold or mandate multi-point corroboration for single-source detections."
            )
            # Adjust policy parameter
            self.min_persistence = max(self.min_persistence, 2)
            self.high_frp = max(self.high_frp, 18.0)
            policy_promoted = True

        # Analyze False Negatives / Under-escalations
        if len(under_escalations) > 0:
            insights.append(
                f"Identified {len(under_escalations)} UNDER_ESCALATION events where persistent or clustered detections were underweighted."
            )
            proposed_adjustments.append(
                "Lower required confidence bar when persistence >= 2 and spatial cluster >= 2 are confirmed."
            )
            self.min_confidence = max(40.0, self.min_confidence - 5.0)
            policy_promoted = True

        if not insights:
            insights.append("All analyzed feedback decisions were consistent with optimal policy bounds. Zero systemic error drift.")
            proposed_adjustments.append("Maintain current operational weights.")

        if policy_promoted:
            self.policy_version = next_version
            sos_memory.save_policy(
                version=next_version,
                reason=f"Recalibrated policy following {len(feedback_items)} feedback evaluations ({len(over_escalations)} over-escalations, {len(under_escalations)} under-escalations).",
                parameters={
                    "staleness_limit_hours": self.staleness_limit,
                    "high_frp_threshold": self.high_frp,
                    "min_persistence": self.min_persistence,
                    "min_confidence": self.min_confidence,
                    "nearby_cluster_threshold": self.nearby_cluster_threshold,
                },
                changes=proposed_adjustments
            )

        sos_memory.save_learning_report(
            report_id=report_id,
            analyzed_count=len(feedback_items),
            over_escalations=len(over_escalations),
            under_escalations=len(under_escalations),
            insights=insights,
            proposed_adjustments=proposed_adjustments,
            policy_promoted=policy_promoted,
            new_policy_version=self.policy_version
        )

        return {
            "report_id": report_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "analyzed_count": len(feedback_items),
            "over_escalations": len(over_escalations),
            "under_escalations": len(under_escalations),
            "insights": insights,
            "proposed_adjustments": proposed_adjustments,
            "policy_promoted": policy_promoted,
            "active_policy_version": self.policy_version,
            "mode": "SIMULATION ONLY",
            "message": f"Learning cycle complete. Policy updated to {self.policy_version}." if policy_promoted else "Learning cycle complete. Policy remained stable."
        }


# Global singleton agent
sos_agent = SOSAgent()
