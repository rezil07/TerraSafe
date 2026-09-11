"""
Unit tests for the Deterministic SOS Safety Agent.
Directly verifies all 7 explicit safety rules:
1. Low risk -> no escalation
2. Medium risk -> monitor
3. High risk but weak evidence -> escalation blocked (monitor)
4. High risk + strong persistent evidence -> escalation initiated
5. Stale data (>36h) -> insufficient evidence
6. Missing critical evidence -> no escalation / insufficient evidence
7. Multiple nearby detections -> stronger supporting evidence points
"""

import pytest
from app.agents.sos_agent import SOSAgent, SOSStatus


@pytest.fixture
def agent():
    return SOSAgent(
        staleness_limit_hours=36.0,
        high_frp_threshold=15.0,
        min_persistence=2,
        min_confidence=50.0,
    )


class TestSOSAgentRules:

    # 1. Low risk -> no escalation
    def test_rule_1_low_risk_no_escalation(self, agent):
        sat = {"lat": 24.5, "lng": 81.2, "frp": 2.0, "confidence": 45}
        weather = {"temperature": 22.0, "humidity": 70.0, "wind_speed": 8.0}

        result = agent.evaluate(risk_score=25.0, satellite=sat, weather=weather)
        assert result.risk_level == "WATCH"
        assert result.sos_status == SOSStatus.NO_ESCALATION
        assert result.escalation_ready is False

    # 2. Medium risk -> monitor
    def test_rule_2_medium_risk_monitor(self, agent):
        sat = {"lat": 22.1, "lng": 82.5, "frp": 12.0, "confidence": 70, "persistence": 1}
        weather = {"temperature": 32.0, "humidity": 38.0, "wind_speed": 18.0}

        result = agent.evaluate(risk_score=55.0, satellite=sat, weather=weather)
        assert result.risk_level == "ELEVATED"
        assert result.sos_status == SOSStatus.MONITOR
        assert result.escalation_ready is False

    # 3. High risk but weak evidence -> no escalation (held at monitor)
    def test_rule_3_high_risk_weak_evidence_blocks_escalation(self, agent):
        # Risk score is artificially high (82), but FRP is tiny (2.0 MW), single pass (1),
        # no nearby detections (0), and moderate humidity (50%)
        sat = {
            "lat": 30.2, "lng": 78.4,
            "frp": 2.0,
            "confidence": 55,
            "persistence": 1,
            "nearby_count": 0
        }
        weather = {"temperature": 26.0, "humidity": 50.0, "wind_speed": 10.0}

        result = agent.evaluate(risk_score=82.0, satellite=sat, weather=weather)
        assert result.risk_level == "CRITICAL"
        # Escalation is withheld because evidence is not corroborated
        assert result.sos_status == SOSStatus.MONITOR
        assert result.escalation_ready is False
        assert any("withheld" in r.lower() or "lacks" in r.lower() for r in result.reasons)

    # 4. High risk + strong persistent evidence -> escalation
    def test_rule_4_high_risk_strong_evidence_escalates(self, agent):
        # Critical risk (88) with high FRP (35 MW), persistence (3 passes), dry weather (15% humidity), high wind (32 km/h)
        sat = {
            "lat": 30.5, "lng": 79.1,
            "frp": 35.0,
            "confidence": 92,
            "persistence": 3,
            "nearby_count": 5
        }
        weather = {
            "temperature": 39.0,
            "humidity": 15.0,
            "wind_speed": 32.0,
            "temp_anomaly": 4.5
        }

        result = agent.evaluate(risk_score=88.0, satellite=sat, weather=weather)
        assert result.risk_level == "CRITICAL"
        assert result.sos_status == SOSStatus.ESCALATION_INITIATED
        assert result.escalation_ready is True
        assert result.evidence_strength == "STRONG"

    # 5. Stale data -> insufficient evidence
    def test_rule_5_stale_data_insufficient_evidence(self, agent):
        sat = {"lat": 20.5, "lng": 85.2, "frp": 40.0, "confidence": 90, "persistence": 3}
        weather = {"temperature": 38.0, "humidity": 14.0, "wind_speed": 30.0}

        # Observation is 48 hours old (> 36h limit)
        result = agent.evaluate(
            risk_score=85.0,
            satellite=sat,
            weather=weather,
            staleness_hours=48.0
        )
        assert result.sos_status == SOSStatus.INSUFFICIENT_EVIDENCE
        assert result.escalation_ready is False
        assert result.data_quality["is_stale"] is True

    # 6. Missing critical evidence -> no escalation
    def test_rule_6_missing_critical_evidence_no_escalation(self, agent):
        sat = {"lat": 29.5, "lng": 79.5, "frp": 25.0, "confidence": 85}
        empty_weather = {}  # Missing weather telemetry completely

        result = agent.evaluate(risk_score=78.0, satellite=sat, weather=empty_weather)
        assert result.sos_status != SOSStatus.ESCALATION_INITIATED
        assert result.escalation_ready is False
        assert result.data_quality["missing_critical_data"] is True

    # 7. Multiple nearby detections -> stronger supporting evidence
    def test_rule_7_multiple_nearby_detections_boosts_evidence(self, agent):
        single_sat = {"lat": 21.5, "lng": 86.0, "frp": 10.0, "confidence": 80, "nearby_count": 0}
        cluster_sat = {"lat": 21.5, "lng": 86.0, "frp": 10.0, "confidence": 80, "nearby_count": 6}
        weather = {"temperature": 34.0, "humidity": 24.0, "wind_speed": 22.0}

        res_single = agent.evaluate(risk_score=60.0, satellite=single_sat, weather=weather)
        res_cluster = agent.evaluate(risk_score=60.0, satellite=cluster_sat, weather=weather)

        assert res_cluster.evidence_points > res_single.evidence_points
        assert any("High cluster density" in r for r in res_cluster.reasons)

