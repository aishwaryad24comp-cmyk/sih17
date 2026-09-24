"""
Feature engineering for SIH26017 -- Member 3 service.

This mirrors Member 2's predict.py EXACTLY (same date-reference logic,
same approval_stage parsing, same dropped columns) so that /predict,
/explain, and /recommend all see the identical feature representation
that land_delay_classifier.pkl was trained on. If Manushree updates her
preprocessing, update this file to match.
"""

import pandas as pd

REFERENCE_DATE = pd.Timestamp("2026-08-27")  # matches train_classifier.py / predict.py


def prepare_project(project: dict) -> pd.DataFrame:
    """
    Raw project dict -> raw (not yet one-hot encoded) feature DataFrame,
    exactly as Member 2's predict.prepare_project() does. The classifier
    pipeline's own ColumnTransformer (bundled inside the .pkl) handles
    scaling + one-hot encoding from here -- we do NOT re-encode manually.
    """
    df = pd.DataFrame([project])

    df["notification_date"] = pd.to_datetime(df["notification_date"]).dt.tz_localize(None)
    df["last_activity_date"] = pd.to_datetime(df["last_activity_date"]).dt.tz_localize(None)

    df["project_age_days"] = (REFERENCE_DATE - df["notification_date"]).dt.days
    df["days_since_last_activity"] = (REFERENCE_DATE - df["last_activity_date"]).dt.days

    stages = df['approval_stage'].astype(str).str.extract(r'(\d+)')[0]
    df['approval_stage_num'] = pd.to_numeric(stages, errors='coerce').fillna(3).astype(int)

    df = df.drop(columns=["notification_date", "last_activity_date", "approval_stage"])
    return df


def raw_feature_name(encoded_col: str) -> str:
    """
    Map a transformed column name from the pipeline's ColumnTransformer
    (e.g. 'cat__state_Maharashtra', 'num__land_area_hectares') back to
    its original raw feature name ('state', 'land_area_hectares') for
    human-readable SHAP output.
    """
    name = encoded_col.split("__", 1)[-1]  # strip 'num__' / 'cat__' prefix
    categorical_roots = [
        "state", "district", "project_type",
        "implementing_department", "stakeholder_responsiveness",
    ]
    for root in categorical_roots:
        if name.startswith(root + "_"):
            return root
    return name
