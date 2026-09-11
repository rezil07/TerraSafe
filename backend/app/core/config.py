"""
TerraSafe Central Configuration.
Defines all environment-driven configurations and centralized risk thresholds.
Threshold values are NOT scattered throughout the codebase.
"""

from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Server Settings
    APP_NAME: str = "TerraSafe AI Wildfire Intelligence Platform"
    APP_VERSION: str = "2.1.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # External APIs
    FIRMS_API_KEY: str = ""
    WEATHER_API_KEY: str = ""

    # Optional Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./terrasafe.db"

    # Configurable Risk Thresholds (0-100 scale)
    # 0–39 = WATCH, 40–69 = ELEVATED, 70–100 = CRITICAL
    THRESHOLD_WATCH_MAX: float = Field(default=39.0, description="Upper bound for WATCH risk level")
    THRESHOLD_ELEVATED_MAX: float = Field(default=69.0, description="Upper bound for ELEVATED risk level")
    THRESHOLD_CRITICAL_MIN: float = Field(default=70.0, description="Lower bound for CRITICAL risk level")

    # Safety Agent Criteria
    DATA_STALENESS_HOURS_LIMIT: float = Field(default=36.0, description="Max allowed hours before data is declared STALE")
    MIN_CONFIDENCE_THRESHOLD: float = Field(default=50.0, description="Minimum satellite confidence threshold")
    HIGH_FRP_THRESHOLD: float = Field(default=15.0, description="MW threshold indicating severe fire radiative power")
    MIN_PERSISTENCE_COUNT: int = Field(default=2, description="Minimum detection passes to confirm persistence")

    # Geographic Bounding Box: India Monitored Extent
    INDIA_BBOX: dict = {
        "min_lat": 6.0,
        "max_lat": 37.5,
        "min_lng": 68.0,
        "max_lng": 98.0
    }

    def get_risk_level(self, score: float) -> str:
        """Centralized helper to map 0-100 score to risk level."""
        if score >= self.THRESHOLD_CRITICAL_MIN:
            return "CRITICAL"
        elif score > self.THRESHOLD_WATCH_MAX:
            return "ELEVATED"
        return "WATCH"


settings = Settings()

