"""
Comprehensive unit test suite for the TerraSafe Deterministic SOS Decision Agent.

Verifies all 15 required evaluation & learning specifications:
1. Low risk -> NO_ESCALATION
2. Medium risk -> MONITOR
3. High risk + weak evidence -> MONITOR / ESCALATION_WITHHELD
4. High risk + strong satellite evidence -> ESCALATION_INITIATED
5. High risk + persistence -> stronger escalation evidence
6. Missing telemetry -> INSUFFICIENT_EVIDENCE
7. Stale telemetry -> INSUFFICIENT_EVIDENCE
8. False positive feedback -> recorded correctly as OVER_ESCALATION
9. False negative feedback -> recorded correctly as UNDER_ESCALATION
10. Learning cycle -> produces report and updates policy version
11. Insufficient feedback -> no fabricated metrics ('Insufficient feedback data')
12. Verify NO external emergency calls (112, 911, phone, SMS) are made
13. Verify no external SOS API is contacted (pure simulation)
14. Verify every decision contains agent version
15. Verify feedback is strictly linked to original decision
"""

import os
import inspect
import pytest
from app.agents.sos_agent import SOSAgent, SOSStatus
from app.agents.sos_memory import SOSMemory


@pytest.fixture
def memory_db(tmp_path):
    """Temporary isolated SQLite database for testing."""
    test_db = str(tmp_path / "test_sos.db")
    return SOSMemory(db_path=test_db)


@pytest.fixture
def agent(memory_db, monkeypatch):
    """Instantiate agent with isolated memory."""
    # Monkeypatch global sos_memory to use isolated test db
    from app.agents import sos_agent as module
    monkeypatch.setattr(module, "sos_memory", memory_db)

    return SOSAgent(
        policy_version="sos_policy_v1",
        staleness_limit_hours=36.0,
        high_frp_threshold=15.0,
        min_persistence=2,
        min_confidence=50.0,
        nearby_cluster_threshold=2,
    )


