import { useState, useEffect } from 'react';
import { PageHeader, RiskBadge } from '@/components/ui';
import { fireEvents, currentWeather, responseUnits } from '@/data/mockData';
import { MapView } from '@/components/MapView';
import {
  evaluateSOS,
  submitSOSFeedback,
  fetchSOSMetrics,
  triggerSOSLearn,
  type SOSEvalResponse,
  type SOSMetricsData,
  type SOSLearningReportData,
} from '@/services/api';
import {
  AlertTriangle,
  Wind,
  Users,
  Clock,
  Compass,
  MapPin,
  Shield,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  RefreshCw,
  Sparkles,
  Info,
  Radio,
  Sliders,
  ChevronRight,
  Flame,
} from 'lucide-react';

export function EmergencyResponse() {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    fireEvents.find((e) => e.riskLevel === 'critical')?.id || fireEvents[0].id
  );
  const incident = fireEvents.find((e) => e.id === selectedIncidentId) || fireEvents[0];

  // SOS Agent Evaluation state
  const [sosResult, setSosResult] = useState<SOSEvalResponse | null>(null);
  const [loadingSOS, setLoadingSOS] = useState(false);

  // Learning and Metrics state
  const [metrics, setMetrics] = useState<SOSMetricsData | null>(null);
  const [learningReport, setLearningReport] = useState<SOSLearningReportData | null>(null);
  const [learningRunning, setLearningRunning] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Evaluate SOS whenever selected incident changes
  useEffect(() => {
    let isMounted = true;
    async function runEval() {
      setLoadingSOS(true);
      try {
        const res = await evaluateSOS({
          risk_score: incident.riskScore,
          satellite: {
            lat: incident.lat,
            lng: incident.lng,
            frp: incident.frp || 25.0,
            confidence: incident.confidence,
            persistence: incident.riskLevel === 'critical' ? 3 : 1,
            nearby_count: incident.riskLevel === 'critical' ? 4 : 1,
          },
          weather: {
            temperature: currentWeather.temperature,
            humidity: currentWeather.humidity,
            wind_speed: currentWeather.windSpeed,
            temp_anomaly: currentWeather.temperature > 30 ? 3.2 : 0.8,
          },
          event_id: incident.id,
          location_name: incident.location,
        });
        if (isMounted && res) {
          setSosResult(res);
        }
      } catch (e) {
        console.warn('Failed to evaluate SOS', e);
      } finally {
        if (isMounted) setLoadingSOS(false);
      }
    }

    runEval();
    return () => {
      isMounted = false;
    };
  }, [incident]);

  // Load metrics on mount
  useEffect(() => {
    fetchSOSMetrics().then(setMetrics).catch(() => {});
  }, []);

  const handleFeedback = async (outcome: 'TRUE_POSITIVE' | 'FALSE_POSITIVE') => {
    if (!sosResult) return;
    try {
      const res = await submitSOSFeedback({
        decision_id: sosResult.decision_id,
        feedback: outcome,
        notes: `Simulated ground truth for ${incident.name} marked as ${outcome}`,
      });
      if (res) {
        setFeedbackSuccess(`Feedback recorded: Marked ${outcome} (${res.error_type}).`);
        // Refresh metrics
        const updated = await fetchSOSMetrics();
        setMetrics(updated);
        setTimeout(() => setFeedbackSuccess(null), 4000);
      }
    } catch (e) {
      console.warn('Feedback failed', e);
    }
  };

  const handleRunLearning = async () => {
    setLearningRunning(true);
    try {
      const report = await triggerSOSLearn();
      setLearningReport(report);
      // Refresh metrics
      const updated = await fetchSOSMetrics();
      setMetrics(updated);
    } catch (e) {
      console.warn('Learning cycle failed', e);
    } finally {
      setLearningRunning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Emergency Response & SOS Agent"
          subtitle="Multi-source evidence evaluation and simulated decision intelligence"
        />

        {/* Incident Selector */}
        <div className="flex items-center gap-2 bg-panel border border-panel-line p-1.5 rounded-lg">
          <span className="text-xs text-fog uppercase tracking-wider pl-2">Select Incident:</span>
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="bg-void border border-panel-line rounded px-2.5 py-1 text-xs text-paper focus:outline-none focus:border-cyan"
          >
            {fireEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.riskLevel.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Safety & Simulation Banner — STRICTLY PROTOTYPE */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl border border-yellow-500/40 bg-yellow-500/10">
        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-yellow-100 leading-relaxed">
          <span className="font-bold text-yellow-300 uppercase tracking-wide mr-1.5">
            Smart India Hackathon Prototype · Simulation Only:
          </span>
          TerraSafe’s SOS agent evaluates physical multi-source evidence and executes internal simulations.
          <span className="font-semibold text-paper ml-1">
            Zero real-world 112 calls, SMS, or external emergency dispatches are triggered.
          </span>
        </div>
      </div>

      {/* PRIMARY: TERRA SAFE SOS DECISION AGENT PANEL */}
      <div className="panel panel-glow p-5 sm:p-6 space-y-5 border-l-4 border-l-cyan">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-panel-line pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan/15 border border-cyan/40 flex items-center justify-center text-cyan">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide text-paper flex items-center gap-2">
                TERRASAFE SOS DECISION AGENT
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan/20 text-cyan border border-cyan/40">
                  {sosResult?.agent_version || 'SOS_POLICY_V1'}
                </span>
              </h2>
              <p className="text-xs text-fog">Deterministic Multi-Signal Verification & Escalation Decision Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
              AGENT ACTIVE (SIMULATION)
            </span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Decision Box */}
          <div className="bg-void/60 border border-panel-line rounded-xl p-4 space-y-1.5">
            <span className="text-[10px] text-fog uppercase tracking-wider">Current Decision</span>
            <div className="text-base font-mono font-bold">
              {sosResult?.decision === 'ESCALATION_INITIATED' ? (
                <span className="text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  ESCALATION INITIATED
                </span>
              ) : sosResult?.decision === 'ESCALATION_WITHHELD' ? (
                <span className="text-amber-400">ESCALATION WITHHELD</span>
              ) : sosResult?.decision === 'MONITOR' ? (
                <span className="text-cyan">MONITOR ACTIVE</span>
              ) : (
                <span className="text-fog">NO ESCALATION</span>
              )}
            </div>
            <span className="text-[11px] text-fog block leading-tight">
              Action: <code className="text-paper">{sosResult?.simulation_action || 'PROTOTYPE_ALERT'}</code>
            </span>
          </div>

          {/* Agent Score */}
          <div className="bg-void/60 border border-panel-line rounded-xl p-4 space-y-1.5">
            <span className="text-[10px] text-fog uppercase tracking-wider">Agent Evidence Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-cyan">
                {sosResult?.agent_score ?? 0}
              </span>
              <span className="text-xs text-fog">/ 100</span>
            </div>
            <span className="text-[11px] text-fog block">Multi-source synthesized rating</span>
          </div>

          {/* Random Forest Risk */}
          <div className="bg-void/60 border border-panel-line rounded-xl p-4 space-y-1.5">
            <span className="text-[10px] text-fog uppercase tracking-wider">Model Risk Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-paper">
                {incident.riskScore}
              </span>
              <span className="text-xs text-fog">/ 100</span>
            </div>
            <span className="text-[11px] text-fog block">
              Random Forest Calibrated Risk
            </span>
          </div>

          {/* Evidence Strength */}
          <div className="bg-void/60 border border-panel-line rounded-xl p-4 space-y-1.5">
            <span className="text-[10px] text-fog uppercase tracking-wider">Corroborating Strength</span>
            <div className="text-base font-mono font-bold text-paper">
              {sosResult?.evidence_strength || 'MODERATE'} ({sosResult?.evidence_points ?? 0}/7 pts)
            </div>
            <span className="text-[11px] text-fog block">
              {sosResult?.escalation_ready ? 'Meets escalation criteria' : 'Sub-threshold corroboration'}
            </span>
          </div>
        </div>

        {/* Multi-Signal Evidence Checklist */}
        <div className="bg-void/40 border border-panel-line rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-fog flex items-center justify-between">
            <span>Multi-Source Physical Corroboration Checklist</span>
            <span className="text-[10px] font-mono text-cyan">Deterministic Rules Matrix</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-panel-line bg-void/50">
              {sosResult?.evidence?.satellite ? (
                <CheckCircle2 className="w-4 h-4 text-cyan flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-fog/50 flex-shrink-0" />
              )}
              <div className="text-xs">
                <div className="font-medium text-paper">Thermal Power</div>
                <div className="text-[10px] text-fog font-mono">FRP: {incident.frp || 25} MW</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-panel-line bg-void/50">
              {sosResult?.evidence?.persistence ? (
                <CheckCircle2 className="w-4 h-4 text-cyan flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-fog/50 flex-shrink-0" />
              )}
              <div className="text-xs">
                <div className="font-medium text-paper">Persistence</div>
                <div className="text-[10px] text-fog font-mono">&ge; 2 Overpasses</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-panel-line bg-void/50">
              {sosResult?.evidence?.nearby_detections ? (
                <CheckCircle2 className="w-4 h-4 text-cyan flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-fog/50 flex-shrink-0" />
              )}
              <div className="text-xs">
                <div className="font-medium text-paper">Nearby Cluster</div>
                <div className="text-[10px] text-fog font-mono">&ge; 25km Radius</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-panel-line bg-void/50">
              {sosResult?.evidence?.weather_anomaly ? (
                <CheckCircle2 className="w-4 h-4 text-cyan flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-fog/50 flex-shrink-0" />
              )}
              <div className="text-xs">
                <div className="font-medium text-paper">Weather Anomaly</div>
                <div className="text-[10px] text-fog font-mono">Wind / Dry / Heat</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-panel-line bg-void/50">
              {sosResult?.data_quality?.coordinate_valid && !sosResult?.data_quality?.is_stale ? (
                <CheckCircle2 className="w-4 h-4 text-cyan flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-fog/50 flex-shrink-0" />
              )}
              <div className="text-xs">
                <div className="font-medium text-paper">Data Freshness</div>
                <div className="text-[10px] text-fog font-mono">&lt; 36h in India</div>
              </div>
            </div>
          </div>
        </div>

        {/* Explainable Decision Rationale */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-fog block">
            Explainable Decision Audit Trail:
          </span>
          <div className="space-y-1.5 bg-void/70 border border-panel-line rounded-lg p-3">
            {sosResult?.reasons?.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-paper/90">
                <span className="text-cyan mt-0.5">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SIH Judge Interactive Ground-Truth Feedback Section */}
        <div className="p-4 rounded-xl border border-cyan/30 bg-cyan/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan block mb-0.5">
              SIH Judge Interactive Feedback Loop
            </span>
            <p className="text-xs text-fog">
              Submit simulated ground-truth verification for this decision to train the feedback memory store:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleFeedback('TRUE_POSITIVE')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-semibold transition-all active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark True Positive
            </button>

            <button
              type="button"
              onClick={() => handleFeedback('FALSE_POSITIVE')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-semibold transition-all active:scale-95"
            >
              <XCircle className="w-3.5 h-3.5" />
              Mark False Positive
            </button>
          </div>
        </div>

        {feedbackSuccess && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {feedbackSuccess}
          </div>
        )}
      </div>

      {/* SECONDARY: SOS AGENT LEARNING & POLICY DASHBOARD */}
      <div className="panel panel-glow p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-panel-line pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan" />
            <h2 className="text-sm font-semibold text-paper">
              SOS Agent Self-Improving Learning Loop
            </h2>
          </div>

          <button
            type="button"
            onClick={handleRunLearning}
            disabled={learningRunning}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan text-void font-bold text-xs hover:bg-cyan/90 transition-all shadow-[0_0_10px_rgba(0,245,255,0.3)] active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${learningRunning ? 'animate-spin' : ''}`} />
            Run Learning Cycle
          </button>
        </div>

        {/* Learning Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg border border-panel-line bg-void/50">
            <span className="text-[10px] text-fog uppercase tracking-wider block">Decisions Analyzed</span>
            <span className="text-xl font-mono font-bold text-paper mt-1 block">
              {metrics?.total_decisions ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-panel-line bg-void/50">
            <span className="text-[10px] text-fog uppercase tracking-wider block">Feedback Records</span>
            <span className="text-xl font-mono font-bold text-cyan mt-1 block">
              {metrics?.feedback_records ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-panel-line bg-void/50">
            <span className="text-[10px] text-fog uppercase tracking-wider block">Over-Escalations</span>
            <span className="text-xl font-mono font-bold text-red-400 mt-1 block">
              {metrics?.over_escalations ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-panel-line bg-void/50">
            <span className="text-[10px] text-fog uppercase tracking-wider block">Under-Escalations</span>
            <span className="text-xl font-mono font-bold text-amber-400 mt-1 block">
              {metrics?.under_escalations ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-panel-line bg-void/50">
            <span className="text-[10px] text-fog uppercase tracking-wider block">Policy Version</span>
            <span className="text-xs font-mono font-bold text-cyan mt-2 block truncate">
              {metrics?.has_sufficient_data ? 'SOS_POLICY_V2' : 'SOS_POLICY_V1'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-panel-line bg-void/50">
            <span className="text-[10px] text-fog uppercase tracking-wider block">Precision</span>
            <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">
              {metrics?.precision !== null && metrics?.precision !== undefined
                ? `${(metrics.precision * 100).toFixed(0)}%`
                : 'N/A*'}
            </span>
          </div>
        </div>

        {/* Learning Status Disclaimer */}
        <div className="text-xs text-fog bg-void/50 border border-panel-line rounded-lg p-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan flex-shrink-0" />
          <span>
            {metrics?.status_message ||
              'Accumulated feedback is used in controlled learning cycles to propose policy recalibrations.'}
          </span>
        </div>

        {/* Modal/Report from Last Learning Cycle */}
        {learningReport && (
          <div className="p-4 rounded-xl border border-cyan/40 bg-cyan/10 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Learning Cycle Report ({learningReport.report_id})
              </span>
              <span className="text-[10px] font-mono text-cyan">
                Promoted: {learningReport.active_policy_version}
              </span>
            </div>

            <div className="text-xs text-paper space-y-1 pt-1">
              <div className="font-semibold text-cyan/90">Key Discovered Insights:</div>
              {learningReport.insights.map((ins, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-fog pl-2">
                  <span>•</span>
                  <span>{ins}</span>
                </div>
              ))}

              <div className="font-semibold text-cyan/90 pt-1.5">Proposed Policy Adjustments:</div>
              {learningReport.proposed_adjustments.map((adj, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-fog pl-2">
                  <span>•</span>
                  <span>{adj}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Standard Incident Panels: Details, Priority & Units */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident details */}
        <div className="panel panel-glow p-5">
          <h2 className="text-sm font-semibold text-paper mb-4">Incident Details</h2>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-fog uppercase tracking-wider mb-1">Incident</div>
              <div className="text-lg font-medium text-paper">{incident.name}</div>
              <div className="text-sm text-fog mt-0.5">{incident.id}</div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-cyan mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-fog uppercase tracking-wider">Incident Location</div>
                <div className="text-sm text-paper">{incident.location}</div>
                <div className="text-xs font-mono text-fog mt-0.5">
                  {incident.lat.toFixed(2)}°N, {incident.lng.toFixed(2)}°E
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Wind className="w-4 h-4 text-cyan mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-fog uppercase tracking-wider">Wind → Spread Direction</div>
                <div className="text-sm text-paper">
                  Wind: {currentWeather.windDirectionLabel} at {currentWeather.windSpeed} km/h
                </div>
                <div className="text-sm text-paper mt-0.5">
                  Spread: <span style={{ color: 'var(--risk-high)' }}>Southeast</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-cyan mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-fog uppercase tracking-wider">Population at Risk</div>
                <div className="text-2xl font-mono font-bold text-paper">~12,400</div>
                <div className="text-xs text-fog mt-0.5">Within 10km radius</div>
              </div>
            </div>
          </div>
        </div>

        {/* Response priority */}
        <div className="panel panel-glow p-5">
          <h2 className="text-sm font-semibold text-paper mb-4">Response Priority</h2>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-fog uppercase tracking-wider mb-1">
                Recommended Priority & Safety Decision
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div
                  className="text-3xl font-bold font-mono"
                  style={{
                    color:
                      incident.riskLevel === 'critical'
                        ? 'var(--risk-critical)'
                        : 'var(--risk-medium)',
                  }}
                >
                  {incident.riskLevel === 'critical' ? 'P1' : 'P2'}
                </div>
                <RiskBadge level={incident.riskLevel} />
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan/10 border border-cyan/30 text-cyan">
                  {sosResult?.decision || 'ESCALATION_INITIATED'}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-fog uppercase tracking-wider mb-1">
                <Clock className="w-3 h-3" /> Estimated Response Time
              </div>
              <div className="text-xl font-mono text-paper">25 minutes</div>
              <div className="text-xs text-fog mt-0.5">Nearest units dispatched</div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-fog uppercase tracking-wider mb-1">
                <Compass className="w-3 h-3" /> Containment Status
              </div>
              <div className="text-sm text-paper">{incident.status}</div>
              <div className="w-full h-2 rounded-full bg-white/10 mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: '35%', backgroundColor: 'var(--risk-medium)' }}
                />
              </div>
              <div className="text-xs font-mono text-fog mt-1">35% contained · {incident.area} ha</div>
            </div>
          </div>
        </div>

        {/* Recommended response units */}
        <div className="panel panel-glow p-5">
          <h2 className="text-sm font-semibold text-paper mb-4">Recommended Response Units</h2>
          <div className="space-y-2">
            {responseUnits.map((unit) => (
              <div
                key={unit.type}
                className="flex items-center justify-between p-3 rounded-lg border border-panel-line bg-void/50"
              >
                <div>
                  <div className="text-sm font-medium text-paper">{unit.type}</div>
                  <div className="text-xs text-fog">ETA: {unit.eta}</div>
                </div>
                <div className="text-2xl font-mono font-bold text-cyan">{unit.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="panel panel-glow p-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <h2 className="text-sm font-semibold text-paper">Incident Map View</h2>
          <span className="text-xs font-mono text-fog">Location & High-Resolution Satellite Context</span>
        </div>
        <div className="h-[340px] sm:h-[420px] lg:h-[480px] rounded-lg overflow-hidden">
          <MapView
            center={[incident.lat, incident.lng]}
            zoom={8}
            height="100%"
            showLegend={false}
            events={[incident]}
          />
        </div>
      </div>
    </div>
  );
}
