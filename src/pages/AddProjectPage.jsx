import { useMemo, useRef, useState } from "react";
import {
  FilePlus2,
  UploadCloud,
  FileCheck2,
  FileWarning,
  Loader2,
  X,
  Paperclip,
  Lock,
  ShieldCheck,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useSession } from "../context/SessionContext";
import { PROJECT_TYPES, STATES } from "../data/dummyData";
import { useCreateProject } from "../hooks/useDashboardData";
import { extractProjectFromPdf } from "../api/pdfExtract";
import { fingerprintFile, shortFingerprint, formatBytes } from "../utils/fileHash";
import SectionHeader from "../components/shared/SectionHeader";
import RiskStamp from "../components/shared/RiskStamp";
import PostSubmitPopup from "../components/shared/PostSubmitPopup";
import ProjectDocuments from "../components/shared/ProjectDocuments";
import ReportButton from "../components/shared/ReportButton";

const DOCS_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

const initial = {
  projectType: PROJECT_TYPES[0].type,
  state: STATES[0],
  district: "",
  familiesAffected: "",
  landAreaHectares: "",
  projectBudget: "",
  compensationDisbursedPct: 50,
  legalDisputes: 0,
  rrProgressPct: 50,
  approvalStage: 1,
};

// Fields the PDF extractor can populate. Anything not in this list is
// always manual (there's no plausible field pattern for it in a
// notification/award order, e.g. project type is a dropdown, not text).
const EXTRACTABLE_FIELDS = new Set([
  "familiesAffected",
  "landAreaHectares",
  "projectBudget",
  "compensationDisbursedPct",
  "rrProgressPct",
  "legalDisputes",
  "approvalStage",
  "district",
]);

function Field({ label, badge, children }) {
  const { colors } = useTheme();
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-xs font-mono tracking-wide mb-1.5" style={{ color: colors.textMuted }}>
        {label}
        {badge}
      </span>
      {children}
    </label>
  );
}

function ProvenanceBadge({ state }) {
  const { colors } = useTheme();
  if (state === "document") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: colors.risk.low, backgroundColor: colors.risk.lowBg }}>
        <FileCheck2 size={10} /> FROM DOCUMENT
      </span>
    );
  }
  if (state === "overridden") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: colors.risk.medium, backgroundColor: colors.risk.mediumBg }}>
        <FileWarning size={10} /> EDITED — WILL BE FLAGGED
      </span>
    );
  }
  return null;
}

