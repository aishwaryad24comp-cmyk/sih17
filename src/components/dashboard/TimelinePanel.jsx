import { CalendarRange } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import SectionHeader from "../shared/SectionHeader";
import RiskStamp from "../shared/RiskStamp";

export default function TimelinePanel({ project }) {
  const { colors } = useTheme();
  if (!project) return null;

  // Each stage's "actual" position is the planned day plus however many
  // days it slipped, so the planned tick and the completion dot can be
  // drawn at two different spots on the same track. Pending stages have
  // no actual position yet.
  const timeline = project?.timeline || [];
  const withActual = timeline.map((t) => ({
    ...t,
    actualDay: t.status === "pending" ? null : t.plannedDay + (t.delayDays || 0),
  }));
  const maxDay = Math.max(...withActual.map((t) => t.actualDay ?? t.plannedDay), 1);

  return (
    <div className="rounded-lg border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <SectionHeader
        index="05"
        eyebrow="CASE FILE"
        title={`Timeline · ${project.projectType}`}
        icon={CalendarRange}
        right={
          <div className="flex items-center gap-2">
            <RiskStamp level={project.riskLevel} />
            <span className="font-mono text-xs" style={{ color: colors.textFaint }}>
              {project.id}
            </span>
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs" style={{ color: colors.textMuted }}>
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-3 inline-block" style={{ backgroundColor: colors.borderStrong }} /> planned milestone
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: colors.risk.high }} /> completed, overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: colors.risk.low }} /> completed, on time
        </span>
      </div>
      <div className="space-y-4">
        {withActual.map((stage) => {
          const plannedPct = (stage.plannedDay / maxDay) * 100;
          const actualPct = stage.actualDay != null ? (stage.actualDay / maxDay) * 100 : null;
          const dotColor = stage.status === "completed-overdue" ? colors.risk.high : colors.risk.low;
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-sm" style={{ color: colors.text }}>
                {stage.label}
              </div>
              <div className="flex-1 h-6 relative">
                {/* track */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded"
                  style={{ backgroundColor: colors.border }}
                />
                {/* planned milestone: a distinct vertical tick, always shown */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded"
                  style={{ left: `calc(${plannedPct}% - 1px)`, backgroundColor: colors.borderStrong }}
                  title={`Planned day ${stage.plannedDay}`}
                />
                {/* actual completion dot, offset from the planned tick by the delay */}
                {actualPct != null && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
                    style={{ left: `calc(${actualPct}% - 6px)`, backgroundColor: dotColor, borderColor: colors.surface }}
                    title={`Completed day ${stage.actualDay}`}
                  />
                )}
              </div>
              <div className="w-16 shrink-0 text-right text-xs font-mono" style={{ color: stage.delayDays > 0 ? colors.risk.high : colors.textFaint }}>
                {stage.status === "pending" ? "—" : stage.delayDays > 0 ? `+${stage.delayDays}d` : "on time"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