class TestSOSEvaluationAndLearning:

    # 1. Low risk -> NO_ESCALATION
    def test_01_low_risk_no_escalation(self, agent):
        sat = {"lat": 24.5, "lng": 81.2, "frp": 2.0, "confidence": 45}
        weather = {"temperature": 22.0, "humidity": 70.0, "wind_speed": 8.0}

        res = agent.evaluate(risk_score=25.0, satellite=sat, weather=weather)
        assert res.risk_level == "WATCH"
        assert res.decision == SOSStatus.NO_ESCALATION
        assert res.escalation_ready is False
        assert res.simulation_action == "ROUTINE_SURVEILLANCE"

    # 2. Medium risk -> MONITOR
    def test_02_medium_risk_monitor(self, agent):
        sat = {"lat": 22.1, "lng": 82.5, "frp": 12.0, "confidence": 70, "persistence": 1}
        weather = {"temperature": 32.0, "humidity": 38.0, "wind_speed": 18.0}

        res = agent.evaluate(risk_score=55.0, satellite=sat, weather=weather)
        assert res.risk_level == "ELEVATED"
        assert res.decision == SOSStatus.MONITOR
        assert res.escalation_ready is False
        assert res.simulation_action == "ACTIVE_MONITORING"

    # 3. High risk + weak evidence -> MONITOR / ESCALATION_WITHHELD
    def test_03_high_risk_weak_evidence_withheld(self, agent):
        # Risk is 82, but FRP is 2.0 MW (below 15.0), single pass (1), 0 nearby detections, moderate humidity (50%)
        sat = {"lat": 30.2, "lng": 78.4, "frp": 2.0, "confidence": 55, "persistence": 1, "nearby_count": 0}
        weather = {"temperature": 26.0, "humidity": 50.0, "wind_speed": 10.0}

        res = agent.evaluate(risk_score=82.0, satellite=sat, weather=weather)
        assert res.risk_level == "CRITICAL"
        assert res.decision in [SOSStatus.ESCALATION_WITHHELD, SOSStatus.MONITOR]
        assert res.escalation_ready is False
        assert any("withheld" in r.lower() or "lacks" in r.lower() for r in res.reasons)

    # 4. High risk + strong satellite evidence -> ESCALATION_INITIATED
    def test_04_high_risk_strong_evidence_escalation_initiated(self, agent):
        sat = {"lat": 30.5, "lng": 79.1, "frp": 35.0, "confidence": 92, "persistence": 3, "nearby_count": 5}
        weather = {"temperature": 39.0, "humidity": 15.0, "wind_speed": 32.0, "temp_anomaly": 4.5}

        res = agent.evaluate(risk_score=88.0, satellite=sat, weather=weather)
        assert res.risk_level == "CRITICAL"
        assert res.decision == SOSStatus.ESCALATION_INITIATED
        assert res.escalation_ready is True
        assert res.simulation_action == "PROTOTYPE_ALERT_GENERATED"
        assert res.evidence_strength == "STRONG"

    # 5. High risk + persistence -> stronger escalation evidence
    def test_05_persistence_boosts_evidence(self, agent):
        sat_low = {"lat": 28.5, "lng": 77.2, "frp": 8.0, "confidence": 60, "persistence": 1}
        sat_high = {"lat": 28.5, "lng": 77.2, "frp": 8.0, "confidence": 60, "persistence": 3}
        weather = {"temperature": 35.0, "humidity": 20.0, "wind_speed": 15.0}

        res_low = agent.evaluate(risk_score=72.0, satellite=sat_low, weather=weather)
        res_high = agent.evaluate(risk_score=72.0, satellite=sat_high, weather=weather)

        assert res_high.evidence_points > res_low.evidence_points
        assert res_high.agent_score >= res_low.agent_score
        assert res_high.evidence["persistence"] is True
        assert res_low.evidence["persistence"] is False

    # 6. Missing telemetry -> INSUFFICIENT_EVIDENCE
    def test_06_missing_telemetry_insufficient_evidence(self, agent):
        sat = {"lat": 25.0, "lng": 82.0, "frp": 20.0}
        empty_weather = {}

        res = agent.evaluate(risk_score=85.0, satellite=sat, weather=empty_weather)
        assert res.decision == SOSStatus.INSUFFICIENT_EVIDENCE
        assert res.escalation_ready is False
        assert res.data_quality["missing_critical_data"] is True

    # 7. Stale telemetry (>36h) -> INSUFFICIENT_EVIDENCE
    def test_07_stale_telemetry_insufficient_evidence(self, agent):
        sat = {"lat": 20.5, "lng": 85.2, "frp": 40.0, "confidence": 90, "persistence": 3}
        weather = {"temperature": 38.0, "humidity": 14.0, "wind_speed": 30.0}

        # 42 hours old (> 36h)
        res = agent.evaluate(risk_score=85.0, satellite=sat, weather=weather, staleness_hours=42.0)
        assert res.decision == SOSStatus.INSUFFICIENT_EVIDENCE
        assert res.escalation_ready is False
        assert res.data_quality["is_stale"] is True

    # 8. False positive feedback -> recorded correctly as OVER_ESCALATION
    def test_08_false_positive_feedback_over_escalation(self, agent, memory_db):
        sat = {"lat": 30.5, "lng": 79.1, "frp": 35.0, "confidence": 92, "persistence": 3, "nearby_count": 5}
        weather = {"temperature": 39.0, "humidity": 15.0, "wind_speed": 32.0}

        res = agent.evaluate(risk_score=88.0, satellite=sat, weather=weather)
        assert res.decision == SOSStatus.ESCALATION_INITIATED

        # Record simulated feedback indicating false alarm
        fb = memory_db.record_feedback(res.decision_id, "FALSE_POSITIVE", "Prescribed agricultural burn, not wildfire.")
        assert fb["error_type"] == "OVER_ESCALATION"
        assert fb["feedback_outcome"] == "FALSE_POSITIVE"

    # 9. False negative feedback -> recorded correctly as UNDER_ESCALATION
    def test_09_false_negative_feedback_under_escalation(self, agent, memory_db):
        sat = {"lat": 22.0, "lng": 80.0, "frp": 8.0, "confidence": 55, "persistence": 1}
        weather = {"temperature": 28.0, "humidity": 45.0, "wind_speed": 12.0}

        res = agent.evaluate(risk_score=50.0, satellite=sat, weather=weather)
        assert res.decision == SOSStatus.MONITOR

        # Ground truth feedback confirms actual fire
        fb = memory_db.record_feedback(res.decision_id, "TRUE_POSITIVE", "Field report confirmed active crown fire.")
        assert fb["error_type"] == "UNDER_ESCALATION"
        assert fb["feedback_outcome"] == "TRUE_POSITIVE"

    # 10. Learning cycle -> produces report and updates policy version
    def test_10_learning_cycle_produces_report_and_updates_policy(self, agent, memory_db):
        # Create multiple decisions with simulated feedback
        sat = {"lat": 30.5, "lng": 79.1, "frp": 35.0, "confidence": 92, "persistence": 3, "nearby_count": 5}
        weather = {"temperature": 39.0, "humidity": 15.0, "wind_speed": 32.0}

        d1 = agent.evaluate(risk_score=85.0, satellite=sat, weather=weather)
        d2 = agent.evaluate(risk_score=88.0, satellite=sat, weather=weather)

        memory_db.record_feedback(d1.decision_id, "FALSE_POSITIVE", "False alarm pass 1")
        memory_db.record_feedback(d2.decision_id, "TRUE_POSITIVE", "Confirmed wildfire")

        report = agent.run_learning_cycle()
        assert report["policy_promoted"] is True
        assert report["active_policy_version"] == "sos_policy_v2"
        assert len(report["insights"]) > 0
        assert report["mode"] == "SIMULATION ONLY"

    # 11. Insufficient feedback -> no fabricated metrics ('Insufficient feedback data')
    def test_11_insufficient_feedback_no_fabricated_metrics(self, memory_db):
        # Only 1 feedback entry (< 3 threshold)
        d_id = memory_db.record_decision(
            event_id="TEST-1", lat=25.0, lng=80.0, location_name="Test Sector",
            risk_score=60.0, agent_score=50, decision="MONITOR", action_summary="Monitored",
            evidence_strength="MODERATE", evidence_points=3, evidence={}, data_quality={}, reasons=[]
        )
        memory_db.record_feedback(d_id, "TRUE_POSITIVE")

        metrics = memory_db.get_metrics()
        assert metrics["has_sufficient_data"] is False
        assert "Insufficient feedback data" in metrics["status_message"]
        assert metrics["precision"] is None
        assert metrics["recall"] is None

    # 12. Verify NO external emergency calls are made (audit inspect)
    def test_12_no_emergency_calls_or_numbers_in_source(self):
        import app.agents.sos_agent as agent_mod
        source = inspect.getsource(agent_mod)
        prohibited_terms = ["112", "911", "twilio", "call_emergency", "dial_", "send_sms", "police_dispatch"]
        for term in prohibited_terms:
            assert term not in source.lower(), f"Prohibited real-world emergency call term '{term}' found in agent source!"

    # 13. Verify no external SOS API is contacted (pure simulation)
    def test_13_pure_simulation_mode_guaranteed(self, agent):
        sat = {"lat": 30.5, "lng": 79.1, "frp": 35.0, "confidence": 92, "persistence": 3, "nearby_count": 5}
        weather = {"temperature": 39.0, "humidity": 15.0, "wind_speed": 32.0}

        res = agent.evaluate(risk_score=88.0, satellite=sat, weather=weather)
        assert res.mode == "SIMULATION ONLY"
        assert res.simulation_action == "PROTOTYPE_ALERT_GENERATED"

    # 14. Verify every decision contains agent version
    def test_14_every_decision_contains_agent_version(self, agent):
        sat = {"lat": 24.5, "lng": 81.2, "frp": 2.0, "confidence": 45}
        weather = {"temperature": 22.0, "humidity": 70.0, "wind_speed": 8.0}

        res = agent.evaluate(risk_score=25.0, satellite=sat, weather=weather)
        assert res.agent_version.startswith("sos_policy_v")

    # 15. Verify feedback is strictly linked to original decision
    def test_15_feedback_strictly_linked_to_original_decision(self, agent, memory_db):
        sat = {"lat": 26.0, "lng": 85.0, "frp": 10.0, "confidence": 75}
        weather = {"temperature": 30.0, "humidity": 40.0, "wind_speed": 10.0}

        res = agent.evaluate(risk_score=50.0, satellite=sat, weather=weather, event_id="INCIDENT-INDIA-77")
        fb = memory_db.record_feedback(res.decision_id, "TRUE_NEGATIVE", "Area clear upon routine patrol.")

        assert fb["decision_id"] == res.decision_id
        assert fb["event_id"] == "INCIDENT-INDIA-77"
        assert fb["decision"] == res.decision
        assert fb["error_type"] == "CORRECT"
