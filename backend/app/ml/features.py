"""
TerraSafe Feature Engineering Module.
Builds feature vectors combining satellite observations, weather metrics,
land cover vulnerability, and spatial context for Random Forest scoring.
"""

from typing import Dict, Any, List, Optional
import numpy as np
from app.ml.preprocessing import (
    normalize_confidence,
    compute_seasonal_temp_anomaly,
    compute_humidity_deficit
)

# Canonical list of ordered feature names
FEATURE_COLUMNS = [
    "bright_ti4",               # Satellite thermal band (Kelvin)
    "frp",                      # Fire Radiative Power (MW)
    "confidence",               # Normalized confidence (0-100)
    "nearby_detection_count",   # Cluster count within 25km radius
    "detection_persistence",    # Observation passes / persistence level (1-5)
    "temperature",              # Ambient temperature (°C)
    "relative_humidity",        # Relative humidity (%)
    "wind_speed",               # Wind speed (km/h)
    "wind_direction",           # Wind direction (0-360 degrees)
    "precipitation",            # Rainfall past 24h (mm)
    "dry_days",                 # Consecutive dry days
    "temp_anomaly",             # Climatological temperature anomaly (°C)
    "humidity_deficit",         # Humidity deficit from comfortable baseline (%)
    "landcover_risk",           # Land cover hazard index (0-10 scale)
    "elevation",                # Elevation (meters)
    "slope",                    # Terrain slope (degrees)
    "dist_to_settlement_km",    # Distance to nearest human settlement (km)
    "historical_frequency"      # Historical fire frequency rating (0.0-1.0)
]

# Land cover risk scores (0 to 10 scale based on fuel vulnerability)
LANDCOVER_RISK_MAP = {
    "dense_forest": 9.5,
    "forest": 8.5,
    "deciduous_forest": 9.0,
    "evergreen_forest": 7.5,
    "shrubland": 7.5,
    "grassland": 8.0,
    "savanna": 8.5,
    "cropland": 5.0,
    "agricultural": 4.5,
    "barren": 2.0,
    "urban": 1.0,
    "wetland": 0.5,
    "water": 0.0,
}


def get_landcover_risk(landcover_type: Optional[str]) -> float:
    """Map landcover classification to a vulnerability index."""
    if not landcover_type:
        return 5.0  # Moderate default
    key = str(landcover_type).strip().lower().replace(" ", "_").replace("-", "_")
    return LANDCOVER_RISK_MAP.get(key, 5.0)


def extract_features_from_inputs(
    satellite: Dict[str, Any],
    weather: Dict[str, Any],
    landcover: Optional[Dict[str, Any]] = None,
    geo: Optional[Dict[str, Any]] = None
) -> Dict[str, float]:
    """
    Extract a dictionary of named features from raw multi-source signals.
    """
    landcover = landcover or {}
    geo = geo or {}

    # 1. Satellite features
    bright_ti4 = float(satellite.get("bright_ti4", satellite.get("brightness", 320.0)))
    frp = float(satellite.get("frp", 10.0))
    conf = normalize_confidence(satellite.get("confidence", 75))
    nearby = float(satellite.get("nearby_detection_count", satellite.get("nearby_count", 1)))
    persistence = float(satellite.get("detection_persistence", satellite.get("persistence", 1)))

    # 2. Weather features
    temp = float(weather.get("temperature", 30.0))
    humidity = float(weather.get("humidity", 40.0))
    wind_spd = float(weather.get("windSpeed", weather.get("wind_speed", 15.0)))
    wind_dir = float(weather.get("windDirection", weather.get("wind_direction", 180.0)))
    precip = float(weather.get("rainfall", weather.get("precipitation", 0.0)))
    dry_days = float(weather.get("dry_days", 7.0 if precip == 0 else 0.0))

    lat = float(satellite.get("lat", satellite.get("latitude", 22.0)))
    lng = float(satellite.get("lng", satellite.get("longitude", 78.0)))
    temp_anomaly = compute_seasonal_temp_anomaly(lat, lng, temp)
    humidity_def = compute_humidity_deficit(humidity)

    # 3. Land cover features
    lc_type = landcover.get("type", landcover.get("landcover_type", "forest"))
    lc_risk = get_landcover_risk(lc_type)

    # 4. Geographic context
    elevation = float(geo.get("elevation", 450.0))
    slope = float(geo.get("slope", 8.0))
    dist_settlement = float(geo.get("dist_to_settlement_km", 12.0))
    hist_freq = float(geo.get("historical_frequency", 0.55))

    return {
        "bright_ti4": round(bright_ti4, 2),
        "frp": round(frp, 2),
        "confidence": round(conf, 1),
        "nearby_detection_count": nearby,
        "detection_persistence": persistence,
        "temperature": round(temp, 1),
        "relative_humidity": round(humidity, 1),
        "wind_speed": round(wind_spd, 1),
        "wind_direction": round(wind_dir, 1),
        "precipitation": round(precip, 2),
        "dry_days": dry_days,
        "temp_anomaly": temp_anomaly,
        "humidity_deficit": humidity_def,
        "landcover_risk": lc_risk,
        "elevation": elevation,
        "slope": slope,
        "dist_to_settlement_km": dist_settlement,
        "historical_frequency": hist_freq,
    }


def feature_dict_to_vector(features: Dict[str, float]) -> np.ndarray:
    """Convert feature dictionary to ordered numpy 1D vector."""
    return np.array([features.get(col, 0.0) for col in FEATURE_COLUMNS], dtype=np.float32)

