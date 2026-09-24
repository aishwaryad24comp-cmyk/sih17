// SIH 26017 - Land Acquisition Delay Prediction
// MongoDB collection setup with JSON Schema validation
// Run with: mongosh < mongo_schema.js   (or paste into MongoDB Compass shell)

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
        "last_activity_date", "delayed", "delay_days"
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
        implementing_department: { bsonType: "string" },
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
        recommended_action: { bsonType: ["string", "null"], description: "Filled by Member 3 (rule-based layer)" }
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

print("Schema + indexes created on 'projects' collection.");
