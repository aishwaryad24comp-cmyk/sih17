"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ProjectSchema = new mongoose_1.Schema({
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
    implementing_department: { type: String, required: true },
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
    recommended_action: { type: String }
});
ProjectSchema.index({ state: 1, district: 1 });
ProjectSchema.index({ project_type: 1 });
ProjectSchema.index({ delayed: 1 });
ProjectSchema.index({ latitude: 1, longitude: 1 });
exports.default = mongoose_1.default.model('Project', ProjectSchema);
