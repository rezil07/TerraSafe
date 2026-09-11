# TerraSafe SOS Decision Agent & Self-Improving Feedback Loop

> **SMART INDIA HACKATHON PROTOTYPE SPECIFICATION**  
> **MODE: SIMULATION ONLY**  
> **ABSOLUTE SAFETY GUARANTEE**: Under no circumstances does TerraSafe dial real emergency numbers (112, 911, 101), send SMS messages, or trigger external emergency dispatch APIs. All escalation states and actions are strictly tagged `MODE: SIMULATION` and `ACTION: PROTOTYPE_ALERT_GENERATED`.

---

## 1. Core Architectural Principle

```
NASA FIRMS & Telemetry  -->  Feature Pipeline  -->  Random Forest Model  -->  Risk Score (0-100)
                                                                                   │
                                                                                   ▼
                                                                        ┌─────────────────────┐
                                                                        │  SOS DECISION AGENT │
                                                                        │  - Evidence Matrix  │
                                                                        │  - Quality Check    │
                                                                        │  - Policy Rules     │
                                                                        └──────────┬──────────┘
                                                                                   │
                                                   ┌───────────────────────────────┴───────────────────────────────┐
                                                   ▼                                                               ▼
                                        Simulated SOS Event                                              Decision Memory Store
                                       (NO real calls made)                                             (SQLite / JSON History)
                                                   │                                                               │
                                                   ▼                                                               ▼
                                       Dashboard & Alert Panel                                          Simulated Feedback Loop
                                       (Judge Interactive UI)                                         (True/False Positives/Negatives)
                                                                                                                   │
                                                                                                                   ▼
                                                                                                        Controlled Learning Cycle
                                                                                                        (Policy Versioning: v1->v2)
```

### The Fundamental Separation of Concerns:
> *"The AI detects and scores wildfire risk. The SOS Agent evaluates the multi-source physical evidence and decides whether operational escalation is justified."*

The SOS Agent does **not** blindly escalate when `risk_score >= 70`. Instead, it validates physical thermal radiation (FRP), satellite overpass persistence, spatial cluster density, atmospheric fire-weather anomalies, sensor confidence, and telemetry freshness before sanctioning escalation.

---

## 2. Multi-Source Evidence Decision Matrix

| Metric | Source | Critical / Corroboration Threshold | Evidence Points Contributed |
|---|---|---|---|
| **Thermal Power (FRP)** | NASA FIRMS (VIIRS/MODIS) | $\ge 15.0\text{ MW}$ (Strong) / $\ge 5.0\text{ MW}$ (Moderate) | $+2\text{ pts}$ / $+1\text{ pt}$ |
| **Observation Persistence** | Multi-pass satellite overpasses | $\ge 2$ consecutive passes | $+2\text{ pts}$ |
| **Spatial Cluster Density** | 25km radius cluster analysis | $\ge 4$ nearby detections ($+2\text{ pts}$) / $\ge 2$ detections ($+1\text{ pt}$) | $+1 \text{ to } +2\text{ pts}$ |
| **Atmospheric Dryness** | Open-Meteo Telemetry | Relative Humidity $\le 25\%$ | $+1\text{ pt}$ |
| **Spread Winds** | Open-Meteo Telemetry | Sustained Wind Speed $\ge 25\text{ km/h}$ | $+1\text{ pt}$ |
| **Heat Anomaly** | Climatological baseline | Regional Temperature Anomaly $\ge +2.0^\circ\text{C}$ | $+1\text{ pt}$ |
| **Sensor Confidence** | Satellite pixel confidence | Confidence $\ge 75\%$ | $+1\text{ pt}$ |

### Decision Outcomes:
- **`NO_ESCALATION`**: Low risk ($< 40$). Normal surveillance active.
- **`MONITOR`**: Elevated risk ($40 \le \text{score} < 70$). Active tracking engaged.
- **`INSUFFICIENT_EVIDENCE`**: Detection coordinates missing, outside monitored India bounds, or observation stale ($> 36\text{h}$).
- **`ESCALATION_INITIATED`**: Critical risk ($\ge 70$) **AND** $\ge 4$ evidence points **AND** confirmed anchor evidence (high FRP or persistence) **AND** fire-weather support.
- **`ESCALATION_WITHHELD`**: High model risk indicated, but physical evidence lacks multi-signal corroboration. Escalation is withheld by safety policy to prevent false alarms.

---

## 3. Self-Improving Feedback Loop & Error Typology

TerraSafe avoids black-box self-modifications. Instead, it employs an explainable, feedback-driven learning cycle:

