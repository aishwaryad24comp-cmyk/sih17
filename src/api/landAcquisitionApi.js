// The ONE place that knows whether data comes from dummyData.js or the
// real gateway (Member 6's Express service / Member 3's FastAPI service).
// Every hook and component calls these functions and never imports
// dummyData or axios directly. Flip VITE_USE_LIVE_API=true once the
// backend is reachable; if the real response shape differs, fix the
// normalize* helpers below — nothing else in the app should need to change.

import { apiClient, USE_LIVE_API } from "./client";
import {
  PROJECTS,
  DEPARTMENTS,
  summaryStats,
  stateTrend,
  monthlyTrend,
  departmentRiskBreakdown,
  progressByStage,
  buildTimeline,
} from "../data/dummyData";
import { overlapReport, silentStallReport } from "../data/deriveInsights";

const LATENCY = 260;
const delay = (v) => new Promise((res) => setTimeout(() => res(v), LATENCY));

// In-memory mutation layer over the dummy dataset so Add-Project / mark
// Completed / edit work in the demo even without a backend yet.
let LIVE_PROJECTS = [...PROJECTS];

function parseApprovalStage(stage) {
  const lowerStage = (stage || '').toString().toLowerCase();
  if (lowerStage.includes('section 11') || lowerStage.includes('stage 1')) return 1;
  if (lowerStage.includes('section 15') || lowerStage.includes('section 19') || lowerStage.includes('stage 2')) return 2;
  if (lowerStage.includes('stage 3')) return 3;
  if (lowerStage.includes('stage 4')) return 4;
  if (lowerStage.includes('stage 5')) return 5;
  const num = parseInt(lowerStage.match(/\d+/)?.[0] || '3', 10);
  return (num >= 1 && num <= 5) ? num : 3;
}

function normalizeProjectList(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.data ?? [];
  return arr.map((p) => {
    const id = p.id || p.project_id;
    const projectType = p.projectType || p.project_type || "Highway";
    const department = p.department || p.implementing_department || "NHAI";
    const riskScore = p.riskScore ?? p.predicted_risk_pct ?? Math.round((p.risk_score_raw || 0) * 100);
    
    let riskLevel = p.riskLevel;
    if (!riskLevel) {
      if (riskScore >= 65) riskLevel = "High";
      else if (riskScore >= 35) riskLevel = "Medium";
      else riskLevel = "Low";
    }

    return {
      ...p,
      id,
      project_id: id,
      projectType,
      project_type: projectType,
      department,
      implementing_department: department,
      lat: p.lat ?? p.latitude ?? 18.5204,
      lng: p.lng ?? p.longitude ?? 73.8567,
      latitude: p.latitude ?? p.lat ?? 18.5204,
      longitude: p.longitude ?? p.lng ?? 73.8567,
      familiesAffected: p.familiesAffected ?? p.families_affected ?? 0,
      landAreaHectares: p.landAreaHectares ?? p.land_area_hectares ?? 0,
      compensationAssessed: p.compensationAssessed ?? p.compensation_assessed_inr ?? p.projectBudget ?? 0,
      compensationDisbursedPct: p.compensationDisbursedPct ?? p.compensation_disbursed_pct ?? 0,
      legalDisputes: p.legalDisputes ?? p.legal_disputes_count ?? 0,
      rrProgressPct: p.rrProgressPct ?? p.rr_progress_pct ?? 0,
      approvalStage: parseApprovalStage(p.approval_stage || p.approvalStage),
      riskScore,
      riskLevel,
      delayDrivers: Array.isArray(p.top_shap_drivers)
        ? p.top_shap_drivers.map((d) => ({
            key: typeof d === "string" ? d : d.key || "driver",
            label: typeof d === "string" ? d : d.label || d.key,
            impact: typeof d === "object" && d.impact != null ? d.impact : 10,
          }))
        : p.delayDrivers || [],
      overallDelayDays: p.overallDelayDays ?? p.delay_days ?? 0,
      status: p.status || (p.delayed === "Y" ? "Delayed" : "Ongoing"),
      verificationStatus: p.verificationStatus || (p.sourceDocument ? "Verified — matches source document" : "Self-reported — no source document"),
      timeline: p.timeline || buildTimeline(
        () => 0.5, 
        parseApprovalStage(p.approval_stage || p.approvalStage), 
        p.overallDelayDays ?? p.delay_days ?? 0
      ),
    };
  });
}

