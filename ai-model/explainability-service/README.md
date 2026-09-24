# SIH26017 -- Member 3: Explainability & Recommendations Service

Built on top of Member 2 (Manushree)'s trained models:
- `land_delay_classifier.pkl` -- Logistic Regression, ROC-AUC 0.9497
- `land_delay_regressor.pkl` -- Gradient Boosting, MAE ~108.8 days

**This folder does not modify or duplicate anyone else's files.** It
loads Member 2's `.pkl` files and Member 1's dataset directly from their
existing folders via relative paths -- no copies included here.

## Repo layout this expects

```
repo-root/
├── database/
│   └── land_acquisition_synthetic_dataset.csv      (Member 1's, unchanged)
├── Manushree/
│   ├── land_delay_classifier.pkl                   (Member 2's, unchanged)
│   ├── land_delay_regressor.pkl                    (Member 2's, unchanged)
│   └── predict.py
└── explainability-service/                          <- this folder
    ├── main.py
    ├── explain.py
    ├── recommendations.py
    ├── preprocessing.py
    ├── requirements.txt
    └── README.md
```

Drop this `explainability-service` folder in as a **sibling** of
`database/` and `Manushree/` (i.e. same level in the repo root). If your
repo uses different folder names, update the two paths in `main.py` and
`explain.py` (search for `../Manushree/` and `../database/`).

## What this adds

1. **SHAP explainability** (`explain.py`) -- ranks the top delay drivers
   per project using `shap.LinearExplainer` against the real Logistic
   Regression model (exact, not approximated, since the model is linear).
   One-hot encoded columns (e.g. all `district_*` dummies) are grouped
   back into a single human-readable driver.
2. **Rule-based recommendations** (`recommendations.py`) -- maps each
   risk-increasing driver to a concrete corrective action.
3. **FastAPI service** (`main.py`) exposing `/predict`, `/explain`,
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

### POST /predict
Same output shape as Manushree's own `predict.py`, so this can be used
as a drop-in HTTP replacement:
```json
{
  "predicted_risk_pct": 96.96,
  "risk_level": "High",
  "predicted_delay_days": 329
}
```

### POST /explain
```json
{
  "top_shap_drivers": [
    {"feature": "Legal disputes", "raw_feature": "legal_disputes_count",
     "value": 3, "shap_value": 4.1469, "direction": "increases_risk"},
    ...
  ]
}
```

### POST /recommend
```json
{
  "recommended_actions": [
    {"driver": "Legal disputes",
     "recommendation": "3 active legal disputes... Fast-track through a dedicated land-acquisition litigation cell..."},
    ...
  ]
}
```

## Verified

- Preprocessing (`preprocessing.py`) mirrors Manushree's `predict.py`
  exactly (same reference date, same approval-stage parsing, same
  dropped columns) so `/explain` and `/recommend` see identical features
  to what `/predict` and the original model were trained/tested on.
- Tested with this exact folder layout (sibling `database/` and
  `Manushree/` folders) -- all three endpoints run correctly via
  relative paths, no local copies needed.
- Tested against Manushree's own sample project -- `/predict` output
  matches her reported result exactly (96.96% / High / 329 days).
- Sanity-checked against a deliberately low-risk project -- correctly
  scores 0.03% / Low, with no false risk drivers surfaced.
- Confirmed no target leakage in `train_classifier.py`
  (`risk_score_raw`, `delayed`, `delay_days`, `project_id` all excluded
  from features).

## If Member 2 retrains / updates the model

As long as the new model is saved as a pickled `Pipeline` with steps
named `preprocessor` (a `ColumnTransformer`) and `classifier`, and takes
the same raw input columns, this service keeps working with zero code
changes here -- her updated `.pkl` files will just be picked up
automatically from `../Manushree/`.

If the model type changes to a non-linear one (e.g. Random Forest,
XGBoost), swap `shap.LinearExplainer` for `shap.TreeExplainer` in
`explain.py`.
