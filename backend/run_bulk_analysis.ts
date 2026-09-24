import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import Project from './src/models/Project';

dotenv.config();

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

async function runBulkAnalysis() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sih_db');
    console.log('Connected to MongoDB.');

    const projects = await Project.find();
    console.log(`Found ${projects.length} projects to analyze.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      
      const payload = {
        state: project.state,
        district: project.district,
        latitude: project.latitude,
        longitude: project.longitude,
        project_type: project.project_type,
        implementing_department: project.implementing_department,
        land_area_hectares: project.land_area_hectares,
        families_affected: project.families_affected,
        compensation_assessed_inr: project.compensation_assessed_inr,
        compensation_disbursed_pct: project.compensation_disbursed_pct,
        legal_disputes_count: project.legal_disputes_count,
        notification_date: new Date(project.notification_date).toISOString().split('T')[0],
        approval_stage: project.approval_stage,
        rr_progress_pct: project.rr_progress_pct,
        stakeholder_responsiveness: project.stakeholder_responsiveness,
        historical_dept_avg_delay_days: project.historical_dept_avg_delay_days,
        last_activity_date: new Date(project.last_activity_date).toISOString().split('T')[0]
      };

      try {
        const predictRes = await axios.post(`${FASTAPI_URL}/predict`, payload);
        const explainRes = await axios.post(`${FASTAPI_URL}/explain`, payload);
        const recommendRes = await axios.post(`${FASTAPI_URL}/recommend`, payload);

        project.predicted_risk_pct = predictRes.data.predicted_risk_pct;
        project.top_shap_drivers = explainRes.data.top_shap_drivers;
        
        const firstRec = Array.isArray(recommendRes.data.recommended_actions) 
          ? recommendRes.data.recommended_actions[0] 
          : recommendRes.data.recommended_actions;
        project.recommended_action = firstRec?.recommendation || JSON.stringify(firstRec);

        await project.save();
        successCount++;
        process.stdout.write(`\rAnalyzed: ${successCount}/${projects.length}`);
      } catch (err: any) {
        failCount++;
        // If FastAPI is down, we break to avoid spamming 850 failed requests.
        console.error(`\nFailed to reach FastAPI at ${FASTAPI_URL}. Is your Python model running?`);
        console.error(err.message);
        break;
      }
    }

    console.log(`\n\nAnalysis Complete. Success: ${successCount}, Failed: ${failCount}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during bulk analysis:', err);
    process.exit(1);
  }
}

runBulkAnalysis();