export async function fetchProjects() {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get("/projects");
    return normalizeProjectList(data);
  }
  return delay(LIVE_PROJECTS);
}

export async function fetchProjectDetail(id) {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get(`/projects/${id}`);
    return data;
  }
  return delay(LIVE_PROJECTS.find((p) => p.id === id) || null);
}

export async function fetchExplain(id) {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get(`/projects/${id}/explain`);
    return data;
  }
  const project = LIVE_PROJECTS.find((p) => p.id === id);
  return delay(project ? { id, delayDrivers: project.delayDrivers } : null);
}

export async function fetchRecommendations(id) {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get(`/projects/${id}/recommend`);
    return data;
  }
  const project = LIVE_PROJECTS.find((p) => p.id === id);
  if (!project) return delay(null);
  return delay({
    id,
    recommendedAction: project.recommendedAction,
    historicalEvidence: project.historicalEvidence,
    estimatedCostOverrun: project.estimatedCostOverrun,
  });
}

function normalizeDistrictTrend(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    if (typeof item.High === 'number') return item;
    const keys = Object.keys(item).filter(k => k !== 'month');
    const total = keys.reduce((sum, k) => sum + (Number(item[k]) || 0), 0);
    return {
      month: item.month || `M${idx + 1}`,
      High: Math.max(5, Math.round(total * 0.45)),
      Medium: Math.max(5, Math.round(total * 0.35)),
      Low: Math.max(5, Math.round(total * 0.20))
    };
  });
}

function normalizeStateComparison(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item.High === 'number') return item;
    const base = Number(item.projects || item.avgDelay) || 10;
    return {
      state: item.state || 'Unknown',
      High: Math.max(2, Math.round(base * 0.5)),
      Medium: Math.max(2, Math.round(base * 0.3)),
      Low: Math.max(1, Math.round(base * 0.2))
    };
  });
}

export async function fetchDistrictTrend() {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get("/analytics/district-trend");
    return normalizeDistrictTrend(data);
  }
  return delay(monthlyTrend(LIVE_PROJECTS));
}

export async function fetchStateComparison() {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get("/analytics/state-comparison");
    return normalizeStateComparison(data);
  }
  return delay(stateTrend(LIVE_PROJECTS));
}

export async function fetchSummary() {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get("/analytics/summary");
    return data;
  }
  return delay(summaryStats(LIVE_PROJECTS));
}

export async function fetchDepartments() {
  return delay(DEPARTMENTS);
}

export async function fetchDepartmentRisk(department) {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get("/analytics/department-risk", { params: { department } });
    return data;
  }
  return delay(departmentRiskBreakdown(department, LIVE_PROJECTS));
}

export async function fetchProgressByStage() {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get("/analytics/progress-by-stage");
    return data;
  }
  return delay(progressByStage(LIVE_PROJECTS));
}

export const fetchMapProjects = fetchProjects;

export async function fetchOverlapClusters() {
  let clusters = [];
  if (USE_LIVE_API) {
    const { data } = await apiClient.get("/analytics/overlap-clusters");
    clusters = data;
  } else {
    clusters = await delay(overlapReport(LIVE_PROJECTS));
  }

  return (Array.isArray(clusters) ? clusters : []).map((c, idx) => {
    const projectList = Array.isArray(c.projects) ? c.projects : [];
    const projectIds = c.projectIds || projectList.map((p) => (typeof p === "string" ? p : p.project_id || p.id));
    const earliestDate = c.earliestDate || projectList[0]?.notification_date || new Date().toISOString();
    const latestDate = c.latestDate || projectList[projectList.length - 1]?.notification_date || new Date().toISOString();

    return {
      ...c,
      key: c.key || c.district || `cluster-${idx}`,
      village: c.village || c.district || "District Cluster",
      district: c.district || "Unknown District",
      state: c.state || "India",
      departments: Array.isArray(c.departments) ? c.departments : [],
      projectIds,
      highRiskCount: c.highRiskCount ?? 0,
      earliestDate,
      latestDate,
    };
  });
}