```
DECISION  -->  STORE DECISION  -->  SIMULATED FEEDBACK  -->  ERROR CLASSIFICATION  -->  LEARNING CYCLE  -->  PROMOTED POLICY
```

### Error Classifications:
1. **`OVER_ESCALATION`** (False Alarm):
   - Occurs when the agent triggers `ESCALATION_INITIATED` on an incident later confirmed as `FALSE_POSITIVE` (e.g. agricultural crop burn).
   - **Learning Insight**: *"High model risk score alone was insufficient for escalation without persistent overpass verification."*
   - **Policy Adjustment**: Increases minimum persistence count or raises anchor FRP threshold.
2. **`UNDER_ESCALATION`** (Missed Escalation):
   - Occurs when the agent chose `MONITOR` or `ESCALATION_WITHHELD` on an incident that resulted in a `TRUE_POSITIVE` wildfire.
   - **Learning Insight**: *"The policy underweighted persistence and spatial clustering in moderate confidence scenarios."*
   - **Policy Adjustment**: Lowers required confidence barrier when spatial clustering and persistence are verified.
3. **`CORRECT`**:
   - `TRUE_POSITIVE` on `ESCALATION_INITIATED` or `TRUE_NEGATIVE` on `MONITOR`/`NO_ESCALATION`.

---

## 4. Policy Versioning & Auditability

Every decision records the exact policy version under which it was evaluated:

```json
{
  "decision_id": "DEC-2E822012",
  "event_id": "FIRE-4724FB",
  "risk_score": 82.0,
  "agent_score": 41,
  "decision": "ESCALATION_WITHHELD",
  "simulation_action": "ESCALATION_WITHHELD_MONITORING",
  "mode": "SIMULATION ONLY",
  "agent_version": "sos_policy_v1",
  "timestamp": "2026-09-11T04:20:52.362813+00:00"
}
```

When a learning cycle promotes updated weights, the version is incremented (`sos_policy_v1` $\rightarrow$ `sos_policy_v2`) and recorded with an explainable changelog.

---

## 5. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sos/status` | Operational status, active policy version, and simulation safety guardrails. |
| `POST` | `/api/sos/evaluate` | Evaluates evidence and returns explainable decision. Pure simulation. |
| `POST` | `/api/sos/feedback` | Ingests simulated ground-truth feedback (`TRUE_POSITIVE`, `FALSE_POSITIVE`) and classifies errors. |
| `GET` | `/api/sos/history` | Audit trail of past evaluations and feedback outcomes. |
| `GET` | `/api/sos/metrics` | Statistical error metrics (precision, recall, error trends). Honest "Insufficient feedback data" if $< 3$ records. |
| `POST` | `/api/sos/learn` | Triggers a controlled learning cycle, analyzes historical errors, and recalibrates policy. |
| `GET` | `/api/sos/learning-report` | Fetches the latest learning cycle report and policy adjustments. |
| `GET` | `/api/sos/policy` | Inspects current active policy parameters and changelog. |

---

## 6. Smart India Hackathon Demonstration Scenario for Judges

Judges can execute this live test sequence to observe the agent's feedback loop and learning cycle:

### Phase 1: High Risk with Weak Corroboration
1. Evaluate an incident with a high model risk score ($82/100$), but an isolated single overpass and low FRP ($2.0\text{ MW}$).
2. The agent outputs:  
   `decision: "ESCALATION_WITHHELD"`  
   `reason: "High model risk indicated, but physical evidence lacks multi-signal corroboration. Escalation withheld by safety policy."`

### Phase 2: Simulated Feedback Ingestion
1. Submit simulated feedback marking the event:  
   `feedback: "TRUE_POSITIVE"`  
   `notes: "Ground patrol verified smoldering forest floor fire."`
2. The agent classifies the mistake:  
   `error_type: "UNDER_ESCALATION"`

### Phase 3: Triggering the Learning Cycle
1. Run `POST /api/sos/learn`.
2. The agent analyzes the under-escalation and issues the report:  
   `"Identified UNDER_ESCALATION event where persistent or clustered detections were underweighted."`  
   `"Promoted policy version to sos_policy_v2."`

### Phase 4: High Risk with Multi-Signal Corroboration
1. Evaluate an incident with strong FRP ($35\text{ MW}$), $3$ persistent passes, and dry winds ($32\text{ km/h}$).
2. The agent initiates operational alert:  
   `decision: "ESCALATION_INITIATED"`  
   `simulation_action: "PROTOTYPE_ALERT_GENERATED"`  
   `mode: "SIMULATION ONLY"`
