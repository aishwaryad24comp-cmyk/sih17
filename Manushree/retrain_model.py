import os
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd

from catboost import CatBoostClassifier
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


# ==================================================
# PATH CONFIGURATION
# ==================================================

BASE_DIR = Path(__file__).resolve().parent

DATASET_PATH = (
    BASE_DIR.parent
    / "database"
    / "land_acquisition_synthetic_dataset.csv"
)

MODEL_DIR = BASE_DIR / "models"

LATEST_MODEL_PATH = (
    MODEL_DIR
    / "land_delay_classifier_latest.pkl"
)

# Production-compatible canonical model
CANONICAL_MODEL_PATH = (
    BASE_DIR
    / "land_delay_classifier.pkl"
)

HISTORY_FILE = (
    BASE_DIR
    / "model_history.csv"
)

REFERENCE_DATE = pd.Timestamp("2026-08-27")

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ==================================================
# TARGET CONVERSION
# ==================================================

def convert_target(df):
    """
    Convert delayed target safely.

    Supports:
    Y / N
    y / n
    1 / 0
    numeric 1 / 0
    """

    if "delayed" not in df.columns:
        raise ValueError(
            "Dataset does not contain the 'delayed' column."
        )

    raw_target = (
        df["delayed"]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    unique_values = set(
        raw_target.dropna().unique()
    )

    # Y/N dataset
    if unique_values.issubset({"Y", "N"}):

        df["delayed"] = raw_target.map(
            {
                "Y": 1,
                "N": 0
            }
        )

    # 0/1 dataset
    elif unique_values.issubset({"0", "1"}):

        df["delayed"] = pd.to_numeric(
            raw_target,
            errors="coerce"
        )

    else:

        raise ValueError(
            "Invalid values in delayed column. "
            f"Found: {sorted(unique_values)}"
        )

    if df["delayed"].isna().any():

        raise ValueError(
            "Missing/invalid values found in delayed column."
        )

    df["delayed"] = (
        df["delayed"]
        .astype(int)
    )

    return df


# ==================================================
# DATA PREPARATION
# ==================================================

def prepare_data(df):

    print("\nPreparing dataset...")

    df = df.copy()

    # ----------------------------------------------
    # Target
    # ----------------------------------------------

    df = convert_target(df)

    print(
        "Target conversion successful."
    )

    print(
        "\nTarget distribution:"
    )

    print(
        df["delayed"].value_counts()
    )

    # ----------------------------------------------
    # Convert dates
    # ----------------------------------------------

    if "notification_date" in df.columns:

        df["notification_date"] = (
            pd.to_datetime(
                df["notification_date"],
                errors="coerce"
            )
        )

        df["project_age_days"] = (
            REFERENCE_DATE
            - df["notification_date"]
        ).dt.days

    if "last_activity_date" in df.columns:

        df["last_activity_date"] = (
            pd.to_datetime(
                df["last_activity_date"],
                errors="coerce"
            )
        )

        df["days_since_last_activity"] = (
            REFERENCE_DATE
            - df["last_activity_date"]
        ).dt.days

    # ----------------------------------------------
    # Approval stage
    # ----------------------------------------------

    if "approval_stage" in df.columns:

        df["approval_stage_num"] = (
            df["approval_stage"]
            .astype(str)
            .str.extract(r"(\d+)")[0]
        )

        df["approval_stage_num"] = (
            pd.to_numeric(
                df["approval_stage_num"],
                errors="coerce"
            )
        )

    # ----------------------------------------------
    # Columns excluded from prediction
    # ----------------------------------------------

    columns_to_drop = [

        # Identifier
        "project_id",

        # Synthetic generator ground truth.
        # Never use this for training.
        "risk_score_raw",

        # Regression target
        "delay_days",

        # Already converted into derived fields
        "notification_date",
        "last_activity_date",
        "approval_stage",

        # Post-outcome / feedback fields.
        # These are useful for continuous-learning
        # history but should not be prediction inputs.
        "action_taken",
        "final_outcome",
        "status",
        "actual_end_date",

        # Administrative metadata
        "created_by",
        "owner_id",
    ]

    existing_drop_columns = [
        column
        for column in columns_to_drop
        if column in df.columns
    ]

    df = df.drop(
        columns=existing_drop_columns
    )

    return df


# ==================================================
# RETRAIN MODEL
# ==================================================

def retrain_model(
    dataset_path=None
):

    print(
        "\n========================================"
    )

    print(
        "   PrediXa Model Retraining Started"
    )

    print(
        "========================================"
    )

    # ----------------------------------------------
    # Resolve dataset
    # ----------------------------------------------

    if dataset_path is None:

        dataset_path = DATASET_PATH

    else:

        dataset_path = Path(
            dataset_path
        )

    if not dataset_path.exists():

        raise FileNotFoundError(
            f"Dataset not found:\n{dataset_path}"
        )

    # ----------------------------------------------
    # Load
    # ----------------------------------------------

    original_df = pd.read_csv(
        dataset_path
    )

    print(
        f"\nDataset path: {dataset_path}"
    )

    print(
        f"Records received: {len(original_df)}"
    )

    print(
        f"Original columns: {len(original_df.columns)}"
    )

    # ----------------------------------------------
    # Check continuous-learning fields
    # ----------------------------------------------

    feedback_fields = [
        "action_taken",
        "final_outcome",
        "project_budget",
        "status",
        "actual_end_date",
    ]

    available_feedback_fields = [
        field
        for field in feedback_fields
        if field in original_df.columns
    ]

    print(
        "\nOutcome/history fields available:"
    )

    if available_feedback_fields:

        print(
            available_feedback_fields
        )

    else:

        print(
            "None in current dataset"
        )

    # ----------------------------------------------
    # Prepare
    # ----------------------------------------------

    df = prepare_data(
        original_df
    )

    X = df.drop(
        columns=["delayed"]
    )

    y = df["delayed"]

    # ----------------------------------------------
    # Categorical columns
    # ----------------------------------------------

    expected_categorical = [
        "state",
        "district",
        "project_type",
        "implementing_department",
        "stakeholder_responsiveness",
    ]

    categorical_features = [
        feature
        for feature in expected_categorical
        if feature in X.columns
    ]

    # Everything else becomes numeric.
    # Therefore project_budget is included automatically
    # if Member 1 later adds it as a numeric column.
    numerical_features = [
        feature
        for feature in X.columns
        if feature not in categorical_features
    ]

    # ----------------------------------------------
    # Convert numerical columns safely
    # ----------------------------------------------

    for column in numerical_features:

        X[column] = pd.to_numeric(
            X[column],
            errors="coerce"
        )

    # Fill numeric missing values
    for column in numerical_features:

        if X[column].isna().any():

            median_value = (
                X[column].median()
            )

            if pd.isna(median_value):

                median_value = 0

            X[column] = (
                X[column]
                .fillna(median_value)
            )

    # Fill categorical missing values
    for column in categorical_features:

        X[column] = (
            X[column]
            .astype(str)
            .fillna("Unknown")
        )

    # ----------------------------------------------
    # Display features
    # ----------------------------------------------

    print(
        f"\nTotal features used: {len(X.columns)}"
    )

    print(
        f"Numerical features: {len(numerical_features)}"
    )

    print(
        f"Categorical features: {len(categorical_features)}"
    )

    print(
        "\nFeature columns:"
    )

    print(
        X.columns.tolist()
    )

    # ----------------------------------------------
    # Split
    # ----------------------------------------------

    (
        X_train,
        X_test,
        y_train,
        y_test
    ) = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    print(
        f"\nTraining records: {len(X_train)}"
    )

    print(
        f"Testing records: {len(X_test)}"
    )

    # ----------------------------------------------
    # Preprocessing
    # ----------------------------------------------

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                StandardScaler(),
                numerical_features
            ),
            (
                "cat",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
                categorical_features
            ),
        ]
    )

    # ----------------------------------------------
    # OFFICIAL CLASSIFIER: CATBOOST
    # ----------------------------------------------

    classifier = CatBoostClassifier(
        iterations=200,
        learning_rate=0.1,
        random_seed=42,
        verbose=0
    )

    model = Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor
            ),
            (
                "classifier",
                classifier
            ),
        ]
    )

    # ----------------------------------------------
    # Train
    # ----------------------------------------------

    print(
        "\nTraining CatBoost model..."
    )

    model.fit(
        X_train,
        y_train
    )

    print(
        "CatBoost training completed."
    )

    # ----------------------------------------------
    # Predict
    # ----------------------------------------------

    predictions = model.predict(
        X_test
    )

    predictions = (
        pd.Series(predictions)
        .astype(int)
        .values
    )

    probabilities = (
        model.predict_proba(
            X_test
        )[:, 1]
    )

    # ----------------------------------------------
    # Metrics
    # ----------------------------------------------

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    precision = precision_score(
        y_test,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        y_test,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        y_test,
        predictions,
        zero_division=0
    )

    roc_auc = roc_auc_score(
        y_test,
        probabilities
    )

    print(
        "\n========== CATBOOST RETRAINING RESULTS =========="
    )

    print(
        f"Accuracy : {accuracy:.4f}"
    )

    print(
        f"Precision: {precision:.4f}"
    )

    print(
        f"Recall   : {recall:.4f}"
    )

    print(
        f"F1 Score : {f1:.4f}"
    )

    print(
        f"ROC-AUC  : {roc_auc:.4f}"
    )

    # ----------------------------------------------
    # Version number
    # ----------------------------------------------

    model_version = (
        datetime.now()
        .strftime(
            "%Y%m%d_%H%M%S"
        )
    )

    versioned_model_path = (
        MODEL_DIR
        / f"land_delay_classifier_{model_version}.pkl"
    )

    # ----------------------------------------------
    # Save model - versioned
    # ----------------------------------------------

    joblib.dump(
        model,
        versioned_model_path
    )

    # ----------------------------------------------
    # Save latest model
    # ----------------------------------------------

    joblib.dump(
        model,
        LATEST_MODEL_PATH
    )

    # ----------------------------------------------
    # Save canonical production model
    # ----------------------------------------------

    joblib.dump(
        model,
        CANONICAL_MODEL_PATH
    )

    print(
        "\nModels saved successfully."
    )

    print(
        f"\nVersioned:\n{versioned_model_path}"
    )

    print(
        f"\nLatest:\n{LATEST_MODEL_PATH}"
    )

    print(
        f"\nCanonical production model:\n"
        f"{CANONICAL_MODEL_PATH}"
    )

    # ----------------------------------------------
    # Model history
    # ----------------------------------------------

    history_row = pd.DataFrame(
        [
            {
                "model_version": model_version,
                "model_type": "CatBoostClassifier",
                "records_used": len(df),
                "features_used": len(X.columns),
                "accuracy": round(
                    accuracy,
                    4
                ),
                "precision": round(
                    precision,
                    4
                ),
                "recall": round(
                    recall,
                    4
                ),
                "f1_score": round(
                    f1,
                    4
                ),
                "roc_auc": round(
                    roc_auc,
                    4
                ),
                "model_path": str(
                    versioned_model_path
                ),
            }
        ]
    )

    if HISTORY_FILE.exists():

        old_history = pd.read_csv(
            HISTORY_FILE
        )

        new_history = pd.concat(
            [
                old_history,
                history_row
            ],
            ignore_index=True
        )

    else:

        new_history = history_row

    new_history.to_csv(
        HISTORY_FILE,
        index=False
    )

    print(
        f"\nModel history updated:\n{HISTORY_FILE}"
    )

    # ----------------------------------------------
    # Return result for Member 6/backend
    # ----------------------------------------------

    result = {

        "status":
            "success",

        "model_type":
            "CatBoostClassifier",

        "model_version":
            model_version,

        "records_used":
            len(df),

        "features_used":
            len(X.columns),

        "accuracy":
            round(
                accuracy,
                4
            ),

        "precision":
            round(
                precision,
                4
            ),

        "recall":
            round(
                recall,
                4
            ),

        "f1_score":
            round(
                f1,
                4
            ),

        "roc_auc":
            round(
                roc_auc,
                4
            ),

        "versioned_model_path":
            str(
                versioned_model_path
            ),

        "latest_model_path":
            str(
                LATEST_MODEL_PATH
            ),

        "canonical_model_path":
            str(
                CANONICAL_MODEL_PATH
            ),
    }

    print(
        "\n========================================"
    )

    print(
        "   PrediXa Retraining Completed"
    )

    print(
        "========================================"
    )

    return result


# ==================================================
# RUN DIRECTLY
# ==================================================

if __name__ == "__main__":

    result = retrain_model()

    print(
        "\nRetraining response:"
    )

    print(
        result
    )