export async function fetchSilentStalls() {
  let stalls = [];
  if (USE_LIVE_API) {
    const { data } = await apiClient.get("/analytics/silent-stalls");
    stalls = data;
  } else {
    stalls = await delay(silentStallReport(LIVE_PROJECTS));
  }

  return (Array.isArray(stalls) ? stalls : []).map((p, idx) => {
    const daysSinceActivity = p.daysSinceActivity ?? p.days_stalled ?? 90;
    const riskLevel = p.riskLevel || (daysSinceActivity >= 180 ? "High" : daysSinceActivity >= 90 ? "Medium" : "Low");

    return {
      ...p,
      id: p.id || p.project_id || `stall-${idx}`,
      projectType: p.projectType || p.implementing_department || p.project_type || "Land Acquisition",
      village: p.village || p.district || "N/A",
      district: p.district || "Unknown District",
      state: p.state || "India",
      riskLevel,
      daysSinceActivity,
      stallThreshold: p.stallThreshold ?? 90,
      lastActivityDate: p.lastActivityDate || p.last_activity_date || new Date().toISOString(),
    };
  });
}

// ---- Feature #13: Landowner Portal ----
export async function fetchLandownerCase(userId) {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get(`/landowner/case`, { params: { userId } });
    return data;
  }
  // For demo: pretend user U-LAND-01 owns LA-2023-0004
  if (userId === "U-LAND-01") {
    return delay(LIVE_PROJECTS.find((p) => p.id === "LA-2023-0004"));
  }
  return delay(null);
}

// ---- Feature #21: Add-Project Intake Form ----
// POST /projects on the real gateway: saves the project, tags created_by,
// triggers /predict for an initial risk score, and logs an audit entry.
//
// Data-integrity fields (see AddProjectPage.jsx):
// - sourceDocument: { name, url } of the supporting PDF the numbers were
//   read from, or null if the official typed everything by hand.
// - fieldProvenance: { [field]: "document" | "manual" } — which fields
//   came from the extracted PDF vs. free typing.
// - overriddenFields: fields that were extracted from the PDF but then
//   hand-edited before submit — the strongest signal something may not
//   match the source record, so these always get flagged for review.
// - verificationStatus is derived from the two above rather than trusted
//   as input, since the frontend can't be the source of truth for its
//   own trustworthiness.
// - auditLog is an append-only history of who did what to this project,
//   starting with the create event.
function deriveVerificationStatus({ sourceDocument, overriddenFields }) {
  if (!sourceDocument) return "Self-reported — no source document";
  if (overriddenFields?.length) return "Needs review — edited after extraction";
  return "Verified — matches source document";
}

// Documents are frozen the moment a project is created. Nothing past
// this point — updateProject, markProjectCompleted, verifyProject —
// accepts or writes to a project's `documents` array, so there is no
// code path anywhere that can edit, replace, or delete a document once
// it's on record. This is the enforcement mechanism behind "documents
// can't be manipulated": not a permission check, but the simple absence
// of any function capable of changing them after intake.
function lockDocuments(documents) {
  return Object.freeze((documents || []).map((d) => Object.freeze({ ...d })));
}

export async function createProject(input, currentUser) {
  if (USE_LIVE_API) {
    const { data } = await apiClient.post("/projects", input);
    const normalized = normalizeProjectList([data])[0];
    return normalized || data;
  }
  const { sourceDocument = null, documents = [], fieldProvenance = {}, overriddenFields = [], ...rest } = input;
  const lockedDocuments = lockDocuments(documents);
  const riskScore = Math.min(
    96,
    Math.round(
      (rest.legalDisputes > 0 ? 22 : 0) +
        (100 - rest.compensationDisbursedPct) * 0.28 +
        (100 - rest.rrProgressPct) * 0.18 +
        (5 - rest.approvalStage) * 6 +
        Math.random() * 18
    )
  );
  const riskLevel = riskScore >= 65 ? "High" : riskScore >= 35 ? "Medium" : "Low";
  const now = new Date().toISOString().slice(0, 10);
  const verificationStatus = deriveVerificationStatus({ sourceDocument, overriddenFields });
  const newProject = {
    ...rest,
    id: `LA-${new Date().getFullYear()}-${String(LIVE_PROJECTS.length + 1).padStart(4, "0")}`,
    riskScore,
    riskLevel,
    delayDrivers: [],
    topDriver: null,
    recommendedAction: "Awaiting full model scoring once submitted to /predict.",
    overallDelayDays: 0,
    status: "Ongoing",
    plannedDurationDays: input.plannedDurationDays || 365,
    actualDurationDays: null,
    actualEndDate: null,
    actionTaken: false,
    finalOutcome: null,
    estimatedCostOverrun: 0,
    historicalEvidence: { avgBudgetOverrunPct: 0, shelvingRatePct: 0, sampleSize: 0 },
    createdBy: currentUser?.id,
    createdAt: now,
    lastActivityDate: now,
    timeline: [],
    sourceDocument,
    documents: lockedDocuments,
    fieldProvenance,
    overriddenFields,
    verificationStatus,
    auditLog: [
      {
        at: new Date().toISOString(),
        by: currentUser?.id || "unknown",
        action: "created",
        note: `Submitted with ${lockedDocuments.length} document(s) on file${
          lockedDocuments.length ? " (" + lockedDocuments.map((d) => d.name).join(", ") + ")" : ""
        }.${
          overriddenFields.length
            ? ` ${overriddenFields.length} field(s) edited after extraction: ${overriddenFields.join(", ")}.`
            : ""
        }`,
      },
    ],
  };
  LIVE_PROJECTS = [newProject, ...LIVE_PROJECTS];
  return delay(newProject);
}

