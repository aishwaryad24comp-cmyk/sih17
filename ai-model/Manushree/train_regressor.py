import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

import numpy as np
# --------------------------------------------------
# 1. LOAD DATASET
# --------------------------------------------------

df = pd.read_csv("../database/land_acquisition_synthetic_dataset.csv")

print("Dataset loaded successfully.")
print("Original shape:", df.shape)

# --------------------------------------------------
# 2. PREPARE FEATURES AND TARGET
# --------------------------------------------------

X = df.drop(
    columns=[
        "project_id",
        "risk_score_raw",
        "delayed",
        "delay_days"
    ]
)

y = df["delay_days"]
# --------------------------------------------------
# 3. DATE PREPROCESSING
# --------------------------------------------------

X["notification_date"] = pd.to_datetime(X["notification_date"])
X["last_activity_date"] = pd.to_datetime(X["last_activity_date"])

reference_date = pd.Timestamp("2026-08-27")

X["project_age_days"] = (
    reference_date - X["notification_date"]
).dt.days

X["days_since_last_activity"] = (
    reference_date - X["last_activity_date"]
).dt.days

X = X.drop(
    columns=[
        "notification_date",
        "last_activity_date"
    ]
)

# --------------------------------------------------
# 4. APPROVAL STAGE PREPROCESSING
# --------------------------------------------------

X["approval_stage_num"] = (
    X["approval_stage"]
    .str.extract(r"Stage (\d+)")[0]
    .astype(int)
)

X = X.drop(columns=["approval_stage"])

print("\nRegression target selected: delay_days")
print("Feature count:", X.shape[1])
print("Target records:", y.shape[0])
print("\nProcessed feature columns:")
print(X.columns.tolist())

print("\nProcessed feature count:", X.shape[1])
# --------------------------------------------------
# 5. NUMERICAL AND CATEGORICAL FEATURES
# --------------------------------------------------

numerical_features = [
    "latitude",
    "longitude",
    "land_area_hectares",
    "families_affected",
    "compensation_assessed_inr",
    "compensation_disbursed_pct",
    "legal_disputes_count",
    "rr_progress_pct",
    "historical_dept_avg_delay_days",
    "project_age_days",
    "days_since_last_activity",
    "approval_stage_num"
]

categorical_features = [
    "state",
    "district",
    "project_type",
    "implementing_department",
    "stakeholder_responsiveness"
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "num",
            StandardScaler(),
            numerical_features
        ),
        (
            "cat",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        )
    ]
)
# --------------------------------------------------
# 6. TRAIN TEST SPLIT
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=df["delayed"]
)

print("\nTraining records:", X_train.shape[0])
print("Testing records:", X_test.shape[0])
# --------------------------------------------------
# 7. LINEAR REGRESSION
# --------------------------------------------------

linear_model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("regressor", LinearRegression())
    ]
)

print("\nTraining Linear Regression...")

linear_model.fit(X_train, y_train)

linear_pred = linear_model.predict(X_test)

linear_mae = mean_absolute_error(y_test, linear_pred)
linear_rmse = np.sqrt(mean_squared_error(y_test, linear_pred))
linear_r2 = r2_score(y_test, linear_pred)

print("\n========== LINEAR REGRESSION RESULTS ==========")
print(f"MAE : {linear_mae:.2f} days")
print(f"RMSE: {linear_rmse:.2f} days")
print(f"R2  : {linear_r2:.4f}")
# --------------------------------------------------
# 8. RANDOM FOREST REGRESSOR
# --------------------------------------------------

rf_regressor = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "regressor",
            RandomForestRegressor(
                n_estimators=200,
                random_state=42
            )
        )
    ]
)

print("\nTraining Random Forest Regressor...")

rf_regressor.fit(X_train, y_train)

# Predict delay days for the 170 test projects
rf_pred = rf_regressor.predict(X_test)

# Calculate performance
rf_mae = mean_absolute_error(y_test, rf_pred)
rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
rf_r2 = r2_score(y_test, rf_pred)

print("\n========== RANDOM FOREST REGRESSION RESULTS ==========")
print(f"MAE : {rf_mae:.2f} days")
print(f"RMSE: {rf_rmse:.2f} days")
print(f"R2  : {rf_r2:.4f}")
# --------------------------------------------------
# 9. GRADIENT BOOSTING REGRESSOR
# --------------------------------------------------

gb_regressor = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "regressor",
            GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.05,
                random_state=42
            )
        )
    ]
)

print("\nTraining Gradient Boosting Regressor...")

gb_regressor.fit(X_train, y_train)

# Predict delay days
gb_pred = gb_regressor.predict(X_test)

# Calculate performance
gb_mae = mean_absolute_error(y_test, gb_pred)
gb_rmse = np.sqrt(mean_squared_error(y_test, gb_pred))
gb_r2 = r2_score(y_test, gb_pred)

print("\n========== GRADIENT BOOSTING REGRESSION RESULTS ==========")
print(f"MAE : {gb_mae:.2f} days")
print(f"RMSE: {gb_rmse:.2f} days")
print(f"R2  : {gb_r2:.4f}")
# --------------------------------------------------
# 10. SAVE FINAL REGRESSION MODEL
# --------------------------------------------------

joblib.dump(
    gb_regressor,
    "land_delay_regressor.pkl"
)

print("\nFinal Gradient Boosting regression model saved successfully.")
# --------------------------------------------------
# 10. SAVE FINAL REGRESSION MODEL
# --------------------------------------------------

joblib.dump(
    gb_regressor,
    "land_delay_regressor.pkl"
)

print("\nFinal Gradient Boosting regression model saved successfully.")
# --------------------------------------------------
# 11. GENERATE DELAY-DAY PREDICTIONS
# --------------------------------------------------

final_regressor = gb_regressor

all_delay_predictions = final_regressor.predict(X)

# Avoid negative delay values
all_delay_predictions = np.maximum(all_delay_predictions, 0)

df["predicted_delay_days"] = np.round(
    all_delay_predictions
).astype(int)

print("\nSample delay predictions:")

print(
    df[
        [
            "project_id",
            "predicted_delay_days"
        ]
    ].head(10)
)
# --------------------------------------------------
# 12. SAVE REGRESSION PREDICTIONS
# --------------------------------------------------

regression_output = df[
    [
        "project_id",
        "predicted_delay_days"
    ]
]

regression_output.to_csv(
    "regression_predictions.csv",
    index=False
)

print("\nregression_predictions.csv saved successfully.")