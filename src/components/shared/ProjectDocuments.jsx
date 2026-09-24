import { Lock, FileText, ExternalLink, ShieldCheck } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { shortFingerprint, formatBytes } from "../../utils/fileHash";

// Documents are never editable or removable from here, or anywhere else
// in the app, once a project has been created — there is intentionally
// no delete/replace action wired up past submission. Combined with the
// SHA-256 fingerprint taken at upload time, that's what makes this a
// record rather than just an attachment: if the underlying file were
// ever swapped out from under the link, its fingerprint would no longer
// match what's printed here.
export default function ProjectDocuments({ project, compact = false }) {
  const { colors } = useTheme();
  const documents =
    project?.documents?.length
      ? project.documents
      : project?.sourceDocument
      ? [{ ...project.sourceDocument, addedAt: project.createdAt }]
      : [];

  return (
    <div className={compact ? "" : "mt-4 pt-4 border-t"} style={compact ? {} : { borderColor: colors.border }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Lock size={12} style={{ color: colors.textMuted }} />
        <span className="text-xs font-medium" style={{ color: colors.text }}>
          Project documents ({documents.length})
        </span>
        <span className="text-[10px]" style={{ color: colors.textFaint }}>
          — locked, view only
        </span>
      </div>

      {documents.length === 0 ? (
        <p className="text-xs" style={{ color: colors.textFaint }}>
          No documents are on file for this project.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((d, i) => (
            <li
              key={d.id || i}
              className="flex items-center justify-between gap-3 text-xs rounded-md px-2.5 py-2 border"
              style={{ borderColor: colors.border, backgroundColor: colors.surfaceMuted }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={13} className="shrink-0" style={{ color: colors.accent }} />
                <div className="min-w-0">
                  <div className="truncate font-medium" style={{ color: colors.text }}>
                    {d.name || "Untitled document"}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] mt-0.5" style={{ color: colors.textFaint }}>
                    <ShieldCheck size={10} />
                    <span title={d.fingerprint || "no fingerprint recorded"}>{shortFingerprint(d.fingerprint)}</span>
                    {d.size ? <span>· {formatBytes(d.size)}</span> : null}
                    {d.addedAt ? <span>· added {new Date(d.addedAt).toLocaleDateString("en-IN")}</span> : null}
                  </div>
                </div>
              </div>
              {d.url ? (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 font-semibold"
                  style={{ color: colors.accent }}
                >
                  View <ExternalLink size={11} />
                </a>
              ) : (
                <span className="shrink-0" style={{ color: colors.textFaint }}>
                  archived
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
