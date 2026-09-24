import { Activity, Sparkles } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import SectionHeader from "../shared/SectionHeader";
import CustomTooltip from "../shared/CustomTooltip";
import Skeleton from "../shared/Skeleton";
import { useProjectExplain, useProjectRecommendation } from "../../hooks/useProjectExplain";

// Fixed taxonomy of delay-driver categories, always plotted in this same
// order. A project only ever has 1-4 *active* drivers, so charting just
// those points degenerates into a single spike or line (as few as two
// axes draws a straight line, not a spider shape). Plotting every known
// category — with 0 impact for the ones that don't apply — keeps the
// chart's shape stable and comparable across projects, and reads as an
// actual radar rather than a stray line.
const DRIVER_TAXONOMY = [
  { key: "compensation", label: "Compensation" },
  { key: "legal", label: "Legal disputes" },
  { key: "documentation", label: "Documentation" },
  { key: "rr", label: "Rehab. & resettlement" },
  { key: "coordination", label: "Coordination" },
  { key: "approval", label: "Approval backlog" },
  { key: "objection", label: "Objections" },
];

export default function DelayDriverPanel({ project }) {
  const { colors } = useTheme();
  const { data: explain, isLoading: explainLoading } = useProjectExplain(project?.id);
  const { data: rec, isLoading: recLoading } = useProjectRecommendation(project?.id);

  const activeDrivers = explain?.delayDrivers || [];
  const activeByKey = Object.fromEntries(activeDrivers.map((d) => [d.key, d]));
  const chartData = DRIVER_TAXONOMY.map((cat) => ({
    label: cat.label,
    fullLabel: activeByKey[cat.key]?.label || cat.label,
    impact: activeByKey[cat.key]?.impact || 0,
  }));
  const hasAnyImpact = chartData.some((d) => d.impact > 0);

  return (
    <div className="rounded-lg border p-5 h-[520px] flex flex-col" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <SectionHeader
        index="02"
        eyebrow="MODEL INPUTS"
        title={project ? `Delay driver composition · ${project.projectType}` : "Select a project"}
        icon={Activity}
      />
      <div className="flex-1 min-h-0">
        {explainLoading && <Skeleton className="h-full w-full" />}
        {!explainLoading && project && hasAnyImpact && (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} outerRadius="65%">
              <PolarGrid stroke={colors.chartGrid} />
              <PolarAngleAxis dataKey="label" tick={{ fill: colors.textMuted, fontSize: 10.5 }} />
              <PolarRadiusAxis tick={{ fill: colors.textFaint, fontSize: 9 }} axisLine={false} tickCount={4} />
              <Tooltip content={<CustomTooltip />} formatter={(value, _name, item) => [value, item?.payload?.fullLabel]} />
              <Radar dataKey="impact" name="Impact" stroke={colors.accent} fill={colors.accent} fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        )}
        {!explainLoading && project && !hasAnyImpact && (
          <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textMuted }}>
            No material delay drivers detected — project on schedule.
          </div>
        )}
        {!project && (
          <div className="h-full flex items-center justify-center text-sm" style={{ color: colors.textFaint }}>
            Choose a project from the register to see its risk breakdown.
          </div>
        )}
      </div>
      {project && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-widest mb-1.5" style={{ color: colors.accent }}>
            <Sparkles size={12} /> AI RECOMMENDED MITIGATION
          </div>
          {recLoading ? (
            <Skeleton className="h-4 w-3/4" />
          ) : (
            <p className="text-sm" style={{ color: colors.text }}>
              {rec?.recommendedAction || "Project is on schedule and risks are well within tolerance limits."}
            </p>
          )}
          {rec?.historicalEvidence?.sampleSize > 0 && (
            <p className="text-xs mt-2" style={{ color: colors.textMuted }}>
              Similar past projects with no action taken: {rec.historicalEvidence.avgBudgetOverrunPct}% avg
              budget overrun, {rec.historicalEvidence.shelvingRatePct}% shelved (n={rec.historicalEvidence.sampleSize}).
              {rec.estimatedCostOverrun > 0 &&
                ` Estimated cost overrun if unaddressed: ₹${(rec.estimatedCostOverrun / 1e7).toFixed(1)} Cr.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
