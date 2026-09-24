import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from catboost import CatBoostClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)

# --------------------------------------------------
# 1. LOAD DATASET
# --------------------------------------------------

df = pd.read_csv("../database/land_acquisition_synthetic_dataset.csv")

print("Dataset loaded successfully.")
print("Original shape:", df.shape)


# --------------------------------------------------
# 2. REMOVE COLUMNS THAT MUST NOT BE MODEL FEATURES
# --------------------------------------------------

X = df.drop(
    columns=[
        "project_id",
        "risk_score_raw",
        "delayed",
        "delay_days"
    ]
)

# Target:
# Y = delayed project
# N = not delayed project

y = df["delayed"].map({
    "Y": 1,
    "N": 0
})
# --------------------------------------------------
# DATE PREPROCESSING
# --------------------------------------------------

# Convert date columns from text into actual dates
X["notification_date"] = pd.to_datetime(X["notification_date"])
X["last_activity_date"] = pd.to_datetime(X["last_activity_date"])

# Use a fixed reference date so results are reproducible
reference_date = pd.Timestamp("2026-08-27")

# How old is the project?
X["project_age_days"] = (
    reference_date - X["notification_date"]
).dt.days

# How many days since something last happened in the project?
X["days_since_last_activity"] = (
    reference_date - X["last_activity_date"]
).dt.days

# Original date text is no longer needed
X = X.drop(
    columns=[
        "notification_date",
        "last_activity_date"
    ]
)
# --------------------------------------------------
# APPROVAL STAGE PREPROCESSING
# --------------------------------------------------

X["approval_stage_num"] = (
    X["approval_stage"]
    .str.extract(r"Stage (\d+)")[0]
    .astype(int)
)

X = X.drop(columns=["approval_stage"])
# --------------------------------------------------
# 4. SEPARATE NUMERICAL AND CATEGORICAL FEATURES
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
print("\nNumerical features:")
print(numerical_features)

print("\nCategorical features:")
print(categorical_features)

print("\nNumerical count:", len(numerical_features))
print("Categorical count:", len(categorical_features))

# --------------------------------------------------
# 5. CREATE PREPROCESSOR
# --------------------------------------------------

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

print("\nPreprocessor created successfully.")
# --------------------------------------------------
# 6. TRAIN-TEST SPLIT
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)
# --------------------------------------------------
# 7. LOGISTIC REGRESSION MODEL
# --------------------------------------------------

logistic_model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "classifier",
            LogisticRegression(
                max_iter=1000,
                random_state=42
            )
        )
    ]
)

print("\nTraining Logistic Regression...")

logistic_model.fit(X_train, y_train)

print("Logistic Regression trained successfully.")
print("\nTraining records:", X_train.shape[0])
print("Testing records:", X_test.shape[0])

print("\nTraining target distribution:")
print(y_train.value_counts())

print("\nTesting target distribution:")
print(y_test.value_counts())
# --------------------------------------------------
# 3. VERIFY
# --------------------------------------------------

print("\nFeature columns:")
print(X.columns.tolist())

print("\nNumber of features:", X.shape[1])

print("\nTarget distribution:")
print(y.value_counts())

print("\nPreparation successful.")
# --------------------------------------------------
# 8. TEST LOGISTIC REGRESSION
# --------------------------------------------------

# Predict 0 or 1 for the test projects
y_pred = logistic_model.predict(X_test)

# Get probability of delay for each test project
y_probability = logistic_model.predict_proba(X_test)[:, 1]

# Calculate evaluation metrics
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_probability)

print("\n========== LOGISTIC REGRESSION RESULTS ==========")

print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")
print(f"ROC-AUC  : {roc_auc:.4f}")

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))
# --------------------------------------------------
# 9. RANDOM FOREST MODEL
# --------------------------------------------------

random_forest_model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "classifier",
            RandomForestClassifier(
                n_estimators=200,
                random_state=42,
                class_weight="balanced"
            )
        )
    ]
)

print("\nTraining Random Forest...")

