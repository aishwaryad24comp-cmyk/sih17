// backend/import_csv.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
require('dotenv').config();
const Project = require('./src/models/Project').default;

const CSV_PATH = path.join(__dirname, '..', 'database', 'land_acquisition_synthetic_dataset.csv');

async function importCsv() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const rows = [];

  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
      console.log(`Parsed ${rows.length} rows from CSV`);

      let inserted = 0;
      let skipped = 0;

      for (const row of rows) {
        try {
          const exists = await Project.findOne({ project_id: row.project_id });
          if (exists) {
            skipped++;
            continue;
          }

          await Project.create({
            project_id: row.project_id,
            state: row.state,
            district: row.district,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            project_type: row.project_type,
            implementing_department: row.implementing_department,
            land_area_hectares: parseFloat(row.land_area_hectares),
            families_affected: parseInt(row.families_affected, 10),
            compensation_assessed_inr: parseFloat(row.compensation_assessed_inr),
            compensation_disbursed_pct: parseFloat(row.compensation_disbursed_pct),
            legal_disputes_count: parseInt(row.legal_disputes_count, 10),
            notification_date: row.notification_date,
            approval_stage: row.approval_stage,
            rr_progress_pct: parseFloat(row.rr_progress_pct),
            stakeholder_responsiveness: row.stakeholder_responsiveness,
            historical_dept_avg_delay_days: parseInt(row.historical_dept_avg_delay_days, 10),
            last_activity_date: row.last_activity_date,
            risk_score_raw: row.risk_score_raw ? parseFloat(row.risk_score_raw) : undefined,
            delayed: row.delayed,
            delay_days: row.delay_days ? parseInt(row.delay_days, 10) : undefined,
            project_budget: row.project_budget ? parseFloat(row.project_budget) : 0,
            status: row.status || 'Ongoing',
            created_by: row.created_by || 'seed-official',
          });
          inserted++;
        } catch (err) {
          console.error(`Failed to import ${row.project_id}:`, err.message);
        }
      }

      console.log(`Import complete. Inserted: ${inserted}, Skipped (already existed): ${skipped}`);
      await mongoose.disconnect();
      process.exit(0);
    });
}

importCsv().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});