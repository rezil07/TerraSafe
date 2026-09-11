"""
TerraSafe SOS Decision Memory and Feedback Store.
Provides persistent audit logging, simulated feedback tracking,
error categorization (OVER_ESCALATION vs UNDER_ESCALATION),
and controlled policy versioning for the SIH AI Wildfire prototype.

MODE: SIMULATION ONLY.
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional


class SOSMemory:
    """
    Lightweight SQLite storage for SOS decisions, feedback signals,
    and versioned policy history.
    """

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            backend_dir = Path(__file__).resolve().parents[2]
            db_path = str(backend_dir / "terrasafe_sos_memory.db")
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Decisions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sos_decisions (
                    decision_id TEXT PRIMARY KEY,
                    event_id TEXT,
                    timestamp TEXT,
                    lat REAL,
                    lng REAL,
                    location_name TEXT,
                    risk_score REAL,
                    agent_score INTEGER,
                    decision TEXT,
                    action_summary TEXT,
                    evidence_strength TEXT,
                    evidence_points INTEGER,
                    evidence_json TEXT,
                    data_quality_json TEXT,
                    reasons_json TEXT,
                    simulation_action TEXT,
                    model_version TEXT,
                    agent_version TEXT,
                    feedback_outcome TEXT,
                    error_type TEXT,
                    feedback_timestamp TEXT,
                    feedback_notes TEXT
                )
            """)

            # Policy versions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sos_policies (
                    version TEXT PRIMARY KEY,
                    created_at TEXT,
                    reason TEXT,
                    parameters_json TEXT,
                    changes_json TEXT
                )
            """)

            # Learning reports table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sos_learning_reports (
                    report_id TEXT PRIMARY KEY,
                    timestamp TEXT,
                    analyzed_count INTEGER,
                    over_escalations INTEGER,
                    under_escalations INTEGER,
                    insights_json TEXT,
                    proposed_adjustments_json TEXT,
                    policy_promoted BOOLEAN,
                    new_policy_version TEXT
                )
            """)
            conn.commit()

    def record_decision(
        self,
        event_id: str,
        lat: Optional[float],
        lng: Optional[float],
        location_name: str,
        risk_score: float,
        agent_score: int,
        decision: str,
        action_summary: str,
        evidence_strength: str,
        evidence_points: int,
        evidence: Dict[str, Any],
        data_quality: Dict[str, Any],
        reasons: List[str],
        simulation_action: str = "PROTOTYPE_ALERT_GENERATED",
        model_version: str = "rf_v1",
        agent_version: str = "sos_policy_v1",
        decision_id: Optional[str] = None
    ) -> str:
        """Store a decision record in memory."""
        d_id = decision_id or f"DEC-{uuid.uuid4().hex[:8].upper()}"
        now_utc = datetime.now(timezone.utc).isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO sos_decisions (
                    decision_id, event_id, timestamp, lat, lng, location_name,
                    risk_score, agent_score, decision, action_summary,
                    evidence_strength, evidence_points, evidence_json,
                    data_quality_json, reasons_json, simulation_action,
                    model_version, agent_version, feedback_outcome, error_type,
                    feedback_timestamp, feedback_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)
            """, (
                d_id,
                event_id,
                now_utc,
                lat,
                lng,
                location_name,
                float(risk_score),
                int(agent_score),
                decision,
                action_summary,
                evidence_strength,
                int(evidence_points),
                json.dumps(evidence),
                json.dumps(data_quality),
                json.dumps(reasons),
                simulation_action,
                model_version,
                agent_version
            ))
            conn.commit()
        return d_id

    def record_feedback(
        self,
        decision_id: str,
        feedback_outcome: str,
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Record feedback outcome (TRUE_POSITIVE, FALSE_POSITIVE, etc.)
        and evaluate error type (OVER_ESCALATION vs UNDER_ESCALATION).
        """
        outcome = feedback_outcome.upper().strip()
        now_utc = datetime.now(timezone.utc).isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sos_decisions WHERE decision_id = ? OR event_id = ? ORDER BY timestamp DESC LIMIT 1", (decision_id, decision_id))
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"Decision '{decision_id}' not found in memory store.")

            actual_id = row["decision_id"]
            decision = row["decision"]

            # Classify error
            error_type = "NONE"
            if decision == "ESCALATION_INITIATED" and outcome == "FALSE_POSITIVE":
                error_type = "OVER_ESCALATION"
            elif decision in ["MONITOR", "NO_ESCALATION", "ESCALATION_WITHHELD"] and outcome == "TRUE_POSITIVE":
                error_type = "UNDER_ESCALATION"
            elif outcome in ["TRUE_POSITIVE", "TRUE_NEGATIVE"]:
                error_type = "CORRECT"

            cursor.execute("""
                UPDATE sos_decisions
                SET feedback_outcome = ?,
                    error_type = ?,
                    feedback_timestamp = ?,
                    feedback_notes = ?
                WHERE decision_id = ?
            """, (outcome, error_type, now_utc, notes, actual_id))
            conn.commit()

            return {
                "decision_id": actual_id,
                "event_id": row["event_id"],
                "decision": decision,
                "feedback_outcome": outcome,
                "error_type": error_type,
                "timestamp": now_utc,
                "mode": "SIMULATION ONLY",
                "notes": notes
            }

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve recent decisions and associated feedback."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sos_decisions ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            results = []
            for r in rows:
                results.append({
                    "decision_id": r["decision_id"],
                    "event_id": r["event_id"],
                    "timestamp": r["timestamp"],
                    "location": {
                        "lat": r["lat"],
                        "lng": r["lng"],
                        "name": r["location_name"] or "India Sector"
                    },
                    "risk_score": r["risk_score"],
                    "agent_score": r["agent_score"],
                    "decision": r["decision"],
                    "action_summary": r["action_summary"],
                    "evidence_strength": r["evidence_strength"],
                    "evidence_points": r["evidence_points"],
                    "evidence": json.loads(r["evidence_json"]) if r["evidence_json"] else {},
                    "data_quality": json.loads(r["data_quality_json"]) if r["data_quality_json"] else {},
                    "reasons": json.loads(r["reasons_json"]) if r["reasons_json"] else [],
                    "simulation_action": r["simulation_action"],
                    "model_version": r["model_version"],
                    "agent_version": r["agent_version"],
                    "feedback_outcome": r["feedback_outcome"],
                    "error_type": r["error_type"],
                    "feedback_timestamp": r["feedback_timestamp"],
                    "feedback_notes": r["feedback_notes"]
                })
            return results

    def get_metrics(self) -> Dict[str, Any]:
        """
        Calculate honest statistical metrics.
        If there are insufficient feedback records, explicitly declare
        'Insufficient feedback data' rather than fabricating metrics.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total FROM sos_decisions")
            total_decisions = cursor.fetchone()["total"]

            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE decision = 'ESCALATION_INITIATED'")
            escalation_count = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE decision IN ('MONITOR', 'ESCALATION_WITHHELD')")
            monitor_count = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE decision = 'INSUFFICIENT_EVIDENCE'")
            insufficient_count = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE decision = 'NO_ESCALATION'")
            no_escalation_count = cursor.fetchone()["c"]

            # Feedback stats
            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE feedback_outcome IS NOT NULL")
            feedback_count = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE feedback_outcome = 'TRUE_POSITIVE' AND decision = 'ESCALATION_INITIATED'")
            tp = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE feedback_outcome = 'FALSE_POSITIVE' AND decision = 'ESCALATION_INITIATED'")
            fp = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE feedback_outcome = 'TRUE_NEGATIVE' AND decision != 'ESCALATION_INITIATED'")
            tn = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE feedback_outcome = 'TRUE_POSITIVE' AND decision != 'ESCALATION_INITIATED'")
            fn = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE error_type = 'OVER_ESCALATION'")
            over_escalations = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM sos_decisions WHERE error_type = 'UNDER_ESCALATION'")
            under_escalations = cursor.fetchone()["c"]

            # Determine if sample size is sufficient (threshold: at least 3 feedback entries)
            has_sufficient_data = feedback_count >= 3

            precision = None
            recall = None
            fpr = None
            fnr = None

            if has_sufficient_data:
                if (tp + fp) > 0:
                    precision = round(tp / (tp + fp), 3)
                if (tp + fn) > 0:
                    recall = round(tp / (tp + fn), 3)
                if (fp + tn) > 0:
                    fpr = round(fp / (fp + tn), 3)
                if (fn + tp) > 0:
                    fnr = round(fn / (fn + tp), 3)

            return {
                "total_decisions": total_decisions,
                "breakdown": {
                    "escalation_count": escalation_count,
                    "monitor_count": monitor_count,
                    "insufficient_evidence_count": insufficient_count,
                    "no_escalation_count": no_escalation_count
                },
                "feedback_records": feedback_count,
                "has_sufficient_data": has_sufficient_data,
                "status_message": (
                    "Statistical metrics computed from accumulated simulated feedback."
                    if has_sufficient_data
                    else "Insufficient feedback data for reliable learning statistics. Please submit simulated feedback to accumulate records."
                ),
                "true_positives": tp if has_sufficient_data else None,
                "false_positives": fp if has_sufficient_data else None,
                "true_negatives": tn if has_sufficient_data else None,
                "false_negatives": fn if has_sufficient_data else None,
                "over_escalations": over_escalations,
                "under_escalations": under_escalations,
                "precision": precision,
                "recall": recall,
                "false_positive_rate": fpr,
                "false_negative_rate": fnr,
                "mode": "SIMULATION ONLY",
                "disclaimer": "TerraSafe prototype feedback is simulated for hackathon demonstration. No live emergency outcomes are fabricated."
            }

    def save_policy(self, version: str, reason: str, parameters: Dict[str, Any], changes: List[str]):
        """Save a new version of the SOS decision policy."""
        now_utc = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO sos_policies (version, created_at, reason, parameters_json, changes_json)
                VALUES (?, ?, ?, ?, ?)
            """, (version, now_utc, reason, json.dumps(parameters), json.dumps(changes)))
            conn.commit()

    def get_latest_policy(self) -> Optional[Dict[str, Any]]:
        """Get the most recent policy version."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sos_policies ORDER BY created_at DESC LIMIT 1")
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "version": row["version"],
                "created_at": row["created_at"],
                "reason": row["reason"],
                "parameters": json.loads(row["parameters_json"]),
                "changes": json.loads(row["changes_json"])
            }

    def save_learning_report(
        self,
        report_id: str,
        analyzed_count: int,
        over_escalations: int,
        under_escalations: int,
        insights: List[str],
        proposed_adjustments: List[str],
        policy_promoted: bool,
        new_policy_version: str
    ):
        """Save a learning cycle report."""
        now_utc = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO sos_learning_reports (
                    report_id, timestamp, analyzed_count, over_escalations,
                    under_escalations, insights_json, proposed_adjustments_json,
                    policy_promoted, new_policy_version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                report_id,
                now_utc,
                analyzed_count,
                over_escalations,
                under_escalations,
                json.dumps(insights),
                json.dumps(proposed_adjustments),
                policy_promoted,
                new_policy_version
            ))
            conn.commit()

    def get_latest_learning_report(self) -> Optional[Dict[str, Any]]:
        """Fetch the most recent learning report."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sos_learning_reports ORDER BY timestamp DESC LIMIT 1")
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "report_id": row["report_id"],
                "timestamp": row["timestamp"],
                "analyzed_count": row["analyzed_count"],
                "over_escalations": row["over_escalations"],
                "under_escalations": row["under_escalations"],
                "insights": json.loads(row["insights_json"]),
                "proposed_adjustments": json.loads(row["proposed_adjustments_json"]),
                "policy_promoted": bool(row["policy_promoted"]),
                "new_policy_version": row["new_policy_version"],
                "mode": "SIMULATION ONLY"
            }


# Global memory singleton
sos_memory = SOSMemory()
