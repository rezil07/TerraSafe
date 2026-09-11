"""
TerraSafe OpenStreetMap & Geographic Context Service.
Provides Indian settlements, populated centres, emergency infrastructure,
and geographic baseline risk zones.
"""

from typing import List
from app.schemas.models import SettlementModel, RiskZoneModel, AlertModel, RegionalStatusModel

# Key Indian settlements located near wildfire-prone forest interfaces
INDIAN_SETTLEMENTS: List[SettlementModel] = [
    SettlementModel(id="S-IND-01", name="Nainital", lat=29.39, lng=79.45, population=41377),
    SettlementModel(id="S-IND-02", name="Almora", lat=29.60, lng=79.66, population=34122),
    SettlementModel(id="S-IND-03", name="Baripada", lat=21.93, lng=86.72, population=116874),
    SettlementModel(id="S-IND-04", name="Shimla", lat=31.10, lng=77.17, population=169578),
    SettlementModel(id="S-IND-05", name="Dharamsala", lat=32.21, lng=76.32, population=53543),
    SettlementModel(id="S-IND-06", name="Hoshangabad", lat=22.75, lng=77.72, population=117988),
    SettlementModel(id="S-IND-07", name="Jagdalpur", lat=19.07, lng=82.03, population=125463),
    SettlementModel(id="S-IND-08", name="Chamarajanagar", lat=11.92, lng=76.94, population=71432),
    SettlementModel(id="S-IND-09", name="Dehradun", lat=30.31, lng=78.03, population=578420),
    SettlementModel(id="S-IND-10", name="Pachmarhi", lat=22.46, lng=78.43, population=12062),
]

# Monitored Indian wildfire risk zones
INDIAN_RISK_ZONES: List[RiskZoneModel] = [
    RiskZoneModel(id="RZ-IND-01", name="Kumaon & Garhwal Pine Belt", lat=29.8, lng=79.2, riskScore=84.0, riskLevel="critical"),
    RiskZoneModel(id="RZ-IND-02", name="Simlipal Biosphere Reserve", lat=21.8, lng=86.4, riskScore=78.0, riskLevel="critical"),
    RiskZoneModel(id="RZ-IND-03", name="Satpura National Park & Bori", lat=22.4, lng=78.3, riskScore=66.0, riskLevel="high"),
    RiskZoneModel(id="RZ-IND-04", name="Bandipur-Nagarhole Interface", lat=11.8, lng=76.4, riskScore=62.0, riskLevel="high"),
    RiskZoneModel(id="RZ-IND-05", name="Kangra Valley Pine Foothills", lat=32.1, lng=76.2, riskScore=56.0, riskLevel="medium"),
    RiskZoneModel(id="RZ-IND-06", name="Bastar Deciduous Corridor", lat=19.2, lng=81.8, riskScore=52.0, riskLevel="medium"),
    RiskZoneModel(id="RZ-IND-07", name="Nilgiri Biosphere Buffer", lat=11.4, lng=76.7, riskScore=44.0, riskLevel="medium"),
    RiskZoneModel(id="RZ-IND-08", name="Thar Border Scrub Zone", lat=26.5, lng=71.8, riskScore=32.0, riskLevel="low"),
]


def get_indian_settlements() -> List[SettlementModel]:
    """Return monitored human settlements in interface zones."""
    return INDIAN_SETTLEMENTS


def get_indian_risk_zones() -> List[RiskZoneModel]:
    """Return regional wildfire risk zones."""
    return INDIAN_RISK_ZONES


def generate_indian_alerts(fires: list) -> List[AlertModel]:
    """Generate dynamic alerts linked to active high-risk fire incidents."""
    alerts = []
    idx = 1
    for f in fires:
        if f.riskScore >= 70:
            alerts.append(AlertModel(
                id=f"ALERT-IND-{idx:02d}",
                title=f"Critical Wildfire Warning — {f.name}",
                region=f.location,
                severity="critical",
                time=f.detectedRelative,
                description=f"Risk Score {f.riskScore:.0f}/100. SOS Status: {f.sosStatus}. Corroborated thermal intensity.",
                sosStatus=f.sosStatus
            ))
            idx += 1
        elif f.riskScore >= 60:
            alerts.append(AlertModel(
                id=f"ALERT-IND-{idx:02d}",
                title=f"Elevated Fire Risk — {f.name}",
                region=f.location,
                severity="high",
                time=f.detectedRelative,
                description=f"Risk Score {f.riskScore:.0f}/100. Dry vegetation and elevated ambient temperature.",
                sosStatus=f.sosStatus
            ))
            idx += 1

    if not alerts:
        alerts.append(AlertModel(
            id="ALERT-IND-01",
            title="Advisory — Western Himalayas Pine Belt",
            region="Uttarakhand",
            severity="medium",
            time="2h ago",
            description="Elevated temperature and low humidity create supportive fire weather conditions.",
            sosStatus="MONITOR"
        ))

    return alerts

