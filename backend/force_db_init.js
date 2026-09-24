"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Project_1 = __importDefault(require("./src/models/Project"));
function forceCreateDB() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect('mongodb://localhost:27017/sih_db');
            console.log('Successfully connected to local MongoDB.');
            console.log('Creating a temporary document to force the database to appear...');
            // Create a dummy document so MongoDB creates the physical database
            yield Project_1.default.create({
                project_id: "INIT-001",
                state: "Init State",
                district: "Init District",
                latitude: 0.0,
                longitude: 0.0,
                project_type: "Highway",
                implementing_department: "Init Dept",
                land_area_hectares: 1,
                families_affected: 1,
                compensation_assessed_inr: 1000,
                compensation_disbursed_pct: 50,
                legal_disputes_count: 0,
                notification_date: "2024-01-01",
                approval_stage: "Stage 1",
                rr_progress_pct: 50,
                stakeholder_responsiveness: "Medium",
                historical_dept_avg_delay_days: 10,
                last_activity_date: "2024-01-01"
            });
            console.log('Document created! sih_db is now physically saved on disk.');
            // We can leave the document or delete it, deleting it keeps it clean.
            yield Project_1.default.deleteOne({ project_id: "INIT-001" });
            console.log('Cleanup complete.');
            yield mongoose_1.default.disconnect();
            console.log('All done!');
        }
        catch (err) {
            console.error('An error occurred:', err);
            process.exit(1);
        }
    });
}
forceCreateDB();
