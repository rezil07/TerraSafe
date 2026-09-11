"""
Integration tests for FastAPI endpoints.
Verifies response codes, JSON schemas, and safety evaluation API contracts.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "operational"
        assert "version" in data


@pytest.mark.asyncio
async def test_dashboard_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/dashboard")
        assert res.status_code == 200
        data = res.json()
        assert "activeCount" in data
        assert "avgRisk" in data
        assert "fireEvents" in data
        assert "activeAlerts" in data
        assert len(data["fireEvents"]) > 0


@pytest.mark.asyncio
async def test_fires_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/fires")
        assert res.status_code == 200
        events = res.json()
        assert isinstance(events, list)
        assert len(events) > 0
        first = events[0]
        assert "id" in first
        assert "lat" in first
        assert "lng" in first
        assert "riskScore" in first
        assert "sosStatus" in first


@pytest.mark.asyncio
async def test_risk_analysis_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/risk?lat=29.38&lng=79.46&frp=35.0")
        assert res.status_code == 200
        data = res.json()
        assert "risk_score" in data
        assert "risk_level" in data
        assert "contributing_factors" in data
        assert "evidence" in data
        assert 0.0 <= data["risk_score"] <= 100.0


@pytest.mark.asyncio
async def test_states_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/states")
        assert res.status_code == 200
        states = res.json()
        assert isinstance(states, list)
        assert len(states) > 0


@pytest.mark.asyncio
async def test_sos_evaluate_post_endpoint():
    payload = {
        "risk_score": 88.0,
        "satellite": {
            "lat": 30.5,
            "lng": 79.1,
            "frp": 42.0,
            "confidence": 92.0,
            "persistence": 3,
            "nearby_count": 5
        },
        "weather": {
            "temperature": 38.0,
            "humidity": 14.0,
            "wind_speed": 32.0,
            "temp_anomaly": 4.0
        },
        "staleness_hours": 2.5
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/sos/evaluate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["sos_status"] == "ESCALATION_INITIATED"
        assert data["escalation_ready"] is True
        assert "reasons" in data

