from pathlib import Path

import joblib
import pandas as pd


# ==================================================
# PATH CONFIGURATION
# ==================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    BASE_DIR
    / "land_delay_classifier.pkl"
)

REFERENCE_DATE = pd.Timestamp("2026-08-27")


# ==================================================
# MODEL CACHE
# ==================================================

_model = None


# ==================================================
# LOAD MODEL
# ==================================================

def load_model():
    """
    Load the official PrediXa CatBoost classifier.

    The model is cached so normal predictions do not
    repeatedly read the .pkl file from disk.
    """

    global _model

    if _model is None:

        if not MODEL_PATH.exists():

            raise FileNotFoundError(
                f"Classifier model not found:\n{MODEL_PATH}\n\n"
                "Run train_classifier.py or retrain_model.py first."
            )

        _model = joblib.load(
            MODEL_PATH
        )

    return _model


# ==================================================
# RELOAD MODEL
# ==================================================

def reload_model():
    """
    Force the service to reload the newest classifier.

    This is important after continuous-learning
    retraining replaces land_delay_classifier.pkl.
    """

    global _model

    _model = None

    return load_model()


# ==================================================
# PREPARE PROJECT
# ==================================================

def prepare_project(project_data):
    """
    Convert one incoming land-acquisition project
    into the same features used during model training.
    """

    if not isinstance(project_data, dict):

        raise TypeError(
            "project_data must be a Python dictionary."
        )

    data = project_data.copy()

    # ----------------------------------------------
    # notification_date -> project_age_days
    # ----------------------------------------------

    if "notification_date" in data:

        notification_date = pd.to_datetime(
            data["notification_date"],
            errors="coerce"
        )

        if pd.isna(notification_date):

            raise ValueError(
                "Invalid notification_date."
            )

        data["project_age_days"] = (
            REFERENCE_DATE
            - notification_date
        ).days

    # ----------------------------------------------
    # last_activity_date -> days_since_last_activity
    # ----------------------------------------------

    if "last_activity_date" in data:

        last_activity_date = pd.to_datetime(
            data["last_activity_date"],
            errors="coerce"
        )

        if pd.isna(last_activity_date):

            raise ValueError(
                "Invalid last_activity_date."
            )

        data["days_since_last_activity"] = (
            REFERENCE_DATE
            - last_activity_date
        ).days

    # ----------------------------------------------
    # approval_stage -> approval_stage_num
    # ----------------------------------------------

    if "approval_stage" in data:

        approval_stage = str(
            data["approval_stage"]
        )

        extracted_stage = (
            pd.Series([approval_stage])
            .str.extract(r"(\d+)")[0]
            .iloc[0]
        )

        if pd.isna(extracted_stage):

            raise ValueError(
                "Invalid approval_stage."
            )

        data["approval_stage_num"] = float(
            extracted_stage
        )

    # ----------------------------------------------
    # Current official model features
    # ----------------------------------------------

    standard_features = [
        "state",
        "district",
        "latitude",
        "longitude",
        "project_type",
        "implementing_department",
        "land_area_hectares",
        "families_affected",
        "compensation_assessed_inr",
        "compensation_disbursed_pct",
        "legal_disputes_count",
        "rr_progress_pct",
        "stakeholder_responsiveness",
        "historical_dept_avg_delay_days",
        "project_age_days",
        "days_since_last_activity",
        "approval_stage_num",
    ]

    model = load_model()

    # Use the exact columns expected by the trained model.
    if hasattr(model, "feature_names_in_"):

        required_features = list(
            model.feature_names_in_
        )

    else:

        required_features = standard_features

    # ----------------------------------------------
    # Validate required inputs
    # ----------------------------------------------

    missing_features = [
        feature
        for feature in required_features
        if feature not in data
    ]

    if missing_features:

        raise ValueError(
            "Missing required prediction fields: "
            + ", ".join(missing_features)
        )

    # ----------------------------------------------
    # Create one-row DataFrame
    # ----------------------------------------------

    prepared = pd.DataFrame(
        [
            {
                feature: data[feature]
                for feature in required_features
            }
        ]
    )

    return prepared


# ==================================================
# RISK LEVEL
# ==================================================

def get_risk_level(
    risk_percentage
):

    if risk_percentage <= 30:

        return "Low"

    elif risk_percentage <= 60:

        return "Medium"

    else:

        return "High"


# ==================================================
# PREDICT
# ==================================================

def predict(project_data):
    """
    Predict land-acquisition delay risk.

    Returns:
    - delayed_prediction
    - delay_probability
    - risk_percentage
    - risk_level
    """

    model = load_model()

    prepared = prepare_project(
        project_data
    )

    probability = float(
        model.predict_proba(
            prepared
        )[0][1]
    )

    risk_percentage = round(
        probability * 100,
        2
    )

    delayed_prediction = int(
        probability >= 0.5
    )

    risk_level = get_risk_level(
        risk_percentage
    )

    return {

        "delayed_prediction":
            delayed_prediction,

        "delay_probability":
            round(
                probability,
                4
            ),

        "risk_percentage":
            risk_percentage,

        "risk_level":
            risk_level,
    }


# ==================================================
# SERVICE INFORMATION
# ==================================================

def get_model_info():
    """
    Useful for backend/debugging.
    """

    model = load_model()

    classifier_name = "Unknown"

    if hasattr(
        model,
        "named_steps"
    ):

        classifier = (
            model.named_steps
            .get("classifier")
        )

        if classifier is not None:

            classifier_name = (
                classifier
                .__class__
                .__name__
            )

    return {

        "model_path":
            str(MODEL_PATH),

        "model_type":
            classifier_name,

        "risk_thresholds":
            {
                "low": "0-30%",
                "medium": "30-60%",
                "high": ">60%",
            },
    }