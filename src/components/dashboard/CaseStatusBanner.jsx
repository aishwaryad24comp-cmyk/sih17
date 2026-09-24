import { CheckCircle2, AlertTriangle, Clock3 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// Feature #13 — Landowner Portal. A landowner shouldn't have to decode
// "riskLevel: High" or a SHAP driver list to know where their case stands,
// so this translates the same underlying fields the official dashboard
// uses into a plain-language status line, with the technical detail still
// available (not hidden) just below for anyone who wants it.
const STATUS_COPY = {
  High: {
    icon: AlertTriangle,
    tone: "high",
    headline: "Your case needs attention",
    body: "This case has been flagged as at higher risk of delay. An official has been notified and corrective steps are being tracked below.",
  },
  Medium: {
    icon: Clock3,
    tone: "medium",
    headline: "Your case is being monitored",
    body: "This case is progressing with some pending items. Check the stages below for what's still outstanding.",
  },
  Low: {
    icon: CheckCircle2,
    tone: "low",
    headline: "Your case is on track",
    body: "No significant delays are currently flagged for this case.",
  },
};

export default function CaseStatusBanner({ project }) {
  const { colors } = useTheme();
  const copy = STATUS_COPY[project.riskLevel] || STATUS_COPY.Low;
  const Icon = copy.icon;
  const tone = colors.risk[copy.tone];
  const toneBg = colors.risk[`${copy.tone}Bg`];

  return (
    <div className="rounded-lg border p-5 flex items-start gap-3" style={{ backgroundColor: toneBg, borderColor: colors.border }}>
      <Icon size={22} style={{ color: tone }} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-slab font-semibold text-base" style={{ color: tone }}>
          {copy.headline}
        </div>
        <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
          {copy.body}
        </p>
        {project.status === "Stalled" && (
          <p className="text-sm mt-2 font-medium" style={{ color: colors.risk.high }}>
            No recent file movement has been recorded on this case — it has been flagged internally for
            follow-up.
          </p>
        )}
      </div>
    </div>
  );
}
