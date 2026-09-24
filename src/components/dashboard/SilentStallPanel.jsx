import { Bell, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import RiskStamp from "../shared/RiskStamp";
import Skeleton from "../shared/Skeleton";
import { useSilentStalls } from "../../hooks/useGisData";

// "Silent Stall" Alarm. Watches each ongoing project's last-activity date
// and flags it once it's gone quiet for longer than its risk-scaled
// threshold — catching a stall before it becomes an official delay report,
// rather than after.
//
// Presentation is split into two pieces that share this one hook (same
// query cache, same thresholds/data from useGisData.js — nothing here is
// recomputed or refetched separately):
//   - SilentStallBell: the compact top-right notification, always visible.
//   - SilentStallPanel (default export): the full-width alert section that
//     replaces the old permanent block — only mounted while open, and
//     pushes the GIS map down rather than floating over it.

// Compact notification trigger — lives next to the "GIS insights" heading.
export function SilentStallBell({ open, onToggle }) {
  const { colors } = useTheme();
  const { data: stalls, isLoading } = useSilentStalls();
  const count = stalls?.length ?? 0;

  return (
    <button
      onClick={onToggle}
      aria-label="Silent Stall Alerts"
      aria-expanded={open}
      title="Silent Stall Alerts"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border-[1.5px] transition-colors cursor-pointer hover:brightness-95"
      style={{
        borderColor: count > 0 ? colors.risk.high : colors.border,
        backgroundColor: open ? colors.risk.highBg : colors.surface,
        color: count > 0 ? colors.risk.high : colors.textMuted,
      }}
    >
      <Bell size={15} />
      <span className="hidden sm:inline text-xs font-mono font-semibold tracking-wide">
        SILENT STALL
      </span>
      {!isLoading && (
        <span
          className="flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-bold font-mono leading-none"
          style={{
            backgroundColor: count > 0 ? colors.risk.high : colors.borderStrong,
            color: "#fff",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// Full-width expanded alert section. Rendered by the page only while open
// (see GisInsightsPage), so it takes the full content-area width and pushes
// the GIS map down instead of overlaying it.
export default function SilentStallPanel({ onSelectProject, onClose }) {
  const { colors } = useTheme();
  const { data: stalls, isLoading } = useSilentStalls();

  const count = stalls?.length ?? 0;
  const highRiskStalls = stalls?.filter((p) => p.riskLevel === "High") ?? [];

  const handleSelect = (id) => {
    onSelectProject?.(id);
    onClose?.();
  };

  return (
    <div
      className="rounded-lg border-2 p-5"
      style={{ backgroundColor: colors.surface, borderColor: colors.risk.high }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <Bell size={16} style={{ color: colors.risk.high }} />
          <h2 className="font-slab text-lg font-semibold" style={{ color: colors.text }}>
            Silent Stall Alerts
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isLoading && (
            <span
              className="font-mono text-[11px] font-semibold px-2.5 py-1 rounded"
              style={{ color: colors.risk.high, backgroundColor: colors.risk.highBg }}
            >
              {count} PROJECT{count === 1 ? "" : "S"}
            </span>
          )}
          {highRiskStalls.length > 0 && (
            <span
              className="font-mono text-[11px] font-semibold px-2.5 py-1 rounded"
              style={{ color: colors.risk.high, backgroundColor: colors.risk.highBg }}
            >
              {highRiskStalls.length} HIGH-RISK
            </span>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1 font-mono text-[11px] font-semibold px-2.5 py-1 rounded border transition-colors hover:brightness-95"
            style={{ color: colors.textMuted, borderColor: colors.border }}
          >
            <X size={13} /> CLOSE
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!isLoading && count === 0 && (
        <div className="text-sm py-8 text-center" style={{ color: colors.textMuted }}>
          No projects have gone quiet past their threshold. All ongoing cases show recent activity.
        </div>
      )}

      {!isLoading && count > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto scrollbar-thin pr-1">
          {stalls.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => handleSelect(p.id)}
                className="w-full h-full text-left flex flex-col gap-2.5 rounded-md border p-3.5 transition-colors hover:border-current"
                style={{ borderColor: colors.border, backgroundColor: colors.surfaceMuted }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: colors.text }}>
                      {p.projectType} · {p.id}
                    </div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: colors.textMuted }}>
                      {p.village} · {p.district}, {p.state}
                    </div>
                  </div>
                  <RiskStamp level={p.riskLevel} />
                </div>
                <div
                  className="flex items-center justify-between gap-2 pt-2.5 border-t"
                  style={{ borderColor: colors.border }}
                >
                  <span
                    className="font-mono text-xs font-semibold"
                    style={{
                      color:
                        p.daysSinceActivity >= p.stallThreshold * 2 ? colors.risk.high : colors.risk.medium,
                    }}
                  >
                    {p.daysSinceActivity}d quiet
                  </span>
                  <div className="text-right">
                    <div className="text-[10px] font-mono" style={{ color: colors.textFaint }}>
                      Last activity
                    </div>
                    <div className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
                      {p.lastActivityDate && !isNaN(new Date(p.lastActivityDate).getTime())
                        ? new Date(p.lastActivityDate).toLocaleDateString("en-IN")
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