export default function AddProjectPage() {
  const { colors } = useTheme();
  const { user, can } = useSession();
  const createProject = useCreateProject();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(initial);
  const [result, setResult] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);

  // provenance[key] = "document" | "overridden". Absent = manual/self-reported.
  const [provenance, setProvenance] = useState({});
  const [extractedValues, setExtractedValues] = useState({});
  const [sourceDocument, setSourceDocument] = useState(null);
  const [pdfState, setPdfState] = useState({ status: "idle", matchedKeys: [], error: null });

  // Feature: compulsory, tamper-evident project documents. Every file
  // added here is fingerprinted (SHA-256) the moment it's attached, and
  // once the project is submitted nothing in this app exposes a way to
  // edit, replace, or delete a document — the record is fixed the moment
  // it's created. Removal is only possible up to submit, while the
  // project itself is still a draft on this page.
  const [documents, setDocuments] = useState([]);
  const [docsBusy, setDocsBusy] = useState(false);
  const [docsError, setDocsError] = useState(null);
  const docsInputRef = useRef(null);

  async function handleDocsAdded(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setDocsBusy(true);
    setDocsError(null);
    try {
      const added = await Promise.all(
        files.map(async (file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          fingerprint: await fingerprintFile(file),
          addedAt: new Date().toISOString(),
          addedBy: user.id,
        }))
      );
      setDocuments((d) => [...d, ...added]);
    } catch {
      setDocsError("Couldn't read one of those files. Try adding it again.");
    } finally {
      setDocsBusy(false);
      if (docsInputRef.current) docsInputRef.current.value = "";
    }
  }

  function removeDraftDocument(id) {
    setDocuments((d) => d.filter((doc) => doc.id !== id));
  }

  const overriddenFields = useMemo(
    () => Object.keys(provenance).filter((k) => provenance[k] === "overridden"),
    [provenance]
  );

  const inputCls =
    "w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/40";
  const inputStyle = { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface };

  const set = (key) => (e) => {
    const raw = e.target.type === "number" || e.target.type === "range" ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [key]: raw }));
    // If this field was populated from the document, flag it the moment
    // the human changes it away from what the document said — that's a
    // much stronger signal than an untouched free-typed field.
    setProvenance((p) => {
      if (p[key] !== "document" && p[key] !== "overridden") return p;
      const matchesExtracted = String(raw) === String(extractedValues[key]);
      return { ...p, [key]: matchesExtracted ? "document" : "overridden" };
    });
  };

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfState({ status: "extracting", matchedKeys: [], error: null });
    try {
      const { fields, matchedKeys } = await extractProjectFromPdf(file);
      setForm((f) => ({ ...f, ...fields }));
      setExtractedValues(fields);
      setProvenance((p) => {
        const next = { ...p };
        matchedKeys.forEach((k) => {
          next[k] = "document";
        });
        return next;
      });
      const fingerprint = await fingerprintFile(file);
      setSourceDocument({ name: file.name, size: file.size, url: URL.createObjectURL(file), fingerprint });
      setPdfState({ status: "done", matchedKeys, error: null });
    } catch (err) {
      setPdfState({ status: "error", matchedKeys: [], error: "Couldn't read this PDF. You can still fill the form in by hand." });
    }
  }

  function removeDocument() {
    setSourceDocument(null);
    setExtractedValues({});
    setProvenance({});
    setPdfState({ status: "idle", matchedKeys: [], error: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!can.addProject) {
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-lg border p-6 text-center" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <p className="text-sm" style={{ color: colors.textMuted }}>
          Your role ({user.role}) does not have permission to add new projects. Switch to an Official or
          Admin account to use this form.
        </p>
      </div>
    );
  }

  const project = { ...form, department: PROJECT_TYPES.find((p) => p.type === form.projectType)?.department };

  // The PDF used for auto-fill is itself evidentiary, so it's folded
  // into the same locked documents record rather than tracked separately
  // — "all documents of a project" means this too, not just files added
  // in the compulsory box below.
  const allDocuments = useMemo(() => {
    if (!sourceDocument) return documents;
    const alreadyIncluded = documents.some((d) => d.fingerprint === sourceDocument.fingerprint);
    if (alreadyIncluded) return documents;
    return [
      {
        id: `source-${sourceDocument.fingerprint?.slice(0, 12) || Date.now()}`,
        name: sourceDocument.name,
        size: sourceDocument.size,
        url: sourceDocument.url,
        fingerprint: sourceDocument.fingerprint,
        addedAt: new Date().toISOString(),
        addedBy: user.id,
        role: "auto-extract source",
      },
      ...documents,
    ];
  }, [documents, sourceDocument, user.id]);

  const hasRequiredDocuments = allDocuments.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!hasRequiredDocuments) {
      setDocsError("At least one supporting document is required before this project can be submitted.");
      return;
    }
    const payload = {
      ...form,
      department: project.department,
      familiesAffected: Number(form.familiesAffected) || 0,
      landAreaHectares: Number(form.landAreaHectares) || 0,
      projectBudget: Number(form.projectBudget) || 0,
      sourceDocument,
      documents: allDocuments,
      fieldProvenance: provenance,
      overriddenFields,
    };
    const created = await createProject.mutateAsync({ input: payload, user });
    setResult(created);
    setPopupOpen(true);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <SectionHeader index="21" eyebrow="INTAKE FORM" title="Add a new land acquisition project" icon={FilePlus2} />

      {/* Step 0: supporting document. Numbers read from an actual award
          order / notification are far harder to quietly fabricate than
          numbers typed into an empty box, so this comes before the
          manual fields and pre-fills whatever it can. */}
      <div className="rounded-lg border p-5 mb-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium" style={{ color: colors.text }}>
              Upload supporting document (recommended)
            </div>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              A 3A notification, award order, or disbursal certificate as a PDF. We'll read the numbers
              out of it and pre-fill the form below — you just confirm them.
            </p>
          </div>
          <label
            className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: colors.accentSoft, color: colors.accent, border: `1px solid ${colors.accent}` }}
          >
            {pdfState.status === "extracting" ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            {pdfState.status === "extracting" ? "Reading document…" : "Choose PDF"}
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
          </label>
        </div>

        {sourceDocument && (
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t text-xs" style={{ borderColor: colors.border }}>
            <span style={{ color: colors.text }}>
              📄 {sourceDocument.name}
              {pdfState.matchedKeys.length > 0 ? (
                <span style={{ color: colors.risk.low }}> — pre-filled {pdfState.matchedKeys.length} field(s), review below</span>
              ) : (
                <span style={{ color: colors.textMuted }}> — attached, but no fields could be read automatically; fill them in below</span>
              )}
            </span>
            <button type="button" onClick={removeDocument} className="shrink-0" style={{ color: colors.textFaint }} aria-label="Remove document">
              <X size={14} />
            </button>
          </div>
        )}
        {pdfState.status === "error" && (
          <p className="text-xs mt-2" style={{ color: colors.risk.high }}>
            {pdfState.error}
          </p>
        )}
        {!sourceDocument && pdfState.status !== "extracting" && (
          <p className="text-xs mt-3" style={{ color: colors.textFaint }}>
            Skipping this is fine, but fields you type by hand will be recorded as
            "self-reported — no source document" and stand out as unverified on the dashboard.
          </p>
        )}
      </div>

      {/* Step 0.5: compulsory, locked document record. Unlike the box
          above (which exists to pre-fill numbers), this one exists so
          every project has at least one supporting document permanently
          attached to it. Each file is fingerprinted the instant it's
          added, and once the project is submitted there is no edit,
          replace, or delete affordance anywhere in the app — only
          viewing — so what's on file here can't quietly change later. */}
      <div className="rounded-lg border p-5 mb-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: colors.text }}>
              <Lock size={14} style={{ color: colors.accent }} />
              Project documents
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded" style={{ color: colors.risk.high, backgroundColor: colors.risk.highBg }}>
                REQUIRED
              </span>
            </div>
            <p className="text-xs mt-0.5 max-w-xl" style={{ color: colors.textMuted }}>
              Attach every record this project should be judged against — notifications, award orders,
              disbursal certificates, site photos, land records. Each file is fingerprinted (SHA-256) on
              upload. Once submitted, documents here are <strong>locked</strong>: viewable by any official,
              but never editable, replaceable, or removable — that's what keeps this project's evidence
              trail honest.
            </p>
          </div>
          <label
            className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: colors.accentSoft, color: colors.accent, border: `1px solid ${colors.accent}` }}
          >
            {docsBusy ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
            {docsBusy ? "Fingerprinting…" : "Add document(s)"}
            <input
              ref={docsInputRef}
              type="file"
              accept={DOCS_ACCEPT}
              multiple
              className="hidden"
              onChange={handleDocsAdded}
            />
          </label>
        </div>

        {allDocuments.length > 0 && (
          <ul className="mt-3 pt-3 border-t space-y-1.5" style={{ borderColor: colors.border }}>
            {allDocuments.map((d) => {
              const isDraft = documents.some((doc) => doc.id === d.id);
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 text-xs rounded-md px-2.5 py-2 border"
                  style={{ borderColor: colors.border, backgroundColor: colors.surfaceMuted }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={13} className="shrink-0" style={{ color: colors.accent }} />
                    <div className="min-w-0">
                      <div className="truncate font-medium" style={{ color: colors.text }}>
                        {d.name}
                        {d.role === "auto-extract source" && (
                          <span className="ml-1.5 font-normal" style={{ color: colors.textFaint }}>
                            (from auto-fill above)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] mt-0.5" style={{ color: colors.textFaint }}>
                        <ShieldCheck size={10} />
                        {shortFingerprint(d.fingerprint)}
                        {d.size ? <span>· {formatBytes(d.size)}</span> : null}
                      </div>
                    </div>
                  </div>
                  {isDraft ? (
                    <button
                      type="button"
                      onClick={() => removeDraftDocument(d.id)}
                      className="shrink-0"
                      style={{ color: colors.textFaint }}
                      aria-label={`Remove ${d.name}`}
                      title="Remove before submitting — documents can't be removed once the project is saved"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <span className="shrink-0 text-[10px]" style={{ color: colors.textFaint }}>
                      linked
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!hasRequiredDocuments && (
          <p className="flex items-center gap-1.5 text-xs mt-3" style={{ color: colors.risk.medium }}>
            <AlertTriangle size={12} /> At least one document is required — this project can't be saved without one.
          </p>
        )}
        {docsError && (
          <p className="text-xs mt-2" style={{ color: colors.risk.high }}>
            {docsError}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <Field label="PROJECT TYPE">
          <select className={inputCls} style={inputStyle} value={form.projectType} onChange={set("projectType")}>
            {PROJECT_TYPES.map((p) => (
              <option key={p.type} value={p.type}>
                {p.type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="STATE">
          <select className={inputCls} style={inputStyle} value={form.state} onChange={set("state")}>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="DISTRICT" badge={<ProvenanceBadge state={provenance.district} />}>
          <input required className={inputCls} style={inputStyle} value={form.district} onChange={set("district")} placeholder="e.g. Nashik" />
        </Field>
        <Field label="FAMILIES AFFECTED" badge={<ProvenanceBadge state={provenance.familiesAffected} />}>
          <input required type="number" min="0" className={inputCls} style={inputStyle} value={form.familiesAffected} onChange={set("familiesAffected")} />
        </Field>
        <Field label="LAND AREA (HECTARES)" badge={<ProvenanceBadge state={provenance.landAreaHectares} />}>
          <input required type="number" min="0" step="0.1" className={inputCls} style={inputStyle} value={form.landAreaHectares} onChange={set("landAreaHectares")} />
        </Field>
        <Field label="PROJECT BUDGET (₹)" badge={<ProvenanceBadge state={provenance.projectBudget} />}>
          <input required type="number" min="0" className={inputCls} style={inputStyle} value={form.projectBudget} onChange={set("projectBudget")} placeholder="e.g. 500000000" />
        </Field>
        <Field label={`COMPENSATION DISBURSED — ${form.compensationDisbursedPct}%`} badge={<ProvenanceBadge state={provenance.compensationDisbursedPct} />}>
          <input type="range" min="0" max="100" className="w-full accent-amber-500" value={form.compensationDisbursedPct} onChange={set("compensationDisbursedPct")} />
        </Field>
        <Field label={`R&R PROGRESS — ${form.rrProgressPct}%`} badge={<ProvenanceBadge state={provenance.rrProgressPct} />}>
          <input type="range" min="0" max="100" className="w-full accent-amber-500" value={form.rrProgressPct} onChange={set("rrProgressPct")} />
        </Field>
        <Field label="ACTIVE LEGAL DISPUTES" badge={<ProvenanceBadge state={provenance.legalDisputes} />}>
          <input type="number" min="0" className={inputCls} style={inputStyle} value={form.legalDisputes} onChange={set("legalDisputes")} />
        </Field>
        <Field label="APPROVAL STAGE (1–5)" badge={<ProvenanceBadge state={provenance.approvalStage} />}>
          <input type="number" min="1" max="5" className={inputCls} style={inputStyle} value={form.approvalStage} onChange={set("approvalStage")} />
        </Field>

        {overriddenFields.length > 0 && (
          <div className="sm:col-span-2 text-xs rounded-md px-3 py-2" style={{ backgroundColor: colors.risk.mediumBg, color: colors.risk.medium }}>
            {overriddenFields.length} field(s) no longer match the uploaded document ({overriddenFields.join(", ")}).
            That's fine if the document is out of date — but it'll be saved as "needs review" until an Admin checks it.
          </div>
        )}

        <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t" style={{ borderColor: colors.border }}>
          <span className="text-xs" style={{ color: colors.textFaint }}>
            {hasRequiredDocuments
              ? "Submitting sends this project to /predict for an initial risk score."
              : "Add at least one document above to enable submission."}
          </span>
          <button
            type="submit"
            disabled={createProject.isPending || !hasRequiredDocuments}
            className="px-5 py-2 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: colors.accent, color: "#fff" }}
          >
            {createProject.isPending ? "Scoring risk…" : "Save & score project"}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-5 rounded-lg border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium" style={{ color: colors.text }}>
                {result.id} saved — initial risk score {result.riskScore}
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                Owner: {user.name} ({user.id}). Visible on the shared dashboard now; editable only from My Projects.
              </div>
              <div className="text-xs mt-1 font-medium" style={{ color: colors.accent }}>
                {result.verificationStatus}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <RiskStamp level={result.riskLevel} size="lg" />
              <ReportButton project={result} label="Download report" />
            </div>
          </div>
          <ProjectDocuments project={result} />
        </div>
      )}

      <PostSubmitPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        title="Project submitted"
        message={result ? `${result.id} saved and scored ${result.riskScore}/100 (${result.riskLevel} risk).` : ""}
        accessNotice={`As an ${user.role}, you can edit this project only from "My Projects" since you are its owner. Other officials will see it read-only on the shared dashboard.`}
      />
    </div>
  );
}
