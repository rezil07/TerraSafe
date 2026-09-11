"""
TerraSafe Land Cover Classification Service.
Maps Indian coordinates to primary fuel/vegetation biomes and flammability indices.
"""

from typing import Dict, Any


INDIAN_BIOMES = [
    {"name": "Himalayan Moist Temperate Pine", "state": "Uttarakhand", "fuel_type": "dense_forest", "flammability": 9.2, "min_lat": 28.5, "max_lat": 31.5, "min_lng": 77.0, "max_lng": 81.5},
    {"name": "Sub-Himalayan Chir Pine Belt", "state": "Himachal Pradesh", "fuel_type": "forest", "flammability": 8.8, "min_lat": 30.5, "max_lat": 33.5, "min_lng": 75.5, "max_lng": 79.5},
    {"name": "Central Indian Tropical Dry Deciduous", "state": "Madhya Pradesh", "fuel_type": "deciduous_forest", "flammability": 9.0, "min_lat": 21.0, "max_lat": 26.5, "min_lng": 74.0, "max_lng": 82.5},
    {"name": "Sal & Teak Dense Forest", "state": "Odisha", "fuel_type": "dense_forest", "flammability": 8.5, "min_lat": 18.0, "max_lat": 22.5, "min_lng": 81.5, "max_lng": 87.0},
    {"name": "Western Ghats Wet Evergreen", "state": "Kerala", "fuel_type": "evergreen_forest", "flammability": 7.2, "min_lat": 8.5, "max_lat": 13.0, "min_lng": 75.0, "max_lng": 77.5},
    {"name": "Thar Thorn & Scrub Forest", "state": "Rajasthan", "fuel_type": "shrubland", "flammability": 7.0, "min_lat": 24.0, "max_lat": 29.5, "min_lng": 70.0, "max_lng": 76.5},
]


def get_landcover_for_location(lat: float, lng: float) -> Dict[str, Any]:
    """Retrieve land cover classification and fuel characteristics for coordinate."""
    for b in INDIAN_BIOMES:
        if b["min_lat"] <= lat <= b["max_lat"] and b["min_lng"] <= lng <= b["max_lng"]:
            return {
                "biome": b["name"],
                "type": b["fuel_type"],
                "flammability_score": b["flammability"],
                "canopy_cover": "65%",
                "fuel_load": "High"
            }
    return {
        "biome": "Mixed Vegetation / Cultivated Land",
        "type": "cropland",
        "flammability_score": 5.0,
        "canopy_cover": "30%",
        "fuel_load": "Moderate"
    }

