import joblib
import pandas as pd


# --------------------------------------------------
# 1. LOAD SAVED MODELS
# --------------------------------------------------

classifier = joblib.load("land_delay_classifier.pkl")
regressor = joblib.load("land_delay_regressor.pkl")


# --------------------------------------------------
# 2. PREPARE ONE PROJECT
# --------------------------------------------------

def prepare_project(project):
    df = pd.DataFrame([project])

    df["notification_date"] = pd.to_datetime(
        df["notification_date"]
    )

    df["last_activity_date"] = pd.to_datetime(
        df["last_activity_date"]
    )

    reference_date = pd.Timestamp("2026-08-27")

    df["project_age_days"] = (
        reference_date - df["notification_date"]
    ).dt.days

    df["days_since_last_activity"] = (
        reference_date - df["last_activity_date"]
    ).dt.days

    df["approval_stage_num"] = (
        df["approval_stage"]
        .str.extract(r"Stage (\d+)")[0]
        .astype(int)
    )

    df = df.drop(
        columns=[
            "notification_date",
            "last_activity_date",
            "approval_stage"
        ]
    )

    return df


# --------------------------------------------------
# 3. PREDICT
# --------------------------------------------------
# --------------------------------------------------
# 3. PREDICT
# --------------------------------------------------

def predict_project(project):

    prepared = prepare_project(project)

    risk_probability = classifier.predict_proba(
        prepared
    )[0][1]

    risk_pct = float(
        round(risk_probability * 100, 2)
    )

    predicted_delay = int(
        max(
            0,
            regressor.predict(prepared)[0]
        )
    )

    if risk_pct <= 30:
        risk_level = "Low"
    elif risk_pct <= 60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return {
        "predicted_risk_pct": risk_pct,
        "risk_level": risk_level,
        "predicted_delay_days": predicted_delay
    }

# --------------------------------------------------
# 4. TEST WITH ONE SAMPLE PROJECT
# --------------------------------------------------

sample_project = {
    "state": "Maharashtra",
    "district": "Pune",
    "latitude": 18.5204,
    "longitude": 73.8567,
    "project_type": "Highway",
    "implementing_department": "NHAI",
    "land_area_hectares": 120.5,
    "families_affected": 350,
    "compensation_assessed_inr": 850000000,
    "compensation_disbursed_pct": 42.0,
    "legal_disputes_count": 3,
    "notification_date": "2024-01-10",
    "approval_stage": "Stage 3 of 5",
    "rr_progress_pct": 38.0,
    "stakeholder_responsiveness": "Medium",
    "historical_dept_avg_delay_days": 210,
    "last_activity_date": "2026-08-01"
}

result = predict_project(sample_project)

print("\nPrediction result:")
print(result)