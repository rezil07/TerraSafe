"""
Unit tests for the TerraSafe ML Data & Inference Pipeline.
Tests coordinate validation, confidence normalization, temperature anomalies,
feature vector construction, prediction normalization, and threshold consistency.
"""

import pytest
import numpy as np

from app.core.config import settings
from app.ml.preprocessing import (
    is_in_india,
    normalize_confidence,
    compute_seasonal_temp_anomaly,
    compute_humidity_deficit,
    compute_staleness_hours
)
from app.ml.features import (
    FEATURE_COLUMNS,
    extract_features_from_inputs,
    feature_dict_to_vector,
    get_landcover_risk
)
from app.ml.predict import predict_risk_score, compute_contributing_factors


class TestMLPreprocessing:

    def test_india_bounding_box(self):
        # Valid Indian locations
        assert is_in_india(28.6139, 77.2090) is True   # New Delhi
        assert is_in_india(30.3165, 78.0322) is True   # Dehradun, Uttarakhand
        assert is_in_india(11.9416, 79.8083) is True   # Puducherry, South India
        assert is_in_india(21.7645, 86.4674) is True   # Simlipal, Odisha

        # Outside India
        assert is_in_india(37.7749, -122.4194) is False  # San Francisco, USA
        assert is_in_india(51.5074, -0.1278) is False    # London, UK
        assert is_in_india(-33.8688, 151.2093) is False  # Sydney, Australia

    def test_normalize_confidence(self):
        assert normalize_confidence("high") == 95.0
        assert normalize_confidence("h") == 95.0
        assert normalize_confidence("nominal") == 75.0
        assert normalize_confidence("n") == 75.0
        assert normalize_confidence("low") == 30.0
        assert normalize_confidence("l") == 30.0
        assert normalize_confidence(84) == 84.0
        assert normalize_confidence(105) == 100.0
        assert normalize_confidence(-10) == 0.0
        assert normalize_confidence(None) == 50.0

    def test_seasonal_temp_anomaly(self):
        # In May (summer), baseline for central India is ~36°C
        anomaly_hot = compute_seasonal_temp_anomaly(20.0, 78.0, 42.0, month=5)
        assert anomaly_hot == 6.0  # +6°C above norm

        # In January (winter), baseline for central India is ~21°C
        anomaly_cool = compute_seasonal_temp_anomaly(20.0, 78.0, 18.0, month=1)
        assert anomaly_cool == -3.0

    def test_humidity_deficit(self):
        # 15% humidity -> 40% deficit
        assert compute_humidity_deficit(15.0) == 40.0
        # 70% humidity -> -15% deficit (favorable moist conditions)
        assert compute_humidity_deficit(70.0) == -15.0


class TestFeatureExtraction:

    def test_feature_vector_dimension_and_order(self):
        satellite = {
            "lat": 30.3,
            "lng": 78.5,
            "bright_ti4": 345.0,
            "frp": 28.5,
            "confidence": "high",
            "nearby_count": 4,
            "persistence": 2
        }
        weather = {
            "temperature": 38.0,
            "humidity": 18.0,
            "wind_speed": 28.0,
            "wind_direction": 315.0,
            "rainfall": 0.0,
            "dry_days": 12
        }
        landcover = {"type": "dense_forest"}
        geo = {"elevation": 1200.0, "slope": 14.0, "dist_to_settlement_km": 8.5}

        f_dict = extract_features_from_inputs(satellite, weather, landcover, geo)

        assert len(f_dict) == len(FEATURE_COLUMNS)
        for col in FEATURE_COLUMNS:
            assert col in f_dict

        vec = feature_dict_to_vector(f_dict)
        assert isinstance(vec, np.ndarray)
        assert vec.shape == (len(FEATURE_COLUMNS),)
        assert not np.isnan(vec).any()

    def test_landcover_risk_mapping(self):
        assert get_landcover_risk("dense_forest") > get_landcover_risk("cropland")
        assert get_landcover_risk("cropland") > get_landcover_risk("urban")
        assert get_landcover_risk("water") == 0.0


class TestPredictionEngine:

    def test_predict_risk_score_bounds(self):
        # Test extreme high danger inputs
        high_danger_sat = {"lat": 29.5, "lng": 79.2, "bright_ti4": 370.0, "frp": 65.0, "confidence": 95}
        high_danger_weather = {"temperature": 42.0, "humidity": 12.0, "wind_speed": 40.0}

        res_high = predict_risk_score(high_danger_sat, high_danger_weather, {"type": "forest"})
        assert 0.0 <= res_high["risk_score"] <= 100.0
        assert res_high["risk_score"] >= settings.THRESHOLD_CRITICAL_MIN
        assert res_high["risk_level"] == "CRITICAL"

        # Test extreme low danger inputs
        low_danger_sat = {"lat": 18.5, "lng": 73.8, "bright_ti4": 295.0, "frp": 1.2, "confidence": 30}
        low_danger_weather = {"temperature": 22.0, "humidity": 85.0, "wind_speed": 6.0, "rainfall": 25.0}

        res_low = predict_risk_score(low_danger_sat, low_danger_weather, {"type": "water"})
        assert 0.0 <= res_low["risk_score"] <= 100.0
        assert res_low["risk_score"] <= settings.THRESHOLD_WATCH_MAX
        assert res_low["risk_level"] == "WATCH"

    def test_contributing_factors_sum(self):
        f_dict = {
            "frp": 25.0,
            "temperature": 36.0,
            "relative_humidity": 18.0,
            "wind_speed": 30.0,
            "landcover_risk": 9.0,
            "slope": 12.0
        }
        factors = compute_contributing_factors(f_dict)
        assert len(factors) > 0
        total_pct = sum(f["percentage"] for f in factors)
        assert total_pct == 100