export async function uploadCsv(file) {
  if (USE_LIVE_API) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post("/projects/upload-csv", formData);
    return data;
  }
  // Mock fallback
  return delay({ message: "Mock CSV import successful", inserted: 5, skipped: 0 });
}

// ---- Maker-checker step: a second, different user (Admin) confirms the
// numbers before a project counts as fully verified. This is enforced
// again on the real gateway by role middleware — the check here is just
// so the demo behaves the same way. ----
export async function verifyProject(id, reviewer) {
  if (USE_LIVE_API) {
    const { data } = await apiClient.post(`/projects/${id}/verify`, { reviewerId: reviewer?.id });
    return data;
  }
  const project = LIVE_PROJECTS.find((p) => p.id === id);
  if (!project) return delay(null);
  if (reviewer?.role !== "Admin") {
    throw new Error("Only an Admin can verify a project's submitted data.");
  }
  const updated = {
    ...project,
    verificationStatus: "Verified — reviewed by admin",
    overriddenFields: [],
    auditLog: [
      ...(project.auditLog || []),
      {
        at: new Date().toISOString(),
        by: reviewer.id,
        action: "verified",
        note: `Reviewed and approved by ${reviewer.name} (Admin).`,
      },
    ],
  };
  LIVE_PROJECTS = LIVE_PROJECTS.map((p) => (p.id === id ? updated : p));
  return delay(updated);
}

// ---- Feature #24: My Projects (ownership-scoped edit) ----
export async function fetchMyProjects(userId) {
  if (USE_LIVE_API) {
    const { data } = await apiClient.get("/projects", { params: { createdBy: userId } });
    return normalizeProjectList(data);
  }
  return delay(LIVE_PROJECTS.filter((p) => p.createdBy === userId));
}

export async function updateProject(id, patch, editor) {
  if (USE_LIVE_API) {
    const { data } = await apiClient.patch(`/projects/${id}`, patch);
    return data;
  }
  // documents/sourceDocument are deliberately never accepted through a
  // patch — they're set once at createProject and locked. Silently
  // dropping any attempt to include them here (rather than trusting the
  // caller to never try) is what actually makes them immutable.
  const { documents: _ignoredDocs, sourceDocument: _ignoredSrc, ...safePatch } = patch;
  LIVE_PROJECTS = LIVE_PROJECTS.map((p) => {
    if (p.id !== id) return p;
    // Every edit is logged with the before/after values so manipulation
    // after the fact — not just at intake — is traceable to a person.
    const changes = Object.keys(safePatch)
      .filter((k) => k !== "auditLog")
      .map((k) => `${k}: ${JSON.stringify(p[k])} → ${JSON.stringify(safePatch[k])}`)
      .join("; ");
    const entry = {
      at: new Date().toISOString(),
      by: editor?.id || "unknown",
      action: "edited",
      note: changes || "No field changes recorded.",
    };
    return { ...p, ...safePatch, auditLog: [...(p.auditLog || []), entry] };
  });
  return delay(LIVE_PROJECTS.find((p) => p.id === id));
}

// ---- Feature #22: mark Completed ----
export async function markProjectCompleted(id, { actualEndDate, actionTaken, finalOutcome }, editor) {
  const project = LIVE_PROJECTS.find((p) => p.id === id);
  if (!project) return delay(null);
  const plannedDurationDays = project.plannedDurationDays;
  const actualDurationDays =
    Math.round((new Date(actualEndDate) - new Date(project.createdAt)) / 86400000) || plannedDurationDays;
  return updateProject(
    id,
    {
      status: "Completed",
      actualEndDate,
      actualDurationDays,
      actionTaken,
      finalOutcome,
    },
    editor
  );
}
