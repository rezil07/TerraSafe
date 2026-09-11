"""
TerraSafe FastAPI Application Entrypoint.
Smart India Hackathon AI Wildfire Intelligence Platform.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.endpoints import router as api_router
from app.ml.predict import get_model, get_metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown events."""
    print("=" * 60)
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print("Loading calibrated Random Forest Model...")
    model = get_model()
    metadata = get_metadata()
    if model is not None:
        print(f"Model loaded successfully! Features: {metadata.get('n_features', 18)}")
    else:
        print("Warning: Model file not found; empirical baseline activated.")
    print(f"Monitored Region: India ({settings.INDIA_BBOX['min_lat']}N - {settings.INDIA_BBOX['max_lat']}N)")
    print(f"Centralized Thresholds: WATCH <= {settings.THRESHOLD_WATCH_MAX}, ELEVATED <= {settings.THRESHOLD_ELEVATED_MAX}, CRITICAL >= {settings.THRESHOLD_CRITICAL_MIN}")
    print("=" * 60)
    yield
    print("Shutting down TerraSafe services...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "India-focused AI Wildfire Intelligence and Early-Warning System. "
        "Integrates NASA FIRMS satellite data, Open-Meteo weather telemetry, "
        "Random Forest risk scoring (0-100), and a deterministic SOS Safety Agent."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for React frontend (including Vercel deployment domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to TerraSafe AI Wildfire Intelligence Platform",
        "docs": "/docs",
        "health": "/health",
        "api_health": "/api/health",
        "dashboard": "/api/dashboard",
        "fires": "/api/fires"
    }


@app.get("/health", tags=["System"])
async def root_health():
    """Root health check endpoint for monitoring systems and container probes."""
    from app.api.endpoints import health_check
    return await health_check()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

