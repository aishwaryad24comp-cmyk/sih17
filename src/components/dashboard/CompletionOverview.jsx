import { CheckCircle2, IndianRupee, CalendarClock, History } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

function fmtCrore(v) {
  return `₹${(v / 1e7).toFixed(2)} Cr`;
}

export default function CompletionOverview({ project }) {
  const { colors } = useTheme();
  const overrunDays = Math.max(0, (project.actualDurationDays || 0) - (project.plannedDurationDays || 0));
  const budgetOverrun = project.estimatedCostOverrun || 0;

  return (
    <div className="rounded-lg border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={16} style={{ color: colors.risk.low }} />
        <span className="font-mono text-[11px] tracking-widest" style={{ color: colors.accent }}>
          22 · COMPLETION & OUTCOME OVERVIEW
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-xs mb-1 flex items-center gap-1" style={{ color: colors.textFaint }}>
            <CalendarClock size={12} /> Planned duration
          </div>
          <div className="font-semibold" style={{ color: colors.text }}>
            {project.plannedDurationDays}d
          </div>
        </div>
        <div>
          <div className="text-xs mb-1 flex items-center gap-1" style={{ color: colors.textFaint }}>
            <CalendarClock size={12} /> Actual duration
          </div>
          <div className="font-semibold" style={{ color: overrunDays > 0 ? colors.risk.high : colors.risk.low }}>
            {project.actualDurationDays}d {overrunDays > 0 && `(+${overrunDays}d)`}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1 flex items-center gap-1" style={{ color: colors.textFaint }}>
            <IndianRupee size={12} /> Final budget overrun
          </div>
          <div className="font-semibold" style={{ color: budgetOverrun > 0 ? colors.risk.high : colors.risk.low }}>
            {budgetOverrun > 0 ? fmtCrore(budgetOverrun) : "None"}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: colors.textFaint }}>
            Outcome
          </div>
          <div className="font-semibold" style={{ color: colors.text }}>
            {project.finalOutcome || "—"}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: colors.textFaint }}>
          <History size={12} /> RISK-FLAG HISTORY
        </div>
        {project.delayDrivers?.length ? (
          <ul className="space-y-1">
            {project.delayDrivers.map((d) => (
              <li key={d.key} className="text-sm flex justify-between" style={{ color: colors.text }}>
                <span>{d.label}</span>
                <span style={{ color: colors.textMuted }}>impact {d.impact}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: colors.textMuted }}>
            No risk flags were raised during this project's lifecycle.
          </p>
        )}
      </div>
    </div>
  );
}
