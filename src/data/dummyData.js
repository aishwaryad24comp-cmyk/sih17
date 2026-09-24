// Placeholder data standing in for Member 1's dataset + Member 2/3's
// model output, until VITE_USE_LIVE_API=true points this app at the
// real gateway. Shape mirrors the schema in the build plan: department,
// action_taken/final_outcome (#19), project_budget (#20),
// status/actual_end_date (#22), created_by/owner_id (#24).



// Deterministic PRNG so the demo dataset is stable across reloads.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260904);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const range = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

export const PROJECT_TYPES = [
  { type: "Railway", department: "Ministry of Railways" },
  { type: "Highway", department: "NHAI" },
  { type: "Irrigation/Water Res.", department: "State Water Resources Dept" },
  { type: "Urban Infra/Metro", department: "State Metro Rail Corp" },
  { type: "Power Transmission", department: "State Electricity Board" },
  { type: "Highway", department: "State PWD" },
  { type: "Industrial Corridor", department: "State Industrial Dev. Corp" },
  { type: "Industrial Corridor", department: "DMIC/NICDC" },
  { type: "Power Transmission", department: "Power Grid Corp" },
  { type: "Railway", department: "State Railway Infra Corp" },
  { type: "Urban Infra/Metro", department: "Urban Dev. Authority" },
];

export const DEPARTMENTS = [
  "NHAI",
  "State PWD",
  "Ministry of Railways",
  "State Railway Infra Corp",
  "State Water Resources Dept",
  "State Industrial Dev. Corp",
  "DMIC/NICDC",
  "Power Grid Corp",
  "State Electricity Board",
  "State Metro Rail Corp",
  "Urban Dev. Authority"
];

