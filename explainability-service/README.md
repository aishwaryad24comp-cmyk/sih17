# SIH26017 -- Member 3: Explainability & Recommendations Service

Built on top of Member 2 (Manushree)'s trained models:
- `land_delay_classifier.pkl` -- **CatBoostClassifier** (confirmed final,
  2026-09-05: `train_classifier.py` trains Logistic Regression / Random
  Forest / CatBoost side by side and saves CatBoost as the official model)
- `land_delay_regressor.pkl` -- Gradient Boosting Regressor (delay_days)

**This folder does not modify or duplicate anyone else's files.** It
loads Member 2's `.pkl` files and Member 1's dataset directly from their
existing folders via relative paths -- no copies included here.

## Repo layout this expects

```
repo-root/
├── database/
│   └── land_acquisition_synthetic_dataset.csv      (Member 1's, 27 columns
│                                                     -- must include
│                                                     project_budget,
│                                                     action_taken,
│                                                     final_outcome)
├── Manushree/
│   ├── land_delay_classifier.pkl                   (Member 2's, unchanged)
│   ├── land_delay_regressor.pkl                    (Member 2's, unchanged)
│   └── predict.py
└── explainability-service/                          <- this folder
    ├── main.py
    ├── explain.py
    ├── recommendations.py
    ├── preprocessing.py
    ├── historical_evidence.py
    ├── requirements.txt
    └── README.md
```

Drop this `explainability-service` folder in as a **sibling** of
`database/` and `Manushree/` (i.e. same level in the repo root). If your
repo uses different folder names, update the two paths in `main.py` and
`explain.py` (search for `../Manushree/` and `../database/`).

## What this adds

1. **SHAP explainability** (`explain.py`) -- ranks the top delay drivers
   per project using `shap.TreeExplainer` against the real CatBoost model
   (exact values from the tree structure, no approximation needed).
   One-hot encoded columns (e.g. all `district_*` dummies) are grouped
   back into a single human-readable driver.
2. **Rule-based recommendations** (`recommendations.py`) -- maps each
   risk-increasing driver to a concrete corrective action.
3. **Feature #19 -- Historical Outcome Evidence** (`historical_evidence.py`)
   -- for the current project's top driver + project type, surfaces what
   happened to similar past projects where no corrective action was taken
   (average budget overrun %, shelving rate). Built once at startup from
   the ~180 historical delayed-and-unactioned rows in the dataset.
4. **Feature #20 -- Budget-Impact Estimator** (in `recommendations.py`) --
   converts predicted delay days into an estimated ₹ cost overrun, using
   an adjustable assumed escalation rate (see the module docstring --
   this is a documented assumption, not fitted to real DoLR data, and
   should be presented to judges as such).
5. **FastAPI service** (`main.py`) exposing `/predict`, `/explain`,
   `/recommend` for Member 6 to call from the Express backend.

## Setup (VS Code / local machine)

```bash
cd explainability-service
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://127.0.0.1:8000/docs for interactive Swagger UI testing.

## Endpoints

All three take the same request body (a single project's raw fields --
see the example in `main.py`'s `ProjectInput` schema, or the Swagger UI).
`project_budget` is optional and only needed for `/recommend`'s
Feature #20 output.

### POST /predict
Same output shape as Manushree's own `predict.py`:
```json
{
  "predicted_risk_pct": 99.36,
  "risk_level": "High",
  "predicted_delay_days": 329
}
```

### POST /explain
```json
{
  "top_shap_drivers": [
    {"feature": "Legal disputes", "raw_feature": "legal_disputes_count",
     "value": 3, "shap_value": 4.23, "direction": "increases_risk"}
  ]
}
```

### POST /recommend
```json
{
  "recommended_actions": [
    {"driver": "Legal disputes",
     "recommendation": "3 active legal disputes... Fast-track through a dedicated land-acquisition litigation cell..."}
  ],
  "historical_evidence": {
    "matched_on": "project_type + top_driver",
    "sample_size": 35,
    "avg_budget_overrun_pct": 38.7,
    "shelving_rate_pct": 22.9,
    "note": "Based on 35 similar past project(s) ... where no corrective action was taken."
  },
  "budget_impact": {
    "predicted_delay_days": 329,
    "estimated_overrun_pct": 39.48,
    "estimated_cost_overrun_inr": 197400000,
    "assumption": "0.12% of project_budget per day delayed, capped at 80.0%. ..."
  }
}
```
`historical_evidence` is `null` if no similar past project exists.
`budget_impact` is `null` if `project_budget` wasn't supplied in the request.

## Verified

- Preprocessing (`preprocessing.py`) mirrors Manushree's `predict.py`
  exactly (same reference date, same approval-stage parsing, same
  dropped columns) so `/explain` and `/recommend` see identical features
  to what `/predict` and the original model were trained/tested on.
- Tested with this exact folder layout (sibling `database/` and
  `Manushree/` folders) -- all three endpoints run correctly via
  relative paths, no local copies needed.
- Tested against Manushree's own sample project -- `/predict` output:
  99.36% / High / 329 days (matches the CatBoost model exactly; the
  regressor's 329-day figure is unchanged from the earlier Logistic
  Regression era, since only the classifier was swapped).
- `/recommend` tested both with and without `project_budget` supplied --
  `budget_impact` correctly returns `null` rather than a guessed number
  when it's omitted.
- Confirmed no target leakage in `train_classifier.py`
  (`risk_score_raw`, `delayed`, `delay_days`, `project_id` all excluded
  from features).

## If Member 2 retrains / updates the model

As long as the new model is saved as a pickled `Pipeline` with steps
named `preprocessor` (a `ColumnTransformer`) and `classifier`, and takes
the same raw input columns, this service keeps working with zero code
changes here -- her updated `.pkl` files will just be picked up
automatically from `../Manushree/` (her `retrain_model.py` already
overwrites this same canonical file and calls `reload_model()`).

If the model type changes away from a tree-based model (e.g. back to
Logistic Regression), swap `shap.TreeExplainer` for
`shap.LinearExplainer` in `explain.py` -- LinearExplainer needs a
background sample (see git history for the earlier version that built
one via `_build_background()`).
