import pandas as pd

# Load Jesni's dataset
df = pd.read_csv("../database/land_acquisition_synthetic_dataset.csv")

print("Dataset loaded successfully")
print("Rows and columns:", df.shape)

print("\nColumn names:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())
print("\n--- MISSING VALUES ---")
print(df.isnull().sum())

print("\n--- DELAYED PROJECT COUNTS ---")
print(df["delayed"].value_counts())

print("\n--- DELAYED PROJECT PERCENTAGES ---")
print(df["delayed"].value_counts(normalize=True) * 100)

print("\n--- DATA TYPES ---")
print(df.dtypes)