const STATE_DISTRICTS = {
  "Uttar Pradesh": { districts: ["Noida", "Agra", "Meerut", "Varanasi", "Lucknow"], lat: [26.8, 28.6], lng: [78.0, 81.0] },
  "Maharashtra": { districts: ["Satara", "Nashik", "Pune", "Nagpur", "Aurangabad"], lat: [18.5, 21.0], lng: [73.5, 78.5] },
  "Andhra Pradesh": { districts: ["Visakhapatnam", "Vijayawada", "Guntur", "Kurnool"], lat: [14.5, 17.8], lng: [78.5, 83.2] },
  "Karnataka": { districts: ["Belagavi", "Hubballi", "Mysuru", "Mangaluru"], lat: [12.3, 16.5], lng: [74.5, 77.5] },
  "Tamil Nadu": { districts: ["Chennai", "Coimbatore", "Madurai", "Salem"], lat: [9.9, 13.1], lng: [77.0, 80.3] },
  "Bihar": { districts: ["Darbhanga", "Patna", "Gaya", "Muzaffarpur"], lat: [24.8, 26.6], lng: [84.5, 87.0] },
  "Rajasthan": { districts: ["Jaipur", "Jodhpur", "Udaipur", "Kota"], lat: [24.6, 28.0], lng: [72.5, 76.5] },
  "Madhya Pradesh": { districts: ["Bhopal", "Indore", "Gwalior", "Jabalpur"], lat: [21.5, 24.5], lng: [76.0, 80.5] },
  "West Bengal": { districts: ["Kolkata", "Howrah", "Durgapur", "Siliguri"], lat: [22.0, 27.0], lng: [86.5, 89.0] },
  "Gujarat": { districts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"], lat: [20.5, 23.8], lng: [69.5, 73.5] },
};
export const STATES = Object.keys(STATE_DISTRICTS);

const DELAY_DRIVER_POOL = [
  { key: "compensation", label: "Pending compensation disbursal" },
  { key: "legal", label: "Active legal disputes" },
  { key: "documentation", label: "Incomplete ownership documentation" },
  { key: "rr", label: "Delayed rehabilitation & resettlement" },
  { key: "coordination", label: "Poor inter-department coordination" },
  { key: "approval", label: "Approval stage backlog" },
  { key: "objection", label: "Unresolved landowner objections" },
];

const RECOMMENDATIONS = {
  compensation: "Expedite compensation disbursement to unlock possession.",
  legal: "Fast-track pending disputes through the district tribunal.",
  documentation: "Deploy OCR record digitisation to clear the title backlog.",
  rr: "Escalate the R&R package review with the district collector.",
  coordination: "Schedule a joint coordination meeting with overlapping departments.",
  approval: "Flag the file for priority movement at the current approval stage.",
  objection: "Convene an objection hearing within 15 days to resolve pending claims.",
};

const TIMELINE_STAGES = [
  { key: "notification", label: "Notification (3A)" },
  { key: "survey", label: "Survey & Measurement" },
  { key: "objection", label: "Objection Hearing" },
  { key: "award", label: "Award (3D)" },
  { key: "compensation", label: "Compensation Disbursal" },
  { key: "possession", label: "Possession" },
];

// Deterministic stand-in for the SHA-256 fingerprint real uploads get
// (see src/utils/fileHash.js) — legacy seed records never went through
// an actual file, so there's nothing to hash, but the field still needs
// to look and behave like a real one everywhere it's displayed.
function pseudoFingerprint(id, salt) {
  const seedStr = `${id}-${salt}`;
  let h1 = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h1 ^= seedStr.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  const hex = (h1 >>> 0).toString(16).padStart(8, "0");
  return (hex + hex + hex + hex + hex + hex + hex + hex).slice(0, 64);
}

function riskLevelFromScore(score) {
  if (score >= 65) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}

export function buildTimeline(rand, stageCount, overallDelayDays) {
  let cursor = 0;
  return TIMELINE_STAGES.map((stage, i) => {
    const plannedSpan = range2(rand, 20, 45);
    cursor += plannedSpan;
    const isDone = i < stageCount;
    const overdue = isDone && rand() > 0.55;
    const delay = overdue ? range2(rand, 5, Math.max(6, Math.round(overallDelayDays / 3))) : 0;
    return {
      key: stage.key,
      label: stage.label,
      plannedDay: cursor,
      status: isDone ? (overdue ? "completed-overdue" : "completed-on-time") : "pending",
      delayDays: delay,
    };
  });
}
function range2(r, min, max) {
  return Math.floor(r() * (max - min + 1)) + min;
}

function makeProject(index) {
  const year = pick(["2021", "2022", "2023", "2024"]);
  const id = `LA-${year}-${String(index).padStart(4, "0")}`;
  const { type, department } = pick(PROJECT_TYPES);
  const state = pick(STATES);
  const geo = STATE_DISTRICTS[state];
  const district = pick(geo.districts);
  const lat = geo.lat[0] + rand() * (geo.lat[1] - geo.lat[0]);
  const lng = geo.lng[0] + rand() * (geo.lng[1] - geo.lng[0]);

  const familiesAffected = range(8, 420);
  const landAreaHectares = +(range(5, 900) + rand()).toFixed(1);
  const projectBudget = range(8, 620) * 1_00_00_000; // 8Cr - 620Cr
  const compensationAssessed = Math.round(projectBudget * (0.08 + rand() * 0.1));
  const compensationDisbursedPct = range(10, 100);
  const legalDisputes = rand() > 0.6 ? range(1, 6) : 0;
  const rrProgressPct = range(15, 100);
  const approvalStage = range(1, 5);

  const riskScore = Math.min(
    97,
    Math.round(
      (legalDisputes > 0 ? 22 : 0) +
        (100 - compensationDisbursedPct) * 0.28 +
        (100 - rrProgressPct) * 0.18 +
        (5 - approvalStage) * 6 +
        range(0, 18)
    )
  );
  const riskLevel = riskLevelFromScore(riskScore);

  const driverCount = riskLevel === "High" ? range(3, 4) : riskLevel === "Medium" ? range(2, 3) : range(1, 2);
  const shuffled = [...DELAY_DRIVER_POOL].sort(() => rand() - 0.5).slice(0, driverCount);
  const total = shuffled.length;
  const delayDrivers = shuffled
    .map((d, i) => ({ ...d, impact: Math.round((total - i) * (8 + rand() * 10)) }))
    .sort((a, b) => b.impact - a.impact);
  const topDriver = delayDrivers[0]?.key || "approval";

  const overallDelayDays =
    riskLevel === "High" ? range(45, 730) : riskLevel === "Medium" ? range(10, 180) : range(-10, 20);

  const status = rand() > 0.82 ? "Completed" : rand() > 0.94 ? "Stalled" : "Ongoing";
  const stageCount = status === "Completed" ? 6 : approvalStage;
  const timeline = buildTimeline(rand, stageCount, overallDelayDays);

  const plannedDurationDays = range(240, 900);
  const actualDurationDays =
    status === "Completed" ? plannedDurationDays + Math.max(0, overallDelayDays) : null;
  const actualEndDate =
    status === "Completed"
      ? new Date(Date.now() - range(10, 400) * 86400000).toISOString().slice(0, 10)
      : null;

  const actionTaken = status === "Completed" ? rand() > 0.4 : rand() > 0.55;
  const finalOutcome =
    status === "Completed" ? (actionTaken ? pick(["On-track close", "Minor overrun"]) : pick(["Major overrun", "Shelved"])) : null;

  const estimatedCostOverrun = Math.round(
    projectBudget * (Math.max(0, overallDelayDays) / 1000) * (0.9 + rand() * 0.6)
  );

  const MOCK_OWNERS = [
    { id: "OFF-1042", name: "R. Sharma", role: "Official", department: "Ministry of Railways" },
    { id: "OFF-2077", name: "A. Iyer", role: "Official", department: "NHAI" },
  ];
  
  const owners = MOCK_OWNERS;
  const createdBy = pick(owners).id;

  const lastActivityDate = new Date(
    Date.now() - range(0, riskLevel === "High" ? 210 : 40) * 86400000
  )
    .toISOString()
    .slice(0, 10);
  const createdAt = new Date(Date.now() - range(30, 1200) * 86400000).toISOString().slice(0, 10);

  // Data-integrity metadata for legacy/seed records, mirroring the
  // provenance the intake form now tracks for new submissions: some
  // records were imported with a scanned source document and later
  // admin-verified, some have a document but a hand-edited field that
  // still needs review, and the rest were always self-reported.
  const provenanceRoll = rand();
  const hasSourceDocument = provenanceRoll < 0.55;
  const wasOverridden = hasSourceDocument && provenanceRoll < 0.15;
  const verificationStatus = !hasSourceDocument
    ? "Self-reported — no source document"
    : wasOverridden
    ? "Needs review — edited after extraction"
    : rand() < 0.5
    ? "Verified — matches source document"
    : "Verified — reviewed by admin";
  const sourceDocument = hasSourceDocument
    ? { name: `${id}-award-order.pdf`, url: null, fingerprint: pseudoFingerprint(id, "award-order"), size: range(80_000, 900_000) }
    : null;
  // Legacy/seed records didn't go through the current compulsory-document
  // intake flow, so this stands in for what the locked `documents` array
  // would look like if they had — one entry when a source document was
  // recorded, otherwise none (which the UI now flags as needing one).
  const documents = sourceDocument
    ? [{ id: `${id}-doc-1`, name: sourceDocument.name, url: null, fingerprint: sourceDocument.fingerprint, size: sourceDocument.size, addedAt: createdAt }]
    : [];
  const overriddenFields = wasOverridden
    ? [pick(["compensationDisbursedPct", "rrProgressPct", "familiesAffected"])]
    : [];
  const auditLog = [
    {
      at: new Date(createdAt).toISOString(),
      by: createdBy,
      action: "created",
      note: sourceDocument
        ? `Imported from legacy records with source document "${sourceDocument.name}".`
        : "Imported from legacy records (self-reported, no source document).",
    },
    ...(verificationStatus === "Verified — reviewed by admin"
      ? [
          {
            at: new Date(lastActivityDate).toISOString(),
            by: "ADM-0001",
            action: "verified",
            note: "Reviewed and approved by S. Bhatt (Admin).",
          },
        ]
      : []),
  ];

  return {
    id,
    projectType: type,
    department,
    state,
    district,
    lat: +lat.toFixed(4),
    lng: +lng.toFixed(4),
    familiesAffected,
    landAreaHectares,
    projectBudget,
    compensationAssessed,
    compensationDisbursedPct,
    legalDisputes,
    rrProgressPct,
    approvalStage,
    riskScore,
    riskLevel,
    delayDrivers,
    topDriver,
    recommendedAction: RECOMMENDATIONS[topDriver],
    overallDelayDays,
    status,
    plannedDurationDays,
    actualDurationDays,
    actualEndDate,
    actionTaken,
    finalOutcome,
    estimatedCostOverrun: Math.max(0, estimatedCostOverrun),
    historicalEvidence: {
      avgBudgetOverrunPct: range(8, 42),
      shelvingRatePct: range(3, 28),
      sampleSize: range(6, 40),
    },
    createdBy,
    createdAt,
    lastActivityDate,
    timeline,
    sourceDocument,
    documents,
    fieldProvenance: {},
    overriddenFields,
    verificationStatus,
    auditLog,
  };
}

export const PROJECTS = Array.from({ length: 96 }, (_, i) => makeProject(i + 1));

// ---- Aggregation helpers (stand in for backend /analytics endpoints) ----

export function summaryStats(projects = PROJECTS) {
  const high = projects.filter((p) => p.riskLevel === "High").length;
  const medium = projects.filter((p) => p.riskLevel === "Medium").length;
  const low = projects.filter((p) => p.riskLevel === "Low").length;
  const avgOverdue = Math.round(
    projects.reduce((s, p) => s + Math.max(0, p.overallDelayDays), 0) / projects.length
  );
  return { total: projects.length, high, medium, low, avgOverdue };
}

export function stateTrend(projects = PROJECTS) {
  const byState = {};
  projects.forEach((p) => {
    byState[p.state] = byState[p.state] || { state: p.state, High: 0, Medium: 0, Low: 0 };
    byState[p.state][p.riskLevel] += 1;
  });
  return Object.values(byState).sort((a, b) => (b.High + b.Medium) - (a.High + a.Medium));
}

export function monthlyTrend(projects = PROJECTS) {
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  const rnd = mulberry32(7);
  return months.map((m, i) => ({
    month: m,
    High: 40 + Math.round(rnd() * 30) + i * 6,
    Medium: 20 + Math.round(rnd() * 20),
    Low: 10 + Math.round(rnd() * 10),
  }));
}

export function departmentRiskBreakdown(department, projects = PROJECTS) {
  const filtered = department ? projects.filter((p) => p.department === department) : projects;
  const high = filtered.filter((p) => p.riskLevel === "High").length;
  const medium = filtered.filter((p) => p.riskLevel === "Medium").length;
  const low = filtered.filter((p) => p.riskLevel === "Low").length;
  return [
    { name: "High", value: high },
    { name: "Medium", value: medium },
    { name: "Low", value: low },
  ];
}

export function progressByStage(projects = PROJECTS) {
  return TIMELINE_STAGES.map((stage) => {
    const completed = projects.filter((p) =>
      p.timeline.find((t) => t.key === stage.key && t.status.startsWith("completed"))
    ).length;
    const overdue = projects.filter((p) =>
      p.timeline.find((t) => t.key === stage.key && t.status === "completed-overdue")
    ).length;
    return { stage: stage.label, completed, overdue, onTime: completed - overdue };
  });
}

export { TIMELINE_STAGES };
