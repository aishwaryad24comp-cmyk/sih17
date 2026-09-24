import { IndianRupee, Users, Ruler } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

function fmtCrore(v) {
  if (!v) return "₹0";
  return `₹${(v / 1e7).toFixed(2)} Cr`;
}

// Feature #13 — Landowner Portal: compensation status, in the terms a
// landowner actually cares about (amount assessed, how much has reached
// them, and whether legal disputes are holding up the rest) rather than
// the model-facing fields (compensationDisbursedPct, legalDisputes count)
// used verbatim on the official dashboard.
export default function CompensationStatusCard({ project }) {
  const { colors } = useTheme();
  const assessed = project.compensationAssessed || 0;
  const disbursedPct = project.compensationDisbursedPct ?? 0;
  const disbursedAmount = Math.round(assessed * (disbursedPct / 100));

  return (
    <div className="rounded-lg border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <div className="flex items-center gap-2 mb-4">
        <IndianRupee size={16} style={{ color: colors.accent }} />
        <span className="font-mono text-[11px] tracking-widest" style={{ color: colors.accent }}>
          COMPENSATION STATUS
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span style={{ color: colors.textMuted }}>Disbursed so far</span>
          <span className="font-semibold" style={{ color: colors.text }}>
            {disbursedPct}%
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${disbursedPct}%`, backgroundColor: disbursedPct >= 100 ? colors.risk.low : colors.accent }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs mb-1" style={{ color: colors.textFaint }}>
            Amount assessed
          </div>
          <div className="font-semibold" style={{ color: colors.text }}>
            {fmtCrore(assessed)}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: colors.textFaint }}>
            Amount received
          </div>
          <div className="font-semibold" style={{ color: colors.text }}>
            {fmtCrore(disbursedAmount)}
          </div>
        </div>
      </div>

      {project.legalDisputes > 0 && (
        <div
          className="mt-4 pt-4 border-t text-sm"
          style={{ borderColor: colors.border, color: colors.risk.high }}
        >
          {project.legalDisputes} active legal dispute{project.legalDisputes > 1 ? "s are" : " is"} currently
          holding up part of this case.
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs" style={{ borderColor: colors.border, color: colors.textMuted }}>
        <span className="flex items-center gap-1.5">
          <Ruler size={12} /> {project.landAreaHectares} hectares
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={12} /> {project.familiesAffected} families affected
        </span>
      </div>
    </div>
  );
}
