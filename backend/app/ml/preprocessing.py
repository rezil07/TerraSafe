"""
TerraSafe ML Preprocessing Module.
Handles coordinate validation, satellite detection normalization,
time feature extraction, and missing data imputation.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
import numpy as np
from app.core.config import settings


def is_in_india(lat: float, lng: float) -> bool:
    """Validate if coordinates fall within the monitored Indian subcontinent bounding box."""
    bbox = settings.INDIA_BBOX
    return (bbox["min_lat"] <= lat <= bbox["max_lat"]) and (bbox["min_lng"] <= lng <= bbox["max_lng"])


def normalize_confidence(conf_val: Any) -> float:
    """
    Normalize satellite confidence value to 0-100 float scale.
    Handles VIIRS ('low', 'nominal', 'high') and MODIS (0-100 int/float).
    """
    if conf_val is None or conf_val == "":
        return 50.0  # Default neutral confidence

    if isinstance(conf_val, (int, float)):
        return float(np.clip(conf_val, 0.0, 100.0))

    val_str = str(conf_val).strip().lower()
    if val_str == "high" or val_str == "h":
        return 95.0
    elif val_str == "nominal" or val_str == "n":
        return 75.0
    elif val_str == "low" or val_str == "l":
        return 30.0

    try:
        num = float(val_str)
        return float(np.clip(num, 0.0, 100.0))
    except ValueError:
        return 50.0


def parse_firms_timestamp(acq_date: str, acq_time: str) -> datetime:
    """
    Convert NASA FIRMS acq_date ('YYYY-MM-DD') and acq_time ('HHMM' or 'HMM')
    into a timezone-aware UTC datetime.
    """
    time_str = str(acq_time).strip().zfill(4)
    dt_str = f"{acq_date.strip()} {time_str}"
    try:
        dt = datetime.strptime(dt_str, "%Y-%m-%d %H%M")
        return dt.replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def compute_staleness_hours(timestamp: datetime) -> float:
    """Calculate hours elapsed between acquisition time and current UTC time."""
    now = datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    delta = now - timestamp
    return max(0.0, delta.total_seconds() / 3600.0)


def compute_seasonal_temp_anomaly(lat: float, lng: float, temp_c: float, month: Optional[int] = None) -> float:
    """
    Calculate temperature anomaly relative to expected monthly climatology in India.
    Baseline expected temperatures vary by latitude zone (North, Central, South).
    """
    if month is None:
        month = datetime.now(timezone.utc).month

    # Baseline monthly temperature curve for Central India (approx 20°N)
    # Jan: 21°C, May: 36°C, Aug: 28°C, Dec: 20°C
    central_baselines = {
        1: 21.0, 2: 24.0, 3: 29.0, 4: 33.5, 5: 36.0, 6: 33.0,
        7: 29.0, 8: 28.0, 9: 28.5, 10: 27.5, 11: 24.0, 12: 20.5
    }
    base = central_baselines.get(month, 28.0)

    # Latitude adjustment: Northern latitudes are cooler in winter, Southern latitudes are more tropical
    if lat > 26.0:  # Northern (e.g. Uttarakhand, Himachal)
        base -= 4.0
    elif lat < 14.0:  # Southern (e.g. Kerala, Tamil Nadu)
        base = max(base, 27.0)

    anomaly = temp_c - base
    return round(float(anomaly), 2)


def compute_humidity_deficit(humidity_pct: float) -> float:
    """
    Compute relative humidity deficit.
    Under 30% is critical fire weather; baseline comfortable humidity is ~55%.
    """
    deficit = 55.0 - humidity_pct
    return round(float(np.clip(deficit, -40.0, 55.0)), 2)

