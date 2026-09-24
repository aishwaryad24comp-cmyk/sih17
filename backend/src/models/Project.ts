import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  project_id: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  project_type: string;
  implementing_department: string;
  land_area_hectares: number;
  families_affected: number;
  compensation_assessed_inr: number;
  compensation_disbursed_pct: number;
  legal_disputes_count: number;
  notification_date: string;
  approval_stage: string;
  rr_progress_pct: number;
  stakeholder_responsiveness: string;
  historical_dept_avg_delay_days: number;
  last_activity_date: string;
  risk_score_raw?: number;
  delayed?: string;
  delay_days?: number;
  predicted_risk_pct?: number;
  top_shap_drivers?: any[];
  recommended_action?: string;
  // ---- New outcome-tracking fields (added by Member 1 / Data Lead) ----
  project_budget?: number;          // Feature #20 - Budget-Impact Estimator
  status?: string;                  // Feature #22 - Completion Overview
  actual_end_date?: string;         // Feature #22 - only set once status is "Completed"
  action_taken?: boolean;           // Feature #19 - Historical Outcome Evidence
  final_outcome?: string;           // Feature #19 - only set once a project concludes
  created_by?: string;              // Feature #24 - Project Owner Access / "My Projects"
}

const ProjectSchema: Schema = new Schema({
  project_id: { type: String, required: true, unique: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  project_type: {
    type: String,
    required: true,
    enum: ["Highway", "Railway", "Irrigation/Water Res.", "Industrial Corridor", "Power Transmission", "Urban Infra/Metro"]
  },
  implementing_department: {
    type: String,
    required: true,
    // Feature #18 - fixed list so the dashboard filter dropdown always
    // matches real values. Keep this in sync with mongo_schema.js.
    enum: [
      "NHAI", "State PWD",
      "Ministry of Railways", "State Railway Infra Corp",
      "State Water Resources Dept",
      "State Industrial Dev. Corp", "DMIC/NICDC",
      "Power Grid Corp", "State Electricity Board",
      "State Metro Rail Corp", "Urban Dev. Authority"
    ]
  },
  land_area_hectares: { type: Number, required: true, min: 0 },
  families_affected: { type: Number, required: true, min: 0 },
  compensation_assessed_inr: { type: Number, required: true, min: 0 },
  compensation_disbursed_pct: { type: Number, required: true, min: 0, max: 100 },
  legal_disputes_count: { type: Number, required: true, min: 0 },
  notification_date: { type: String, required: true },
  approval_stage: { type: String, required: true },
  rr_progress_pct: { type: Number, required: true, min: 0, max: 100 },
  stakeholder_responsiveness: { type: String, required: true, enum: ["Low", "Medium", "High"] },
  historical_dept_avg_delay_days: { type: Number, required: true, min: 0 },
  last_activity_date: { type: String, required: true },
  risk_score_raw: { type: Number },
  delayed: { type: String, enum: ["Y", "N"] },
  delay_days: { type: Number, min: 0 },
  predicted_risk_pct: { type: Number },
  top_shap_drivers: { type: Array },
  recommended_action: { type: String },

  // ---- New outcome-tracking fields ----
  project_budget: { type: Number, min: 0 },
  status: { type: String, enum: ["Ongoing", "Completed", "Stalled"] },
  actual_end_date: { type: String },
  action_taken: { type: Boolean },
  final_outcome: { type: String, enum: ["On Time", "Delayed - Resolved", "Delayed - Unresolved", "Shelved"] },
  created_by: { type: String }
});

ProjectSchema.index({ state: 1, district: 1 });
ProjectSchema.index({ project_type: 1 });
ProjectSchema.index({ delayed: 1 });
ProjectSchema.index({ latitude: 1, longitude: 1 });
// New indexes for the new features:
ProjectSchema.index({ status: 1 });                   // Feature #22 - Completion Overview filtering
ProjectSchema.index({ created_by: 1 });               // Feature #24 - "My Projects" ownership lookups
ProjectSchema.index({ implementing_department: 1 });  // Feature #18 - Department-Based Dashboard Filter

export default mongoose.model<IProject>('Project', ProjectSchema);