"""
SIH26017 -- Member 3 deliverable: Explainability & Recommendations service.
Built on top of Member 2's (Manushree) real trained models:
  - land_delay_classifier.pkl  (CatBoostClassifier -- confirmed final model
    as of the 2026-09-05 train_classifier.py model comparison, which trains
    Logistic Regression / Random Forest / CatBoost side by side)
  - land_delay_regressor.pkl   (Gradient Boosting Regressor, delay_days)

Exposes:
  POST /predict         -> predicted_risk_pct, risk_level, predicted_delay_days
                            (same output shape as Manushree's predict.py, so
                             Member 6 can swap this in as a drop-in HTTP service)
  POST /explain          -> ranked SHAP delay drivers for a project
  POST /recommend        -> corrective-action recommendations, PLUS
                             Feature #19 (historical_evidence) and
                             Feature #20 (budget_impact) when project_budget
                             is supplied
  POST /fairness-check   -> Feature #9, flags a compensation offer that looks
                             unfairly low against a peer benchmark for the
                             same district

Run:
    uvicorn main:app --reload

Then open http://127.0.0.1:8000/docs for interactive testing.
"""

import warnings
from typing import Optional

import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from preprocessing import prepare_project
from explain import Explainer
from recommendations import recommend, estimate_budget_impact
from historical_evidence import HistoricalEvidenceIndex
from fairness_checker import FairnessGapIndex

warnings.filterwarnings("ignore", category=UserWarning)

app = FastAPI(title="SIH26017 Explainability & Recommendations Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your actual frontend/backend origins before demo day
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths assume this folder sits alongside Manushree/ and database/ in the
# repo root -- see README.md "Repo layout" section.
classifier = joblib.load("../Manushree/land_delay_classifier.pkl")
regressor = joblib.load("../Manushree/land_delay_regressor.pkl")
explainer = Explainer()
history_index = HistoricalEvidenceIndex(explainer)  # Feature #19, built once at startup
fairness_index = FairnessGapIndex()  # Feature #9, built once at startup


class ProjectInput(BaseModel):
    state: str = Field(..., json_schema_extra={"example": "Maharashtra"})
    district: str = Field(..., json_schema_extra={"example": "Pune"})
    latitude: float = Field(..., json_schema_extra={"example": 18.5204})
    longitude: float = Field(..., json_schema_extra={"example": 73.8567})
    project_type: str = Field(..., json_schema_extra={"example": "Highway"})
    implementing_department: str = Field(..., json_schema_extra={"example": "NHAI"})
    land_area_hectares: float = Field(..., json_schema_extra={"example": 120.5})
    families_affected: int = Field(..., json_schema_extra={"example": 350})
    compensation_assessed_inr: int = Field(..., json_schema_extra={"example": 850000000})
    compensation_disbursed_pct: float = Field(..., json_schema_extra={"example": 42.0})
    legal_disputes_count: int = Field(..., json_schema_extra={"example": 3})
    notification_date: str = Field(..., json_schema_extra={"example": "2024-01-10"})
    approval_stage: str = Field(..., json_schema_extra={"example": "Stage 3 of 5"})
    rr_progress_pct: float = Field(..., json_schema_extra={"example": 38.0})
    stakeholder_responsiveness: str = Field(..., json_schema_extra={"example": "Medium"})
    historical_dept_avg_delay_days: int = Field(..., json_schema_extra={"example": 210})
    last_activity_date: str = Field(..., json_schema_extra={"example": "2026-08-01"})
    project_budget: Optional[int] = Field(
        None,
        json_schema_extra={"example": 500000000},
        description=(
            "Optional. Needed for Feature #20 (Budget-Impact Estimator) in "
            "/recommend -- omit and that section is simply left out of the "
            "response rather than guessed."
        ),
    )


class FairnessCheckInput(BaseModel):
    district: str = Field(..., json_schema_extra={"example": "Pune"})
    project_type: str = Field(..., json_schema_extra={"example": "Highway"})
    compensation_assessed_inr: float = Field(..., json_schema_extra={"example": 850000000})
    land_area_hectares: float = Field(..., json_schema_extra={"example": 120.5})
    project_id: Optional[str] = Field(
        None,
        description=(
            "If this project already exists in the historical dataset, pass "
            "its project_id so it's excluded from its own benchmark."
        ),
    )


def _risk_level(pct: float) -> str:
    # matches Manushree's thresholds in predict.py exactly
    if pct <= 30:
        return "Low"
    if pct <= 60:
        return "Medium"
    return "High"


@app.get("/")
def health():
    return {"status": "ok", "service": "SIH26017 explainability service"}


@app.post("/predict")
def predict(payload: ProjectInput):
    prepared = prepare_project(payload.dict())
    risk_probability = classifier.predict_proba(prepared)[0][1]
    risk_pct = float(round(risk_probability * 100, 2))
    predicted_delay = int(max(0, regressor.predict(prepared)[0]))
    return {
        "predicted_risk_pct": risk_pct,
        "risk_level": _risk_level(risk_pct),
        "predicted_delay_days": predicted_delay,
    }


@app.post("/explain")
def explain(payload: ProjectInput, top_n: int = 5):
    drivers = explainer.explain(payload.dict(), top_n=top_n)
    return {"top_shap_drivers": drivers}


@app.post("/recommend")
def recommend_endpoint(payload: ProjectInput, max_recommendations: int = 3):
    prepared = prepare_project(payload.dict(exclude={"project_budget"}))
    drivers = explainer.explain(payload.dict(exclude={"project_budget"}), top_n=5)
    actions = recommend(drivers, max_recommendations=max_recommendations)

    predicted_delay_days = int(max(0, regressor.predict(prepared)[0]))

    top_driver = drivers[0]["raw_feature"] if drivers else None
    historical_evidence = (
        history_index.lookup(payload.project_type, top_driver) if top_driver else None
    )

    budget_impact = estimate_budget_impact(payload.project_budget, predicted_delay_days)

    return {
        "recommended_actions": actions,
        "historical_evidence": historical_evidence,  # Feature #19 -- None if no historical basis
        "budget_impact": budget_impact,  # Feature #20 -- None if project_budget wasn't supplied
    }


@app.post("/fairness-check")
def fairness_check(payload: FairnessCheckInput):
    """
    Feature #9 -- Fairness-Gap Checker. Flags a compensation offer that
    looks unfairly low against a peer benchmark for the same district
    (see fairness_checker.py docstring for the proxy-vs-real-data caveat
    to mention to judges). Returns None if there's no peer basis at all
    (brand-new district with zero other projects in the dataset).
    """
    result = fairness_index.check(
        district=payload.district,
        project_type=payload.project_type,
        compensation_assessed_inr=payload.compensation_assessed_inr,
        land_area_hectares=payload.land_area_hectares,
        project_id=payload.project_id,
    )
    return {"fairness_report": result}