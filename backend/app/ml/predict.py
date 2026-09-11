"""
TerraSafe ML Prediction & Explainable Risk Scoring Engine.
Transforms multi-signal inputs into normalized 0-100 Risk Scores
with evidence attribution and contributing factors.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import numpy as np

from app.core.config import settings
from app.ml.features import FEATURE_COLUMNS, extract_features_from_inputs, feature_dict_to_vector

MODEL_DIR = Path(__file__).resolve().parent / "model"
MODEL_PATH = MODEL_DIR / "terrasafe_rf_model.joblib"
METADATA_PATH = MODEL_DIR / "model_metadata.json"

_CACHED_MODEL = None
_CACHED_METADATA = None


def get_model():
    """Load and cache calibrated Random Forest model."""
    global _CACHED_MODEL
    if _CACHED_MODEL is None and MODEL_PATH.exists():
        try:
            _CACHED_MODEL = joblib.load(MODEL_PATH)
        except Exception as e:
            print(f"Warning: Could not load trained model: {e}")
    return _CACHED_MODEL


def get_metadata() -> Dict[str, Any]:
    """Load model training metadata."""
    global _CACHED_METADATA
    if _CACHED_METADATA is None and METADATA_PATH.exists():
        try:
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                _CACHED_METADATA = json.load(f)
        except Exception:
            _CACHED_METADATA = {}
    return _CACHED_METADATA or {}


def compute_contributing_factors(feature_dict: Dict[str, float]) -> List[Dict[str, Any]]:
    """
    Compute explainable contributing factors driving the current risk score.
    Returns ranked percentage contributions totaling 100%.
    """
    metadata = get_metadata()
    importances = metadata.get("feature_importances", {})

    # Heuristic importance weights if metadata not yet written
    default_weights = {
        "frp": 0.22,
        "temperature": 0.18,
        "relative_humidity": 0.18,
        "wind_speed": 0.14,
        "landcover_risk": 0.10,
        "dry_days": 0.08,
        "nearby_detection_count": 0.06,
        "slope": 0.04
    }

    raw_scores = {}
    # 1. Weather / Wind impact
    wind = feature_dict.get("wind_speed", 15.0)
    wind_impact = min(1.0, wind / 45.0) * importances.get("wind_speed", default_weights["wind_speed"])
    raw_scores["Wind Speed"] = wind_impact

    # 2. Moisture / Fuel dryness impact
    humidity = feature_dict.get("relative_humidity", 50.0)
    dryness = max(0.0, (60.0 - humidity) / 55.0)
    humidity_impact = dryness * importances.get("relative_humidity", default_weights["relative_humidity"])
    raw_scores["Fuel Moisture Deficit"] = humidity_impact

    # 3. Ambient heat & anomaly
    temp = feature_dict.get("temperature", 28.0)
    temp_impact = max(0.0, (temp - 20.0) / 25.0) * importances.get("temperature", default_weights["temperature"])
    raw_scores["Ambient Temperature"] = temp_impact

    # 4. Thermal intensity / FRP
    frp = feature_dict.get("frp", 10.0)
    frp_impact = min(1.0, frp / 60.0) * importances.get("frp", default_weights["frp"])
    raw_scores["Thermal Signature (FRP)"] = frp_impact

    # 5. Land cover fuel bed
    lc_risk = feature_dict.get("landcover_risk", 5.0)
    lc_impact = (lc_risk / 10.0) * importances.get("landcover_risk", default_weights["landcover_risk"])
    raw_scores["Vegetation Flammability"] = lc_impact

    # 6. Terrain slope
    slope = feature_dict.get("slope", 5.0)
    slope_impact = min(1.0, slope / 30.0) * importances.get("slope", default_weights["slope"])
    raw_scores["Terrain Slope"] = slope_impact

    total = sum(raw_scores.values()) or 1.0
    factors = [
        {"label": k, "percentage": int(round((v / total) * 100))}
        for k, v in raw_scores.items()
    ]
    # Sort descending by contribution percentage
    factors.sort(key=lambda x: x["percentage"], reverse=True)

    # Adjust rounding sum to exactly 100
    cur_sum = sum(f["percentage"] for f in factors)
    if factors and cur_sum != 100:
        factors[0]["percentage"] += (100 - cur_sum)

    return factors


def generate_evidence_summary(feature_dict: Dict[str, float], risk_score: float) -> List[str]:
    """
    Generate an explainable, fact-based evidence checklist
    explaining why the risk is assessed as WATCH, ELEVATED, or CRITICAL.
    """
    evidence = []

    # Satellite evidence
    frp = feature_dict.get("frp", 0.0)
    conf = feature_dict.get("confidence", 50.0)
    nearby = feature_dict.get("nearby_detection_count", 0)
    persistence = feature_dict.get("detection_persistence", 1)

    if frp >= 20.0:
        evidence.append(f"Strong thermal intensity (FRP: {frp:.1f} MW)")
    elif frp >= 8.0:
        evidence.append(f"Moderate thermal signature (FRP: {frp:.1f} MW)")
    else:
        evidence.append(f"Low thermal radiation (FRP: {frp:.1f} MW)")

    if nearby >= 3:
        evidence.append(f"Multiple nearby detections ({int(nearby)} clusters within 25km)")
    elif nearby == 1:
        evidence.append("Isolated thermal detection")

    if persistence >= 2:
        evidence.append(f"Persistent activity detected across {int(persistence)} passes")

    if conf >= 80:
        evidence.append(f"High satellite detection confidence ({conf:.0f}%)")

    # Weather evidence
    temp = feature_dict.get("temperature", 25.0)
    temp_anomaly = feature_dict.get("temp_anomaly", 0.0)
    humidity = feature_dict.get("relative_humidity", 50.0)
    wind = feature_dict.get("wind_speed", 15.0)

    if temp_anomaly >= 2.5:
        evidence.append(f"Positive temperature anomaly (+{temp_anomaly:.1f}°C above seasonal norm)")
    elif temp >= 35.0:
        evidence.append(f"Elevated ambient temperature ({temp:.1f}°C)")

    if humidity <= 25.0:
        evidence.append(f"Critically dry atmospheric humidity ({humidity:.0f}%)")
    elif humidity <= 40.0:
        evidence.append(f"Dry ambient humidity ({humidity:.0f}%)")
    else:
        evidence.append(f"Favorable damp humidity ({humidity:.0f}%) - suppresses spread")

    if wind >= 30.0:
        evidence.append(f"High wind speed ({wind:.0f} km/h) capable of rapid fire spread")

    # Land cover
    lc_risk = feature_dict.get("landcover_risk", 5.0)
    if lc_risk >= 8.0:
        evidence.append("High-risk flammable forest/shrub fuel bed")
    elif lc_risk <= 2.0:
        evidence.append("Low flammability land cover (barren/urban/water)")

    return evidence


def predict_risk_score(
    satellite: Dict[str, Any],
    weather: Dict[str, Any],
    landcover: Optional[Dict[str, Any]] = None,
    geo: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Core prediction endpoint.
    Computes normalized 0-100 Risk Score using Random Forest,
    classifies into configurable levels, and generates explainability factors.
    """
    feature_dict = extract_features_from_inputs(satellite, weather, landcover, geo)
    vector = feature_dict_to_vector(feature_dict).reshape(1, -1)
    import pandas as pd
    df_features = pd.DataFrame(vector, columns=FEATURE_COLUMNS)

    model = get_model()
    if model is not None:
        try:
            # Calibrated probability of high wildfire danger
            prob = float(model.predict_proba(df_features)[0, 1])
            risk_score = round(float(np.clip(prob * 100.0, 0.0, 100.0)), 1)
        except Exception as e:
            print(f"Inference error with model, using empirical fallback: {e}")
            risk_score = _empirical_risk_score(feature_dict)
    else:
        risk_score = _empirical_risk_score(feature_dict)

    # Classify according to centralized thresholds
    risk_level = settings.get_risk_level(risk_score)

    contributing_factors = compute_contributing_factors(feature_dict)
    evidence = generate_evidence_summary(feature_dict, risk_score)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "features": feature_dict,
        "contributing_factors": contributing_factors,
        "evidence": evidence,
        "model_version": settings.APP_VERSION,
    }


def _empirical_risk_score(f: Dict[str, float]) -> float:
    """Fallback empirical scoring matching Indian forest fire danger indices."""
    score = 0.0
    # FRP contribution (up to 30 pts)
    score += min(30.0, (f.get("frp", 10.0) / 40.0) * 30.0)
    # Humidity contribution (up to 25 pts for dry air)
    score += max(0.0, (60.0 - f.get("relative_humidity", 50.0)) / 50.0 * 25.0)
    # Temperature contribution (up to 20 pts)
    score += max(0.0, (f.get("temperature", 28.0) - 20.0) / 22.0 * 20.0)
    # Wind contribution (up to 15 pts)
    score += min(15.0, (f.get("wind_speed", 15.0) / 40.0) * 15.0)
    # Land cover (up to 10 pts)
    score += (f.get("landcover_risk", 5.0) / 10.0) * 10.0

    return round(float(np.clip(score, 0.0, 100.0)), 1)
