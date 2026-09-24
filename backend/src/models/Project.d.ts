import mongoose, { Document } from 'mongoose';
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
}
declare const _default: mongoose.Model<IProject, {}, {}, {}, Document<unknown, {}, IProject, {}, mongoose.DefaultSchemaOptions> & IProject & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IProject>;
export default _default;
//# sourceMappingURL=Project.d.ts.map