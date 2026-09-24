import { useState, useRef, useMemo } from "react";
import { FolderKanban, Lock, Pencil, FileCheck2, FileWarning, FileQuestion, History, Upload, Search } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useSession } from "../context/SessionContext";
import { useMyProjects, useUpdateProject, useMarkCompleted, useUploadCsv } from "../hooks/useDashboardData";
import SectionHeader from "../components/shared/SectionHeader";
import RiskStamp from "../components/shared/RiskStamp";
import Skeleton from "../components/shared/Skeleton";
import CompletionOverview from "../components/dashboard/CompletionOverview";
import PostSubmitPopup from "../components/shared/PostSubmitPopup";
import ProjectDocuments from "../components/shared/ProjectDocuments";
import ReportButton from "../components/shared/ReportButton";
import DelayDriverPanel from "../components/dashboard/DelayDriverPanel";

const VERIFICATION_STYLE = {
  "Verified — matches source document": { icon: FileCheck2, tone: "low" },
  "Verified — reviewed by admin": { icon: FileCheck2, tone: "low" },
  "Needs review — edited after extraction": { icon: FileWarning, tone: "medium" },
  "Self-reported — no source document": { icon: FileQuestion, tone: "high" },
};

function ProvenanceBlock({ project }) {
  const { colors } = useTheme();
  const status = project.verificationStatus || "Self-reported — no source document";
  const style = VERIFICATION_STYLE[status] || VERIFICATION_STYLE["Self-reported — no source document"];
  const Icon = style.icon;
  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: colors.risk[style.tone] }} />
        <span className="text-xs font-medium" style={{ color: colors.risk[style.tone] }}>
          {status}
        </span>
      </div>
      <ProjectDocuments project={project} compact />
      {project.auditLog?.length > 0 && (
        <details>
          <summary className="text-xs cursor-pointer flex items-center gap-1.5" style={{ color: colors.textMuted }}>
            <History size={12} /> Audit trail ({project.auditLog.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {project.auditLog.map((entry, i) => (
              <li key={i} className="text-[11px] font-mono" style={{ color: colors.textFaint }}>
                {new Date(entry.at).toLocaleString()} · {entry.by} · {entry.action} — {entry.note}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function MyProjectsPage() {
  const { colors } = useTheme();
  const { user, can } = useSession();
  const { data: myProjects, isLoading } = useMyProjects(user.id);
  const updateProject = useUpdateProject();
  const markCompleted = useMarkCompleted();
  const uploadCsv = useUploadCsv();
  const [expandedId, setExpandedId] = useState(null);
  const [popup, setPopup] = useState(null);
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    if (!myProjects) return [];
    if (!search.trim()) return myProjects;
    const q = search.toLowerCase();
    return myProjects.filter(
      (p) =>
        (p.id?.toLowerCase() || "").includes(q) ||
        (p.state?.toLowerCase() || "").includes(q) ||
        (p.district?.toLowerCase() || "").includes(q) ||
        (p.projectType?.toLowerCase() || "").includes(q)
    );
  }, [myProjects, search]);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadCsv.mutateAsync(file);
      setPopup({ title: "CSV Uploaded", message: `Successfully inserted ${res.inserted} projects (skipped ${res.skipped} duplicates).` });
    } catch (err) {
      setPopup({ title: "Upload Failed", message: "Failed to upload CSV file." });
    }
  }

  async function handleComplete(project) {
    await markCompleted.mutateAsync({
      id: project.id,
      outcome: {
        actualEndDate: new Date().toISOString().slice(0, 10),
        actionTaken: true,
        finalOutcome: "On-track close",
      },
      editor: user,
    });
    setPopup({ title: "Project marked Completed", message: `${project.id} outcome overview is now available below.` });
  }

  async function handleActivityBump(project) {
    await updateProject.mutateAsync({
      id: project.id,
      patch: { lastActivityDate: new Date().toISOString().slice(0, 10) },
      editor: user,
    });
    setPopup({ title: "Activity logged", message: `${project.id} last-activity date refreshed.` });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        index="24"
        eyebrow="OWNER-SCOPED VIEW"
        title="My Projects"
        icon={FolderKanban}
        right={
          <div className="flex items-center gap-4">
            <span className="text-xs" style={{ color: colors.textFaint }}>
              Signed in as {user.name} ({user.role})
            </span>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload} 
              style={{ display: "none" }} 
              className="hidden"
            />
            <div className="relative mr-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 text-xs rounded-md pl-8 pr-3 py-1.5 outline-none transition-colors"
                style={{
                  backgroundColor: "transparent",
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                }}
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadCsv.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-colors hover:bg-slate-50"
              style={{ 
                backgroundColor: colors.surface, 
                color: colors.text,
                border: `1px solid ${colors.border}`,
                opacity: uploadCsv.isPending ? 0.7 : 1
              }}
            >
              <Upload size={14} />
              {uploadCsv.isPending ? "Uploading..." : "Bulk Upload CSV"}
            </button>
          </div>
        }
      />

      {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full mb-3" />)}

      {!isLoading && filteredProjects?.length === 0 && (
        <div className="rounded-lg border p-8 text-center" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            You haven't added any projects yet. Use "Add Project" to create one — you'll become its owner.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filteredProjects?.map((p) => {
          const editable = can.edit(p);
          const expanded = expandedId === p.id;
          return (
            <div key={p.id} className="rounded-lg border overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <button
                onClick={() => setExpandedId(expanded ? null : p.id)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm" style={{ color: colors.text }}>
                    {p.projectType} — {p.district}, {p.state}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                    {p.id} · {p.status} · last activity {p.lastActivityDate}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RiskStamp level={p.riskLevel} />
                  {editable ? (
                    <Pencil size={14} style={{ color: colors.accent }} />
                  ) : (
                    <Lock size={14} style={{ color: colors.textFaint }} />
                  )}
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: colors.border }}>
                  <div className="flex justify-end mb-3">
                    <ReportButton project={p} label="Download report (PDF)" />
                  </div>
                  {!editable && (
                    <p className="text-xs mb-3" style={{ color: colors.textFaint }}>
                      Read-only: this project belongs to another official's created_by record.
                    </p>
                  )}
                  {editable && p.status !== "Completed" && (
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => handleActivityBump(p)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium border"
                        style={{ borderColor: colors.border, color: colors.text }}
                      >
                        Log activity
                      </button>
                      <button
                        onClick={() => handleComplete(p)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold"
                        style={{ backgroundColor: colors.accent, color: "#fff" }}
                      >
                        Mark Completed
                      </button>
                    </div>
                  )}
                  <div className="mb-4">
                    <DelayDriverPanel project={p} />
                  </div>
                  {p.status === "Completed" && <CompletionOverview project={p} />}
                  <ProvenanceBlock project={p} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PostSubmitPopup
        open={!!popup}
        onClose={() => setPopup(null)}
        title={popup?.title}
        message={popup?.message}
        accessNotice={`Edit access stays scoped to projects where created_by matches ${user.id}.`}
      />
    </div>
  );
}