random_forest_model.fit(X_train, y_train)

print("Random Forest trained successfully.")
# --------------------------------------------------
# 10. TEST RANDOM FOREST
# --------------------------------------------------

rf_pred = random_forest_model.predict(X_test)

rf_probability = random_forest_model.predict_proba(X_test)[:, 1]

rf_accuracy = accuracy_score(y_test, rf_pred)
rf_precision = precision_score(y_test, rf_pred)
rf_recall = recall_score(y_test, rf_pred)
rf_f1 = f1_score(y_test, rf_pred)
rf_roc_auc = roc_auc_score(y_test, rf_probability)

print("\n========== RANDOM FOREST RESULTS ==========")

print(f"Accuracy : {rf_accuracy:.4f}")
print(f"Precision: {rf_precision:.4f}")
print(f"Recall   : {rf_recall:.4f}")
print(f"F1 Score : {rf_f1:.4f}")
print(f"ROC-AUC  : {rf_roc_auc:.4f}")

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, rf_pred))
# --------------------------------------------------
# 11. CATBOOST MODEL
# --------------------------------------------------

gradient_boosting_model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "classifier",
            CatBoostClassifier(
                iterations=200,
                learning_rate=0.1,
                random_seed=42,
                verbose=0
            )
        )
    ]
)

print("\nTraining Gradient Boosting...")

gradient_boosting_model.fit(X_train, y_train)

print("Gradient Boosting trained successfully.")
# --------------------------------------------------
# 12. TEST GRADIENT BOOSTING
# --------------------------------------------------

gb_pred = gradient_boosting_model.predict(X_test)

gb_probability = gradient_boosting_model.predict_proba(X_test)[:, 1]

gb_accuracy = accuracy_score(y_test, gb_pred)
gb_precision = precision_score(y_test, gb_pred)
gb_recall = recall_score(y_test, gb_pred)
gb_f1 = f1_score(y_test, gb_pred)
gb_roc_auc = roc_auc_score(y_test, gb_probability)

print("\n========== GRADIENT BOOSTING RESULTS ==========")

print(f"Accuracy : {gb_accuracy:.4f}")
print(f"Precision: {gb_precision:.4f}")
print(f"Recall   : {gb_recall:.4f}")
print(f"F1 Score : {gb_f1:.4f}")
print(f"ROC-AUC  : {gb_roc_auc:.4f}")

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, gb_pred))
# --------------------------------------------------
# 13. SAVE FINAL CLASSIFICATION MODEL
# --------------------------------------------------

joblib.dump(
    gradient_boosting_model,
    "land_delay_classifier.pkl"
)

print("\nFinal Gradient Boosting model saved successfully.")
# --------------------------------------------------
# 14. GENERATE RISK PERCENTAGE FOR ALL PROJECTS
# --------------------------------------------------

all_probabilities = logistic_model.predict_proba(X)[:, 1]

df["predicted_risk_pct"] = (all_probabilities * 100).round(2)

print("\nSample predicted risk percentages:")
print(
    df[
        [
            "project_id",
            "predicted_risk_pct"
        ]
    ].head(10)
)
# --------------------------------------------------
# 15. CREATE RISK LEVEL
# --------------------------------------------------

def get_risk_level(risk_pct):
    if risk_pct <= 30:
        return "Low"
    elif risk_pct <= 60:
        return "Medium"
    else:
        return "High"


df["risk_level"] = df["predicted_risk_pct"].apply(get_risk_level)

print("\nSample risk levels:")
print(
    df[
        [
            "project_id",
            "predicted_risk_pct",
            "risk_level"
        ]
    ].head(10)
)
# --------------------------------------------------
# 16. SAVE CLASSIFICATION PREDICTIONS
# --------------------------------------------------

classification_output = df[
    [
        "project_id",
        "predicted_risk_pct",
        "risk_level"
    ]
]

classification_output.to_csv(
    "classification_predictions.csv",
    index=False
)

print("\nclassification_predictions.csv saved successfully.")
