import pandas as pd

# Load classification predictions
classification = pd.read_csv(
    "classification_predictions.csv"
)

# Load regression predictions
regression = pd.read_csv(
    "regression_predictions.csv"
)

# Combine both using project_id
final_predictions = classification.merge(
    regression,
    on="project_id"
)

# Save final combined output
final_predictions.to_csv(
    "final_predictions.csv",
    index=False
)

print("Final predictions created successfully.")

print("\nSample final predictions:")
print(final_predictions.head(10))
