import mongoose from 'mongoose';
import Project from './src/models/Project';

async function forceCreateDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sih_db');
    console.log('Successfully connected to local MongoDB.');

    console.log('Creating a temporary document to force the database to appear...');
    
    // Create a dummy document so MongoDB creates the physical database
    await Project.create({
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
    await Project.deleteOne({ project_id: "INIT-001" });
    console.log('Cleanup complete.');

    await mongoose.disconnect();
    console.log('All done!');
  } catch (err) {
    console.error('An error occurred:', err);
    process.exit(1);
  }
}

forceCreateDB();
