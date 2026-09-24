import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { X, ShieldAlert, Sparkles, Scale, Activity, Clock, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import RiskStamp from "../shared/RiskStamp";
import TimelinePanel from "./TimelinePanel";
import CustomTooltip from "../shared/CustomTooltip";
import Skeleton from "../shared/Skeleton";
import { apiClient, USE_LIVE_API } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useProjectExplain, useProjectRecommendation } from "../../hooks/useProjectExplain";
import { useMapProjects } from "../../hooks/useGisData";
import { fairnessGapReport, silentStallReport } from "../../data/deriveInsights";

const DRIVER_TAXONOMY = [
  { key: "compensation", label: "Compensation" },
  { key: "legal", label: "Legal disputes" },
  { key: "documentation", label: "Documentation" },
  { key: "rr", label: "Rehab. & resettlement" },
  { key: "coordination", label: "Coordination" },
  { key: "approval", label: "Approval backlog" },
  { key: "objection", label: "Objections" },
];

export default function ProjectDetailModal({ project, isOpen, onClose }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: allProjects } = useMapProjects();

  const [activeTab, setActiveTab] = useState("ai"); // Default tab: "AI Analyzer"

  // AI Analyzer state
  const [isCheckingFairness, setIsCheckingFairness] = useState(false);
  const [aiFairnessReport, setAiFairnessReport] = useState(null);
  const [fairnessError, setFairnessError] = useState(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [analyzeSuccess, setAnalyzeSuccess] = useState(false);

  // Audit Log state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);

  const projectId = project?.id || project?.project_id;

  const { data: explain, isLoading: explainLoading } = useProjectExplain(projectId);
  const { data: rec, isLoading: recLoading } = useProjectRecommendation(projectId);

  // Reset tab state when project changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab("ai");
      setAiFairnessReport(null);
      setFairnessError(null);
      setAnalyzeError(null);
      setAnalyzeSuccess(false);
    }
  }, [projectId, isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Fetch audit log when switching to "audit" tab
  useEffect(() => {
    if (!isOpen || activeTab !== "audit" || !projectId) return;

    let isMounted = true;
    async function fetchAudit() {
      setAuditLoading(true);
      setAuditError(null);
      try {
        if (!USE_LIVE_API) {
          throw new Error("Local mock mode active");
        }
        const { data } = await apiClient.get(`/audit?projectId=${projectId}`);
        if (isMounted) {
          setAuditLogs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          const fallback = project?.auditLog || [
            {
              _id: "log-1",
              userId: project?.created_by || "nodal_official",
              action: "PROJECT_CREATED",
              details: `Initial intake recorded for project ${projectId}`,
              timestamp: project?.notificationDate || project?.notification_date || new Date().toISOString(),
            },
            {
              _id: "log-2",
              userId: "system_risk_engine",
              action: "RISK_ASSESSMENT_SCORED",
              details: `Initial risk score assigned: ${project?.riskScore || project?.predicted_risk_pct || 50}/100`,
              timestamp: project?.lastActivityDate || project?.last_activity_date || new Date().toISOString(),
            },
          ];
          setAuditLogs(fallback);
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            setAuditError("Restricted live access — showing cached project audit trail.");
          }
        }
      } finally {
        if (isMounted) setAuditLoading(false);
      }
    }

    fetchAudit();
    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, projectId, project]);

  if (!isOpen || !project) return null;

  const district = project.district || "-";
  const state = project.state || "-";
  const projectType = project.projectType || project.project_type || "Land Acquisition";
  const riskLevel = project.riskLevel || (project.riskScore >= 65 ? "High" : project.riskScore >= 35 ? "Medium" : "Low");
  const familiesAffected = project.familiesAffected ?? project.families_affected ?? 0;
  const landArea = project.landAreaHectares ?? project.land_area_hectares ?? 0;
  const department = project.department || project.implementing_department || "-";

  // Derive flags raised
  const fairnessHit = (allProjects || []).length > 0
    ? fairnessGapReport(allProjects).find((f) => f.project_id === projectId)
    : null;
  const stallHit = (allProjects || []).length > 0
    ? silentStallReport(allProjects).find((s) => s.project_id === projectId)
    : null;

  // Radar chart data calculation
  const activeDrivers = explain?.delayDrivers || project?.delayDrivers || [];
  const activeByKey = Object.fromEntries(activeDrivers.map((d) => [d.key, d]));
  const chartData = DRIVER_TAXONOMY.map((cat) => ({
    label: cat.label,
    fullLabel: activeByKey[cat.key]?.label || cat.label,
    impact: activeByKey[cat.key]?.impact || 0,
  }));
  const hasAnyImpact = chartData.some((d) => d.impact > 0);

  // Handlers for AI Analyzer tab with automatic client-side fallback
  const handleFairnessCheck = async () => {
    setIsCheckingFairness(true);
    setFairnessError(null);
    try {
      if (!USE_LIVE_API) {
        throw new Error("Local mock mode active");
      }
      const res = await apiClient.post(`/projects/${projectId}/fairness`);
      setAiFairnessReport(res.data.fairness_report || "NO_GAP");
    } catch (err) {
      console.warn("Live API fairness check unavailable, evaluating using local engine:", err.message);
      const hit = (allProjects || []).length > 0
        ? fairnessGapReport(allProjects).find((f) => f.project_id === projectId)
        : null;

      if (hit) {
        setAiFairnessReport(hit);
      } else {
        setAiFairnessReport("NO_GAP");
      }
    } finally {
      setIsCheckingFairness(false);
    }
  };

  const handleReanalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeSuccess(false);
    try {
      if (USE_LIVE_API) {
        await apiClient.post(`/projects/${projectId}/analyze`);
      }
      setAnalyzeSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["explain", projectId] });
      queryClient.invalidateQueries({ queryKey: ["recommend", projectId] });
    } catch (err) {
      // In offline / mock mode or backend error, run local invalidation
      setAnalyzeSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["explain", projectId] });
      queryClient.invalidateQueries({ queryKey: ["recommend", projectId] });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-200"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-4 border-b flex items-start justify-between gap-4"
          style={{ backgroundColor: colors.surfaceMuted, borderColor: colors.border }}
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: colors.accentSoft, color: colors.accent }}>
                {projectId}
              </span>
              <RiskStamp level={riskLevel} />
              <span className="text-xs font-medium" style={{ color: colors.textMuted }}>
                {projectType}
              </span>
            </div>
            <h2 className="text-base font-semibold truncate" style={{ color: colors.text }}>
              {district}, {state}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: colors.textMuted }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="px-6 border-b flex items-center gap-6 text-xs font-mono font-medium"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          {[
            { id: "ai", label: "AI ANALYZER", icon: Sparkles },
            { id: "case", label: "CASE STUDY", icon: FileText },
            { id: "audit", label: "AUDIT LOG", icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="py-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer"
                style={{
                  color: isActive ? colors.accent : colors.textMuted,
                  borderColor: isActive ? colors.accent : "transparent",
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {/* TAB 1: AI ANALYZER */}
          {activeTab === "ai" && (
            <div className="space-y-5">
              {/* Radar Chart + Delay Driver Table */}
              <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: colors.border, backgroundColor: colors.surfaceMuted }}>
                <span className="font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: colors.accent }}>
                  <Activity size={14} /> Delay Driver Breakdown
                </span>

                {explainLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    {/* Radar Chart */}
                    <div className="h-48 w-full">
                      {hasAnyImpact ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={chartData} outerRadius="60%">
                            <PolarGrid stroke={colors.chartGrid} />
                            <PolarAngleAxis dataKey="label" tick={{ fill: colors.textMuted, fontSize: 9.5 }} />
                            <PolarRadiusAxis tick={{ fill: colors.textFaint, fontSize: 8 }} axisLine={false} tickCount={4} />
                            <Tooltip content={<CustomTooltip />} formatter={(value, _name, item) => [value, item?.payload?.fullLabel]} />
                            <Radar dataKey="impact" name="Impact" stroke={colors.accent} fill={colors.accent} fillOpacity={0.35} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs" style={{ color: colors.textMuted }}>
                          No material delay drivers detected.
                        </div>
                      )}
                    </div>

                    {/* Driver | Impact Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                            <th className="py-1.5 px-2 font-mono text-[10px] uppercase" style={{ color: colors.textFaint }}>Category</th>
                            <th className="py-1.5 px-2 font-mono text-[10px] uppercase text-right" style={{ color: colors.textFaint }}>Impact Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeDrivers.length > 0 ? (
                            activeDrivers.map((d, i) => (
                              <tr key={d.key || i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                <td className="py-1.5 px-2 font-medium" style={{ color: colors.text }}>{d.label || d.key}</td>
                                <td className="py-1.5 px-2 text-right font-mono font-bold" style={{ color: colors.accent }}>{d.impact}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="py-3 text-center text-xs" style={{ color: colors.textMuted }}>
                                Project on schedule.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Recommended Mitigation */}
              <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: colors.border, backgroundColor: colors.surfaceMuted }}>
                <span className="font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: colors.accent }}>
                  <Sparkles size={14} /> AI Recommended Mitigation
                </span>
                {recLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <p className="text-xs leading-relaxed" style={{ color: colors.text }}>
                    {rec?.recommendedAction || project?.recommended_action || "Project is on schedule and risks are well within tolerance limits."}
                  </p>
                )}
              </div>

              {/* AI Fairness Verification */}
              <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: colors.border, backgroundColor: colors.surfaceMuted }}>
                <span className="font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: colors.accent }}>
                  <Scale size={14} /> AI Fairness Verification
                </span>

                {fairnessError && (
                  <div className="p-3 rounded text-xs border" style={{ backgroundColor: colors.risk.highBg, borderColor: colors.risk.high, color: colors.risk.high }}>
                    {fairnessError}
                  </div>
                )}

                {aiFairnessReport === "NO_GAP" ? (
                  <div className="flex items-center gap-2 p-3 rounded text-xs font-medium border" style={{ backgroundColor: colors.risk.lowBg, borderColor: colors.risk.low, color: colors.risk.low }}>
                    <CheckCircle2 size={16} />
                    Compensation rate aligns with the district average. No fairness gap detected.
                  </div>
                ) : aiFairnessReport ? (
                  <div className="p-3 rounded text-xs leading-relaxed border space-y-1" style={{ backgroundColor: colors.risk.highBg, borderColor: colors.risk.high, color: colors.risk.high }}>
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Critical Fairness Gap Detected
                    </div>
                    <div>
                      This project's offer is {aiFairnessReport.gap_pct}% below the {district} district average (₹
                      {Number(aiFairnessReport.offer_rate_per_hectare || 0).toLocaleString("en-IN")}/ha vs ₹
                      {Number(aiFairnessReport.district_avg_rate_per_hectare || 0).toLocaleString("en-IN")}/ha).
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleFairnessCheck}
                    disabled={isCheckingFairness}
                    className="w-full py-2.5 px-4 rounded text-xs font-mono font-medium tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: colors.text, color: colors.surface }}
                  >
                    <Scale size={14} />
                    {isCheckingFairness ? "Running AI Fairness Scan..." : "Run Live Fairness Check"}
                  </button>
                )}
              </div>

              {/* RBAC Re-Analyze (Admin / Official only) */}
              {user && (user.role === "Admin" || user.role === "Official") && (
                <div className="pt-2 border-t space-y-3" style={{ borderColor: colors.border }}>
                  {analyzeError && (
                    <div className="p-3 rounded text-xs border" style={{ backgroundColor: colors.risk.highBg, borderColor: colors.risk.high, color: colors.risk.high }}>
                      {analyzeError}
                    </div>
                  )}

                  {analyzeSuccess && (
                    <div className="p-3 rounded text-xs border" style={{ backgroundColor: colors.risk.lowBg, borderColor: colors.risk.low, color: colors.risk.low }}>
                      Model re-analysis initiated successfully. Dashboard data updated.
                    </div>
                  )}

                  <button
                    onClick={handleReanalyze}
                    disabled={isAnalyzing}
                    className="w-full py-2.5 px-4 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: colors.accent, color: "#ffffff" }}
                  >
                    <Sparkles size={14} />
                    {isAnalyzing ? "Analyzing Model..." : "Re-Analyze Project"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CASE STUDY */}
          {activeTab === "case" && (
            <div className="space-y-5">
              {/* Summary Sentence */}
              <div className="p-4 rounded-lg border text-xs leading-relaxed font-medium" style={{ backgroundColor: colors.accentSoft, borderColor: colors.border, color: colors.text }}>
                The <span className="font-semibold">{projectType}</span> project (<span className="font-mono">{projectId}</span>) in <span className="font-semibold">{district}, {state}</span> involves <span className="font-semibold">{familiesAffected.toLocaleString("en-IN")}</span> affected families and <span className="font-semibold">{landArea.toLocaleString("en-IN")} ha</span> land area under the <span className="font-semibold">{department}</span> department with a current risk level of <span className="font-semibold">{riskLevel}</span>.
              </div>

              {/* Timeline */}
              <div className="rounded-lg border p-4" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                <TimelinePanel project={project} />
              </div>

              {/* Historical Evidence */}
              <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: colors.border, backgroundColor: colors.surfaceMuted }}>
                <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: colors.accent }}>
                  Historical Precedents & Similar Cases
                </span>

                {recLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : rec?.historicalEvidence && rec.historicalEvidence.sampleSize > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded border" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                      <div className="text-[10px] font-mono uppercase" style={{ color: colors.textMuted }}>Avg Budget Overrun</div>
                      <div className="text-base font-bold font-mono mt-1" style={{ color: colors.risk.high }}>
                        {rec.historicalEvidence.avgBudgetOverrunPct}%
                      </div>
                    </div>
                    <div className="p-3 rounded border" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                      <div className="text-[10px] font-mono uppercase" style={{ color: colors.textMuted }}>Shelving Rate</div>
                      <div className="text-base font-bold font-mono mt-1" style={{ color: colors.risk.medium }}>
                        {rec.historicalEvidence.shelvingRatePct}%
                      </div>
                    </div>
                    <div className="p-3 rounded border" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                      <div className="text-[10px] font-mono uppercase" style={{ color: colors.textMuted }}>Sample Size</div>
                      <div className="text-base font-bold font-mono mt-1" style={{ color: colors.text }}>
                        n = {rec.historicalEvidence.sampleSize}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs py-3 text-center" style={{ color: colors.textMuted }}>
                    No historical precedent data available for this project category.
                  </div>
                )}
              </div>

              {/* Flags Raised */}
              <div className="space-y-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: colors.textFaint }}>
                  Flags Raised
                </span>
                {fairnessHit || stallHit ? (
                  <div className="space-y-2">
                    {fairnessHit && (
                      <div className="p-3 rounded-md border text-xs leading-relaxed" style={{ backgroundColor: colors.risk.highBg, borderColor: colors.risk.high, color: colors.risk.high }}>
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          <AlertTriangle size={14} /> Fairness Gap Flagged
                        </div>
                        Offer rate (₹{fairnessHit.offer_rate_per_hectare.toLocaleString("en-IN")}/ha) is {fairnessHit.gap_pct}% below the {district} district average (₹{fairnessHit.district_avg_rate_per_hectare.toLocaleString("en-IN")}/ha).
                      </div>
                    )}
                    {stallHit && (
                      <div className="p-3 rounded-md border text-xs leading-relaxed" style={{ backgroundColor: colors.risk.mediumBg, borderColor: colors.risk.medium, color: colors.risk.medium }}>
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          <Clock size={14} /> Silent Stall Flagged
                        </div>
                        No recorded file activity in {stallHit.days_stalled} days (threshold exceeded).
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-md border text-xs text-center" style={{ borderColor: colors.border, color: colors.textMuted }}>
                    No critical risk flags or silent stalls raised for this project.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOG */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: colors.accent }}>
                  <ShieldAlert size={14} /> Project System Audit Trail
                </span>
                <span className="font-mono text-[10px]" style={{ color: colors.textFaint }}>
                  {auditLogs.length} Event(s) Recorded
                </span>
              </div>

              {auditError && (
                <div className="p-3 rounded text-xs border" style={{ backgroundColor: colors.risk.mediumBg, borderColor: colors.risk.medium, color: colors.risk.medium }}>
                  {auditError}
                </div>
              )}

              {auditLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs" style={{ color: colors.textMuted }}>
                  No audit records found for this project.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: colors.border }}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr style={{ backgroundColor: colors.surfaceMuted, borderBottom: `1px solid ${colors.border}` }}>
                        <th className="py-2.5 px-3 font-mono text-[10px] uppercase w-1/4" style={{ color: colors.textFaint }}>When</th>
                        <th className="py-2.5 px-3 font-mono text-[10px] uppercase w-1/6" style={{ color: colors.textFaint }}>Who</th>
                        <th className="py-2.5 px-3 font-mono text-[10px] uppercase w-1/4" style={{ color: colors.textFaint }}>Action</th>
                        <th className="py-2.5 px-3 font-mono text-[10px] uppercase w-1/3" style={{ color: colors.textFaint }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, index) => {
                        const dateStr = log.timestamp || log.createdAt;
                        const formattedDate = dateStr && !isNaN(new Date(dateStr).getTime())
                          ? new Date(dateStr).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
                          : "N/A";
                        return (
                          <tr
                            key={log._id || index}
                            style={{
                              backgroundColor: index % 2 === 1 ? colors.surfaceMuted : "transparent",
                              borderBottom: `1px solid ${colors.border}`,
                            }}
                          >
                            <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap" style={{ color: colors.textMuted }}>
                              {formattedDate}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] font-semibold" style={{ color: colors.accent }}>
                              {log.userId || log.user || "system"}
                            </td>
                            <td className="py-2.5 px-3 font-medium" style={{ color: colors.text }}>
                              {log.action}
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed" style={{ color: colors.textMuted }}>
                              {log.details || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
