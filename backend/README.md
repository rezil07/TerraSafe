# TerraSafe Backend: AI Wildfire Intelligence & Early-Warning Platform

TerraSafe backend is an India-focused wildfire risk intelligence service designed for the Smart India Hackathon. It bridges live Earth observation satellite data (NASA FIRMS MODIS & VIIRS), real-time meteorological observations (Open-Meteo), and land cover flammability models with an explainable Random Forest machine learning pipeline (0–100 Risk Score) and a deterministic SOS Safety Agent.

```
Data Sources (NASA FIRMS, Open-Meteo, Land Cover, OSM)
                  ↓
       Feature Engineering (18 features)
                  ↓
       Random Forest ML Model (Calibrated)
                  ↓
            Risk Score (0–100)
                  ↓
        SOS Safety Escalation Agent
                  ↓
    WATCH / ELEVATED / CRITICAL Escalation Decision
                  ↓
       FastAPI REST Endpoints (CORS Enabled)
                  ↓
            React Dashboard
```

## Core Principle
> **"The AI detects and scores the risk; the safety agent decides when the evidence is strong enough to escalate."**

---

## Quick Start

### 1. Requirements
- Python 3.10+ (tested on Python 3.14)
- Dependencies listed in `requirements.txt`

### 2. Installation
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Run Model Training (Optional, pre-trained model included)
```bash
python -m app.ml.train
```

### 5. Run the Server
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger docs: `http://localhost:8000/docs`

### 6. Run Automated Tests
```bash
python -m pytest tests/ -v
```

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health, model status, and monitored bounds. |
| `GET` | `/api/fires` | Active fire events and satellite hotspots across India. |
| `GET` | `/api/fires/{id}` | Detailed incident view with contributing factors and SOS state. |
| `GET` | `/api/risk` | Coordinate-based on-demand AI risk score and evidence checklist. |
| `GET` | `/api/risk/{location}` | Regional risk analysis for Indian states and biomes. |
| `GET` | `/api/states` | Monitored Indian states with active fire counts. |
| `GET` | `/api/states/{state}` | State-specific telemetry and fire zones. |
| `GET` | `/api/weather/{location}` | Real-time weather, FWI, and fuel moisture. |
| `GET` | `/api/dashboard` | Aggregated dashboard summary payload. |
| `GET` | `/api/alerts` | Active emergency alerts and SOS escalation notices. |
| `POST` | `/api/sos/evaluate` | Deterministic SOS safety evaluation of evidence sufficiency. |

---

## Target Data Rule Compliance
This model does not claim that satellite hotspots are independently verified ground-truth wildfires without satellite observation. The training target is explicitly documented as a proxy combining satellite thermal anomaly observations, fire weather danger conditions, and fuel vulnerability across Indian biogeographic zones.

