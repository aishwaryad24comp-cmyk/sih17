import { Users } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import SectionHeader from "../shared/SectionHeader";
import Skeleton from "../shared/Skeleton";
import { useOverlapClusters } from "../../hooks/useGisData";

// Feature #10 — Cross-Ministry Overlap Detector. Flags villages where 2+
// departments (Railways, Highways, Electricity Board, etc.) are acquiring
// land within the same rolling window, so they can coordinate a single
// engagement with the community instead of displacing it repeatedly.
export default function OverlapDetectorPanel({ onSelectProject }) {
  const { colors } = useTheme();
  const { data: clusters, isLoading } = useOverlapClusters();

  return (
    <div className="rounded-lg border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <SectionHeader
        index="09"
        eyebrow="COORDINATION"
        title="Cross-ministry overlap detector"
        icon={Users}
      />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isLoading && (!clusters || clusters.length === 0) && (
        <div className="text-sm py-8 text-center" style={{ color: colors.textMuted }}>
          No overlapping departmental acquisitions detected in the current window.
        </div>
      )}

      {!isLoading && clusters?.length > 0 && (
        <ul className="space-y-2.5 max-h-[360px] overflow-y-auto scrollbar-thin">
          {clusters.map((c, idx) => (
            <li
              key={c.key || `cluster-${idx}`}
              className="rounded-md border p-3"
              style={{ borderColor: colors.border, backgroundColor: colors.surfaceMuted }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm" style={{ color: colors.text }}>
                    {c.village || c.district || "District Cluster"}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                    {c.district}, {c.state}
                  </div>
                </div>
                {c.highRiskCount > 0 && (
                  <span
                    className="shrink-0 font-mono text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ color: colors.risk.high, backgroundColor: colors.risk.highBg }}
                  >
                    {c.highRiskCount} HIGH-RISK
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(c.departments || []).map((d) => (
                  <span
                    key={d}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ color: colors.accent, backgroundColor: colors.accentSoft }}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(c.projectIds || []).map((id) => (
                  <button
                    key={id}
                    onClick={() => onSelectProject?.(id)}
                    className="text-[11px] font-mono underline underline-offset-2"
                    style={{ color: colors.textMuted }}
                  >
                    {id}
                  </button>
                ))}
              </div>
              {c.earliestDate && c.latestDate && (
                <div className="text-[10px] font-mono mt-2" style={{ color: colors.textFaint }}>
                  {!isNaN(new Date(c.earliestDate).getTime()) ? new Date(c.earliestDate).toLocaleDateString("en-IN") : "N/A"} –{" "}
                  {!isNaN(new Date(c.latestDate).getTime()) ? new Date(c.latestDate).toLocaleDateString("en-IN") : "N/A"}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
