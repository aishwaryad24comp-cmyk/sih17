import React, { useState } from "react";
import { X, ExternalLink, ChevronDown, ChevronUp, MapPin, Users, IndianRupee, Layers } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import RiskStamp from "../shared/RiskStamp";

function formatDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val) || "-";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatNumber(val) {
  if (val === null || val === undefined || val === "" || isNaN(Number(val))) return "-";
  return Number(val).toLocaleString("en-IN");
}

function formatCompensation(val) {
  if (val === null || val === undefined || val === "" || isNaN(Number(val))) return "-";
  const num = Number(val);
  if (num >= 1e7) {
    return `₹${(num / 1e7).toFixed(2)} Cr`;
  }
  return `₹${num.toLocaleString("en-IN")}`;
}

function formatRatePerHa(compVal, areaVal) {
  const comp = Number(compVal);
  const area = Number(areaVal);
  if (!compVal || !areaVal || isNaN(comp) || isNaN(area) || area <= 0) return "-";
  const rate = comp / area;
  if (rate >= 1e7) {
    return `₹${(rate / 1e7).toFixed(2)} Cr / ha`;
  }
  return `₹${Math.round(rate).toLocaleString("en-IN")} / ha`;
}

export default function ProjectDetailsTable({ project, onOpenCaseFile, onClose }) {
  const { colors } = useTheme();
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);

  if (!project) return null;

  // Read fields from BOTH camelCase and snake_case
  const id = project.id || project.project_id || project.projectId || "-";
  const projectType = project.projectType || project.project_type || "-";
  const department = project.department || project.implementing_department || "-";
  const status = project.status || (project.delayed === "Y" ? "Delayed" : "Ongoing");
  const verificationStatus =
    project.verificationStatus ||
    (project.sourceDocument ? "Verified — matches source document" : "Self-reported — no source document");

  const village = project.village || project.village_name || "-";
  const district = project.district || "-";
  const state = project.state || "-";
  const lat = project.lat ?? project.latitude;
  const lng = project.lng ?? project.longitude;
  const latLngStr =
    lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))
      ? `${Number(lat).toFixed(4)}° N, ${Number(lng).toFixed(4)}° E`
      : "-";

  const landArea = project.landAreaHectares ?? project.land_area_hectares;
  const familiesAffected = project.familiesAffected ?? project.families_affected;
  const compAssessed = project.compensationAssessed ?? project.compensation_assessed_inr ?? project.projectBudget ?? project.project_budget;
  const compDisbursedPct = project.compensationDisbursedPct ?? project.compensation_disbursed_pct;

  const legalDisputes = project.legalDisputes ?? project.legal_disputes_count;
  const rrProgressPct = project.rrProgressPct ?? project.rr_progress_pct;
  const stakeholderResponsiveness = project.stakeholderResponsiveness || project.stakeholder_responsiveness || "-";

  const riskLevel = project.riskLevel || (project.riskScore >= 65 ? "High" : project.riskScore >= 35 ? "Medium" : "Low");
  const riskScore = project.riskScore ?? project.predicted_risk_pct ?? (project.risk_score_raw ? Math.round(project.risk_score_raw * 100) : null);
  const predictedDelayDays = project.overallDelayDays ?? project.delay_days;
  const approvalStage = project.approvalStage || project.approval_stage || "-";
  const notificationDate = project.notificationDate || project.notification_date;
  const lastActivityDate = project.lastActivityDate || project.last_activity_date;
  const deptAvgDelayDays = project.historicalDeptAvgDelayDays ?? project.historical_dept_avg_delay_days;

  const sections = [
    {
      title: "Identification",
      rows: [
        { label: "Project ID", value: <span className="font-mono text-xs font-semibold">{id}</span> },
        { label: "Project type", value: projectType },
        { label: "Department", value: department },
        { label: "Status", value: status },
        { label: "Verification status", value: verificationStatus },
      ],
    },
    {
      title: "Location",
      rows: [
        { label: "Village", value: village },
        { label: "District", value: district },
        { label: "State", value: state },
        { label: "Latitude / Longitude", value: latLngStr },
      ],
    },
    {
      title: "Land & compensation",
      rows: [
        { label: "Land area (ha)", value: formatNumber(landArea) },
        { label: "Families affected", value: formatNumber(familiesAffected) },
        { label: "Compensation assessed", value: formatCompensation(compAssessed) },
        { label: "Compensation disbursed (%)", value: compDisbursedPct !== undefined && compDisbursedPct !== null && !isNaN(Number(compDisbursedPct)) ? `${compDisbursedPct}%` : "-" },
        { label: "Rate per hectare", value: formatRatePerHa(compAssessed, landArea) },
      ],
    },
    {
      title: "Legal & R&R",
      rows: [
        { label: "Legal disputes", value: formatNumber(legalDisputes) },
        { label: "R&R progress (%)", value: rrProgressPct !== undefined && rrProgressPct !== null && !isNaN(Number(rrProgressPct)) ? `${rrProgressPct}%` : "-" },
        { label: "Stakeholder responsiveness", value: stakeholderResponsiveness },
      ],
    },
    {
      title: "Risk & schedule",
      rows: [
        { label: "Risk level", value: <RiskStamp level={riskLevel} /> },
        { label: "Risk score", value: riskScore !== null && riskScore !== undefined ? `${riskScore}/100` : "-" },
        { label: "Predicted delay (days)", value: predictedDelayDays !== undefined && predictedDelayDays !== null && !isNaN(Number(predictedDelayDays)) ? (Number(predictedDelayDays) >= 0 ? `+${predictedDelayDays} days` : `${predictedDelayDays} days`) : "-" },
        { label: "Approval stage", value: approvalStage },
        { label: "Notification date", value: formatDate(notificationDate) },
        { label: "Last activity date", value: formatDate(lastActivityDate) },
        { label: "Dept. avg delay (days)", value: deptAvgDelayDays !== undefined && deptAvgDelayDays !== null && !isNaN(Number(deptAvgDelayDays)) ? `${deptAvgDelayDays} days` : "-" },
      ],
    },
  ];

  return (
    <div
      className="rounded-lg border overflow-hidden flex flex-col transition-all duration-300 shadow-sm"
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      {/* Sticky Table Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 border-b flex items-center justify-between gap-2 flex-wrap"
        style={{ backgroundColor: colors.surfaceMuted, borderColor: colors.border }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-xs truncate" style={{ color: colors.text }}>
            Summary — <span className="font-mono text-xs">{id}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenCaseFile && (
            <button
              onClick={onOpenCaseFile}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono font-medium tracking-wide transition-colors cursor-pointer"
              style={{
                backgroundColor: colors.accent,
                color: "#ffffff",
              }}
            >
              <ExternalLink size={12} />
              Open case file
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              title="Close details"
              className="p-1 rounded hover:opacity-80 transition-opacity"
              style={{ color: colors.textMuted }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* COMPACT SUMMARY VIEW CARD */}
      <div className="p-4 space-y-3" style={{ backgroundColor: colors.surface }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <RiskStamp level={riskLevel} />
          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: colors.accentSoft, color: colors.accent }}>
            {projectType}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin size={13} style={{ color: colors.accent }} className="shrink-0" />
            <span className="truncate" style={{ color: colors.text }}>
              {district}, {state}
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <Layers size={13} style={{ color: colors.accent }} className="shrink-0" />
            <span className="truncate" style={{ color: colors.text }}>
              {department}
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <Users size={13} style={{ color: colors.accent }} className="shrink-0" />
            <span className="truncate" style={{ color: colors.text }}>
              {formatNumber(familiesAffected)} families
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <IndianRupee size={13} style={{ color: colors.accent }} className="shrink-0" />
            <span className="truncate font-semibold" style={{ color: colors.text }}>
              {formatCompensation(compAssessed)}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t flex items-center justify-between text-[11px]" style={{ borderColor: colors.border }}>
          <span style={{ color: colors.textMuted }}>
            Land: <strong style={{ color: colors.text }}>{formatNumber(landArea)} ha</strong>
          </span>
          <span style={{ color: colors.textMuted }}>
            Delay: <strong style={{ color: colors.risk.high }}>+{predictedDelayDays || 0}d</strong>
          </span>
          <span style={{ color: colors.textMuted }}>
            Disbursed: <strong style={{ color: colors.text }}>{compDisbursedPct || 0}%</strong>
          </span>
        </div>
      </div>

      {/* TOGGLE FULL BREAKDOWN BUTTON */}
      <button
        onClick={() => setShowFullBreakdown((v) => !v)}
        className="w-full py-2 px-4 border-t flex items-center justify-center gap-1 text-[11px] font-mono font-medium transition-colors cursor-pointer"
        style={{
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          color: colors.textMuted,
        }}
      >
        {showFullBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showFullBreakdown ? "Hide full table breakdown" : "Show full table breakdown"}
      </button>

      {/* FULL BREAKDOWN TABLE (Collapsible / Max Height) */}
      {showFullBreakdown && (
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto border-t" style={{ borderColor: colors.border }}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
                <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider w-1/3" style={{ color: colors.textFaint }}>
                  Field
                </th>
                <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider w-2/3" style={{ color: colors.textFaint }}>
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.map((sec) => (
                <React.Fragment key={sec.title}>
                  <tr style={{ backgroundColor: colors.surfaceMuted, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>
                    <td colSpan={2} className="px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.accent }}>
                      {sec.title}
                    </td>
                  </tr>
                  {sec.rows.map((r, idx) => (
                    <tr
                      key={r.label}
                      className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{
                        backgroundColor: idx % 2 === 1 ? colors.surfaceMuted : "transparent",
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      <td className="px-4 py-2 font-medium text-[12px] align-top" style={{ color: colors.textMuted }}>
                        {r.label}
                      </td>
                      <td className="px-4 py-2 text-[12px] align-top" style={{ color: colors.text }}>
                        {r.value}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
