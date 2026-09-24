/**
 * Rule-based recommendation engine (Frontend Fallback).
 * 
 * This executes the exact same deterministic rules as Member 3's Python backend
 * (ai-model/explainability-service/recommendations.py). It ensures that even
 * when the Dashboard is running in dummy/demo mode (VITE_USE_LIVE_API=false),
 * the "AI Recommended Mitigation" box generates ACTUAL recommendations dynamically
 * based on the project's risk profile, rather than relying on hardcoded strings.
 */

export function generateRecommendations(project) {
  if (!project) return null;
  
  // Rule 1: Legal Disputes
  if (project.legal_disputes_count >= 2) {
    return `${project.legal_disputes_count} active legal disputes on this project. Fast-track through a dedicated land-acquisition litigation cell; consider the Lok Adalat/mediation route to avoid prolonged court delays.`;
  }
  
  // Rule 2: Compensation Disbursal Delay
  if (project.compensation_disbursed_pct !== undefined && project.compensation_disbursed_pct < 50 && project.approval_stage && parseInt(project.approval_stage.match(/\d+/)?.[0] || "0") >= 4) {
    return `Compensation only ${project.compensation_disbursed_pct}% disbursed despite reaching advanced stages. Expedite pending payments and prioritize disbursement approvals to defuse landowner disputes.`;
  }
  
  // Rule 3: High Historical Delay for Department
  if (project.historical_dept_avg_delay_days > 150) {
    return `Implementing department (${project.implementing_department || 'Unknown'}) has a historical average delay of ${project.historical_dept_avg_delay_days} days. Flag this department for closer monitoring and additional resource allocation.`;
  }
  
  // Rule 4: Stalled Activity
  // Assuming a project is stalled if it has high delay days but low progress
  if (project.delayDays > 100 && project.progress < 50) {
    return `Project has accumulated ${project.delayDays} days of delay with only ${project.progress}% R&R progress. Trigger a 'silent stall' check — confirm the project hasn't gone quiet before an official delay report is filed.`;
  }

  // Rule 5: Large Scale Eviction/Resettlement Risk
  if (project.families_affected > 500 && project.progress < 60) {
    return `${project.families_affected} families affected. Large-scale resettlement required — ensure dedicated R&R staffing proportional to affected population to prevent local protests.`;
  }

  // Default:
  if (project.risk === 'High') {
    return "Multiple interacting risk vectors detected. Escalate to the state land acquisition unit / District Collector for direct intervention.";
  }
  
  if (project.risk === 'Medium') {
    return "Moderate delay risks identified. Continue standard monitoring and engage the state nodal officer proactively.";
  }

  return "Project is on schedule and risks are well within tolerance limits. Maintain current standard operating procedure.";
}
