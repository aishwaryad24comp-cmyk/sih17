"""
SHAP explainability layer -- Member 3's core deliverable, built against
Member 2's actual land_delay_classifier.pkl (a CatBoostClassifier
Pipeline: ColumnTransformer + CatBoostClassifier -- confirmed final as
of the 2026-09-05 model comparison in train_classifier.py, which trains
Logistic Regression / Random Forest / CatBoost side by side and saves
CatBoost as the official model).

Because the final model is tree-based (CatBoost), we use shap.TreeExplainer
directly against the underlying classifier step for exact, fast SHAP
values -- no background sample needed (unlike LinearExplainer/KernelExplainer,
TreeExplainer computes exact values from the tree structure itself).
"""

import warnings
import joblib
import numpy as np
import pandas as pd
import shap

from preprocessing import prepare_project, raw_feature_name

warnings.filterwarnings("ignore", category=UserWarning)  # sklearn version-mismatch noise

# Paths assume this folder sits alongside Manushree/ and database/ in the
# repo root (same layout as Manushree's own predict.py, which loads its
# .pkl files with a plain relative path from inside her own folder).
MODEL_PATH = "../Manushree/land_delay_classifier.pkl"
DATA_PATH = "../database/land_acquisition_synthetic_dataset.csv"
BACKGROUND_SAMPLE_SIZE = 100

FRIENDLY_NAMES = {
    "state": "State",
    "district": "District",
    "project_type": "Project type",
    "implementing_department": "Implementing department",
    "stakeholder_responsiveness": "Stakeholder responsiveness",
    "latitude": "Latitude",
    "longitude": "Longitude",
    "land_area_hectares": "Land area",
    "families_affected": "Families affected",
    "compensation_assessed_inr": "Compensation assessed",
    "compensation_disbursed_pct": "Compensation disbursed %",
    "legal_disputes_count": "Legal disputes",
    "rr_progress_pct": "R&R progress %",
    "historical_dept_avg_delay_days": "Department's historical avg delay",
    "project_age_days": "Project age",
    "days_since_last_activity": "Days since last activity",
    "approval_stage_num": "Approval stage",
}


def load_feature_frame():
    """
    Raw (not one-hot encoded) feature DataFrame for the whole dataset,
    built the same way as a single prepare_project() call. Used both to
    build/verify the SHAP explainer and by historical_evidence.py's
    batch top-driver lookup, so both stay in sync with one definition.
    """
    df = pd.read_csv(DATA_PATH)
    X = df.drop(columns=[
        c for c in [
            "project_id", "risk_score_raw", "delayed", "delay_days",
            "project_budget", "status", "actual_end_date",
            "action_taken", "final_outcome", "created_by",
        ] if c in df.columns
    ])
    X["notification_date"] = pd.to_datetime(X["notification_date"])
    X["last_activity_date"] = pd.to_datetime(X["last_activity_date"])
    ref = pd.Timestamp("2026-08-27")
    X["project_age_days"] = (ref - X["notification_date"]).dt.days
    X["days_since_last_activity"] = (ref - X["last_activity_date"]).dt.days
    X["approval_stage_num"] = X["approval_stage"].str.extract(r"Stage (\d+)")[0].astype(int)
    X = X.drop(columns=["notification_date", "last_activity_date", "approval_stage"])
    return X


class Explainer:
    def __init__(self):
        self.pipeline = joblib.load(MODEL_PATH)
        self.preprocessor = self.pipeline.named_steps["preprocessor"]
        self.classifier = self.pipeline.named_steps["classifier"]
        self.feature_names = list(self.preprocessor.get_feature_names_out())
        self.shap_explainer = shap.TreeExplainer(self.classifier)

    def explain(self, project: dict, top_n: int = 5):
        """
        project: raw project dict (same shape as predict_project() input).

        Returns ranked list of dicts: feature, value, shap_value, direction.
        One-hot columns are grouped back to their original raw feature so
        e.g. all 'district_*' dummies collapse into a single 'District' driver.
        """
        raw_row = prepare_project(project)
        transformed = self.preprocessor.transform(raw_row)
        if hasattr(transformed, "toarray"):
            transformed = transformed.toarray()

        shap_row = np.array(self.shap_explainer.shap_values(transformed))[0]

        grouped = {}
        value_lookup = {}
        for col, val, transformed_val in zip(self.feature_names, shap_row, transformed[0]):
            raw = raw_feature_name(col)
            grouped[raw] = grouped.get(raw, 0.0) + float(val)
            short_name = col.split("__", 1)[-1]
            if short_name.startswith(raw + "_"):
                # active one-hot category for this row
                if transformed_val == 1:
                    value_lookup[raw] = short_name[len(raw) + 1:]
            else:
                value_lookup[raw] = raw_row.iloc[0].get(raw, transformed_val)

        ranked = sorted(grouped.items(), key=lambda kv: abs(kv[1]), reverse=True)[:top_n]

        drivers = []
        for raw, shap_val in ranked:
            drivers.append({
                "feature": FRIENDLY_NAMES.get(raw, raw),
                "raw_feature": raw,
                "value": _to_native(value_lookup.get(raw)),
                "shap_value": round(shap_val, 4),
                "direction": "increases_risk" if shap_val > 0 else "decreases_risk",
            })
        return drivers

    def top_risk_increasing_driver_batch(self, raw_df: pd.DataFrame):
        """
        Used by Feature #19 (historical_evidence.py). For each row in
        raw_df (same shape as prepare_project() output, already stacked
        into a DataFrame), returns the single raw feature name with the
        largest positive (risk-increasing) SHAP contribution -- i.e. the
        'top delay driver' for that historical project. Batched through
        one shap_values() call instead of one Explainer.explain() call
        per row, since we only need the top driver, not the full ranked
        list or the human-readable value formatting.
        """
        transformed = self.preprocessor.transform(raw_df)
        if hasattr(transformed, "toarray"):
            transformed = transformed.toarray()

        shap_values = np.array(self.shap_explainer.shap_values(transformed))
        if shap_values.ndim == 3:  # some SHAP/model combos return (rows, features, classes)
            shap_values = shap_values[:, :, 1]

        raw_names = [raw_feature_name(c) for c in self.feature_names]

        top_drivers = []
        for row in shap_values:
            grouped = {}
            for raw, val in zip(raw_names, row):
                grouped[raw] = grouped.get(raw, 0.0) + float(val)
            increasing = {k: v for k, v in grouped.items() if v > 0}
            pool = increasing if increasing else grouped
            top_drivers.append(max(pool, key=lambda k: abs(pool[k])))
        return top_drivers


def _to_native(v):
    """Cast numpy scalar types to plain Python types so FastAPI/pydantic
    can JSON-serialize them (numpy.int64/float64 are not natively
    serializable)."""
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return float(v)
    if isinstance(v, np.bool_):
        return bool(v)
    return v
