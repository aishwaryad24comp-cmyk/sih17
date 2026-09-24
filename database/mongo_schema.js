// SIH 26017 - Land Acquisition Delay Prediction
// MongoDB collection setup with JSON Schema validation
// Run with: mongosh < mongo_schema.js   (or paste into MongoDB Compass shell)
//
// UPDATE (this version): added the 6 outcome-tracking fields agreed with the
// team - action_taken, final_outcome (Feature #19), project_budget (Feature #20),
// status, actual_end_date (Feature #22), created_by (Feature #24).
db.createCollection("projects", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "project_id", "state", "district", "latitude", "longitude",
        "project_type", "implementing_department", "land_area_hectares",
        "families_affected", "compensation_assessed_inr",
        "compensation_disbursed_pct", "legal_disputes_count",
        "notification_date", "approval_stage", "rr_progress_pct",
        "stakeholder_responsiveness", "historical_dept_avg_delay_days",
        "last_activity_date", "delayed", "delay_days",
        // New required fields: every project has a budget, a status, and an
        // owner from the moment it's created - these are never optional.
        "project_budget", "status", "created_by"
      ],
      properties: {
        project_id: { bsonType: "string", description: "Unique project identifier, e.g. LA-2024-0453" },
        state: { bsonType: "string" },
        district: { bsonType: "string" },
        latitude: { bsonType: "double" },
        longitude: { bsonType: "double" },
        project_type: {
          enum: ["Highway", "Railway", "Irrigation/Water Res.", "Industrial Corridor", "Power Transmission", "Urban Infra/Metro"]
        },
        implementing_department: {
          enum: [
            "NHAI", "State PWD",
            "Ministry of Railways", "State Railway Infra Corp",
            "State Water Resources Dept",
            "State Industrial Dev. Corp", "DMIC/NICDC",
            "Power Grid Corp", "State Electricity Board",
            "State Metro Rail Corp", "Urban Dev. Authority"
          ],
          description: "Fixed department list (Feature #18 - Department-Based Dashboard Filter). Kept as an enum, not free text, so the frontend filter dropdown always matches real values."
        },
        land_area_hectares: { bsonType: "double", minimum: 0 },
        families_affected: { bsonType: "int", minimum: 0 },
        compensation_assessed_inr: { bsonType: ["long", "int"], minimum: 0 },
        compensation_disbursed_pct: { bsonType: "double", minimum: 0, maximum: 100 },
        legal_disputes_count: { bsonType: "int", minimum: 0 },
        notification_date: { bsonType: "string", description: "ISO date string YYYY-MM-DD" },
        approval_stage: { bsonType: "string", description: "e.g. 'Stage 3 of 5'" },
        rr_progress_pct: { bsonType: "double", minimum: 0, maximum: 100 },
        stakeholder_responsiveness: { enum: ["Low", "Medium", "High"] },
        historical_dept_avg_delay_days: { bsonType: "int", minimum: 0 },
        last_activity_date: { bsonType: "string", description: "ISO date string YYYY-MM-DD" },
        risk_score_raw: { bsonType: "double", description: "Synthetic ground-truth risk score used to derive the label (not a model feature)" },
        delayed: { enum: ["Y", "N"], description: "ML target: classification label" },
        delay_days: { bsonType: "int", minimum: 0, description: "ML target: regression label" },
        // Fields added downstream by other members (optional at insert time)
        predicted_risk_pct: { bsonType: ["double", "null"], description: "Filled by Member 2's model" },
        top_shap_drivers: { bsonType: ["array", "null"], description: "Filled by Member 3 (explainability service)" },
        recommended_action: { bsonType: ["string", "null"], description: "Filled by Member 3 (rule-based layer)" },

        // ---- New outcome-tracking fields ----
        project_budget: {
          bsonType: ["long", "int", "double"],
          minimum: 0,
          description: "Total project budget in INR, used to convert predicted delay days into an estimated cost overrun (Feature #20)"
        },
        status: {
          enum: ["Ongoing", "Completed", "Stalled"],
          description: "Current lifecycle status of the project (Feature #22 - Completion Overview)"
        },
        actual_end_date: {
          bsonType: ["string", "null"],
          description: "ISO date string YYYY-MM-DD - only set once status is 'Completed' (Feature #22)"
        },
        action_taken: {
          bsonType: ["bool", "null"],
          description: "Whether corrective action was taken after this project was flagged high-risk; null if the project was never flagged (Feature #19)"
        },
        final_outcome: {
          enum: ["On Time", "Delayed - Resolved", "Delayed - Unresolved", "Shelved", null],
          description: "Final outcome once a project concludes (Completed or Stalled); null while still Ongoing (Feature #19 - Historical Outcome Evidence)"
        },
        created_by: {
          bsonType: "string",
          description: "User ID (or seed-official placeholder for bulk-generated rows) of the official who owns this project (Feature #24 - Project Owner Access / 'My Projects')"
        }
      }
    }
  },
  validationLevel: "moderate"
});
// Indexes for dashboard filters (state/district drilldown, risk sort, map queries)
db.projects.createIndex({ state: 1, district: 1 });
db.projects.createIndex({ project_type: 1 });
db.projects.createIndex({ delayed: 1 });
db.projects.createIndex({ latitude: 1, longitude: 1 });
db.projects.createIndex({ project_id: 1 }, { unique: true });
// New indexes to support the new features:
db.projects.createIndex({ status: 1 });                 // Feature #22 - Completion Overview filtering
db.projects.createIndex({ created_by: 1 });             // Feature #24 - "My Projects" ownership lookups
db.projects.createIndex({ implementing_department: 1 }); // Feature #18 - Department-Based Dashboard Filter
print("Schema + indexes created on 'projects' collection.");
