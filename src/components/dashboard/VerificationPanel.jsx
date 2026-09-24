import { ShieldCheck, FileCheck2, FileWarning, FileQuestion, History } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useSession } from "../../context/SessionContext";
import SectionHeader from "../shared/SectionHeader";
import ProjectDocuments from "../shared/ProjectDocuments";
import ReportButton from "../shared/ReportButton";
import { useVerifyProject } from "../../hooks/useDashboardData";

const VERIFICATION_STYLE = {
  "Verified — matches source document": { icon: FileCheck2, tone: "low" },
  "Verified — reviewed by admin": { icon: FileCheck2, tone: "low" },
  "Needs review — edited after extraction": { icon: FileWarning, tone: "medium" },
  "Self-reported — no source document": { icon: FileQuestion, tone: "high" },
};

// Feature: data-integrity / maker-checker sign-off. A project's numbers
// are only as trustworthy as (a) whether they came from a source document
// and (b) whether a *different* person has confirmed them. This panel
// surfaces both, plus the full audit trail, for whichever project is
// selected in the register — Admins get a one-click "Verify" action here
// so review isn't buried in a separate workflow.
export default function VerificationPanel({ project }) {
  const { colors } = useTheme();
  const { user } = useSession();
  const verify = useVerifyProject();
  if (!project) return null;

  const status = project.verificationStatus || "Self-reported — no source document";
  const style = VERIFICATION_STYLE[status] || VERIFICATION_STYLE["Self-reported — no source document"];
  const Icon = style.icon;
  const canVerify = user.role === "Admin" && status !== "Verified — reviewed by admin";

  return (
    <div className="rounded-lg border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <SectionHeader
        index="08"
        eyebrow="DATA INTEGRITY"
        title="Source & verification"
        icon={ShieldCheck}
        right={<ReportButton project={project} label="Download report" />}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: colors.risk[style.tone] }} />
          <span className="text-sm font-medium" style={{ color: colors.risk[style.tone] }}>
            {status}
          </span>
        </div>
        {canVerify && (
          <button
            onClick={() => verify.mutate({ id: project.id, reviewer: user })}
            disabled={verify.isPending}
            className="px-3 py-1.5 rounded-md text-xs font-semibold"
            style={{ backgroundColor: colors.accent, color: "#fff" }}
          >
            {verify.isPending ? "Verifying…" : "Mark as verified (Admin)"}
          </button>
        )}
      </div>

      {project.overriddenFields?.length > 0 && (
        <p className="text-xs mt-2" style={{ color: colors.risk.medium }}>
          Edited after extraction from the source document: {project.overriddenFields.join(", ")}.
        </p>
      )}

      <ProjectDocuments project={project} />

      {project.auditLog?.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: colors.textMuted }}>
            <History size={12} /> Audit trail
          </div>
          <ul className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin">
            {(project.auditLog || []).map((entry, i) => (
              <li key={i} className="text-[11px] font-mono" style={{ color: colors.textFaint }}>
                {new Date(entry.at).toLocaleString()} · {entry.by} · {entry.action} — {entry.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {verify.isError && (
        <p className="text-xs mt-2" style={{ color: colors.risk.high }}>
          {verify.error?.message || "Verification failed."}
        </p>
      )}
    </div>
  );
}
