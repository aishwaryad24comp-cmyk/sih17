# Data Lead Handoff — SIH 26017

## Files
- `land_acquisition_synthetic_dataset.csv` — 850 synthetic project records
- `mongo_schema.js` — MongoDB collection schema + indexes
- `generate_dataset.py` — generator script (re-run to regenerate/expand the dataset)

## How the data was calibrated (cite these in your slide/report)
- Overall delay rate ~34% — in line with NHAI Lok Sabha replies (58/226 ≈ 26% delayed;
  210 NH projects delayed nationally) and the parliamentary panel finding that ~35%
  of ~700 delayed highway projects cite land-acquisition disputes specifically.
- Project-type risk ordering (Railway/Irrigation highest, Power/Urban Metro lowest)
  follows the IJCRT cost-overrun study (water resources 197% overrun, railways 50%).
- State weighting favors Maharashtra, UP, AP, Bihar, Gujarat, Tamil Nadu — the states
  named in Lok Sabha replies and the CAG-style overrun reports as having the largest
  stalled-project pipelines.
- Compensation-disbursed % and R&R progress scale with approval stage and are pulled
  down by legal dispute count — reflecting RFCTLARR's 3–6 month SIA/award timeline
  and the ~1.74 lakh pending compensation disputes cited by the Minister (Lok Sabha,
  Dec 2022).

**Label clearly in your deck**: this is synthetic/illustrative data, calibrated to
public reports, not real government records.

## Columns
| Column | Notes |
|---|---|
| project_id | Unique ID |
| state, district, latitude, longitude | For GIS map (Member 5) |
| project_type | 6 categories |
| implementing_department | Realistic dept per project type |
| land_area_hectares, families_affected | Right-skewed (lognormal/gamma) |
| compensation_assessed_inr | Scales with land area + families |
| compensation_disbursed_pct | 0-100, key delay driver |
| legal_disputes_count | Heavy-tailed (most 0, some up to 12) |
| notification_date | ISO date, project age driver |
| approval_stage | "Stage N of 5" |
| rr_progress_pct | Correlated with compensation_disbursed_pct |
| stakeholder_responsiveness | Low/Medium/High |
| historical_dept_avg_delay_days | Dept-level prior |
| last_activity_date | For "stale project" alerts |
| risk_score_raw | **Ground-truth generator signal — exclude from model features, it leaks the label** |
| delayed | Target (classification): Y/N |
| delay_days | Target (regression) |

**Note:** `predicted_risk_pct`, `top_shap_drivers`, and `recommended_action` are **not**
columns in this CSV. Members 2 and 3 generate/append these downstream (e.g. in
`final_predictions.csv` or a separate output), rather than this base dataset carrying
empty placeholder columns. Keeps this file a clean, single-purpose source dataset.

## Import into MongoDB
```bash
mongosh < mongo_schema.js
mongoimport --db sih26017 --collection projects \
  --type csv --file land_acquisition_synthetic_dataset.csv --headerline
```

## For Member 2 (ML Engineer)
Drop `risk_score_raw` before training — it's the synthetic ground-truth signal used
to generate the label and would leak the target. Train on the rest.

## Changelog (post-review fixes)
- Fixed `project_id` generation: was truncated to 4 hex digits (`uuid4().int[:4]`),
  causing ~36 duplicate IDs across 850 rows, which broke the merge in
  `combine_predictions.py`. Now uses `LA-{year}-{i:04d}` — guaranteed unique per row.
- Fixed hardcoded output path (`/mnt/user-data/outputs/...`, sandbox-only) to a
  relative path (`land_acquisition_synthetic_dataset.csv`) so the script runs on
  any machine when executed from the `database/` folder.
- Fixed `last_activity_date`: previously random within the last 90 days regardless
  of risk. Now delayed/high-risk projects skew toward a longer silence (median 37
  days vs 9 for on-track projects) to give the "silent stall" alarm feature a real
  signal to detect.
- Corrected this README: removed references to `predicted_risk_pct`,
  `top_shap_drivers`, `recommended_action` as CSV columns — those are Member 2/3
  outputs, not part of this base file.

**Re-verified: 850/850 unique project_ids after regeneration.**
