"""
Synthetic Land Acquisition Project Dataset Generator
SIH 26017 - Predictive Analytics for Land Acquisition Delays
Member 1 (Data Lead) deliverable

Calibrated against public research:
- ~25-35% overall project delay rate (Lok Sabha replies on NHAI: 58/226 ~26% delayed;
  210 NH projects delayed nationally)
- ~35% of delayed highway projects cite land-acquisition disputes specifically
  (Parliamentary panel, Demands for Grants 2025-26, MoRTH)
- SIA + compensation plan approval typically takes 3-6 months (RFCTLARR process)
- Water resources sector has highest cost/time overruns, followed by railways
  (IJCRT cost overrun study); Maharashtra, UP, AP, Bihar, Gujarat have largest
  project pipelines / most stalled projects
- 1,74,387 pending compensation disputes nationally (Gadkari, Lok Sabha, Dec 2022)
  -> heavier tail on legal_disputes_count than a naive 0/1/2 model

All figures are illustrative/synthetic, calibrated to the above public sources.
"""

import numpy as np
import pandas as pd
from faker import Faker
import random
import uuid

random.seed(42)
np.random.seed(42)
fake = Faker("en_IN")

N = 850  # rows

# ---- Reference data ----------------------------------------------------

# State -> (weight, list of real districts, approx lat/long center, base delay risk multiplier)
STATES = {
    "Maharashtra":     dict(w=0.16, districts=["Pune","Nagpur","Nashik","Aurangabad","Thane","Raigad","Satara"], lat=19.7515, lon=75.7139, risk=1.15),
    "Uttar Pradesh":   dict(w=0.14, districts=["Lucknow","Noida","Ghaziabad","Varanasi","Agra","Kanpur","Meerut"], lat=26.8467, lon=80.9462, risk=1.20),
    "Andhra Pradesh":  dict(w=0.10, districts=["Visakhapatnam","Vijayawada","Guntur","Kurnool","Anantapur"], lat=15.9129, lon=79.7400, risk=1.10),
    "Bihar":           dict(w=0.09, districts=["Patna","Gaya","Bhagalpur","Muzaffarpur","Darbhanga"], lat=25.0961, lon=85.3131, risk=1.18),
    "Gujarat":         dict(w=0.09, districts=["Ahmedabad","Surat","Vadodara","Rajkot","Bharuch"], lat=22.2587, lon=71.1924, risk=0.95),
    "Tamil Nadu":      dict(w=0.09, districts=["Chennai","Coimbatore","Madurai","Salem","Tiruchirappalli"], lat=11.1271, lon=78.6569, risk=1.05),
    "Karnataka":       dict(w=0.08, districts=["Bengaluru Rural","Mysuru","Belagavi","Hubballi-Dharwad"], lat=15.3173, lon=75.7139, risk=0.90),
    "Odisha":          dict(w=0.07, districts=["Khordha","Cuttack","Sundargarh","Ganjam"], lat=20.9517, lon=85.0985, risk=1.10),
    "Rajasthan":       dict(w=0.07, districts=["Jaipur","Jodhpur","Udaipur","Alwar"], lat=27.0238, lon=74.2179, risk=1.00),
    "Madhya Pradesh":  dict(w=0.06, districts=["Bhopal","Indore","Jabalpur","Gwalior"], lat=22.9734, lon=78.6569, risk=1.02),
    "West Bengal":     dict(w=0.05, districts=["Kolkata","Howrah","Hooghly","Nadia"], lat=22.9868, lon=87.8550, risk=1.08),
}
state_names = list(STATES.keys())
state_weights = [STATES[s]["w"] for s in state_names]

PROJECT_TYPES = {
    "Highway":              dict(w=0.32, overrun=1.00, litig_base=0.35),
    "Railway":               dict(w=0.20, overrun=1.25, litig_base=0.30),
    "Irrigation/Water Res.": dict(w=0.16, overrun=1.55, litig_base=0.25),
    "Industrial Corridor":   dict(w=0.14, overrun=1.10, litig_base=0.28),
    "Power Transmission":    dict(w=0.10, overrun=0.90, litig_base=0.20),
    "Urban Infra/Metro":     dict(w=0.08, overrun=1.15, litig_base=0.22),
}
proj_names = list(PROJECT_TYPES.keys())
proj_weights = [PROJECT_TYPES[p]["w"] for p in proj_names]

DEPARTMENTS = {
    "Highway": ["NHAI", "State PWD"],
    "Railway": ["Ministry of Railways", "State Railway Infra Corp"],
    "Irrigation/Water Res.": ["State Water Resources Dept"],
    "Industrial Corridor": ["State Industrial Dev. Corp", "DMIC/NICDC"],
    "Power Transmission": ["Power Grid Corp", "State Electricity Board"],
    "Urban Infra/Metro": ["State Metro Rail Corp", "Urban Dev. Authority"],
}

RESPONSIVENESS = ["Low", "Medium", "High"]

# ---- Generation ----------------------------------------------------

rows = []
for i in range(N):
    state = np.random.choice(state_names, p=state_weights)
    sinfo = STATES[state]
    district = random.choice(sinfo["districts"])
    lat = round(sinfo["lat"] + np.random.uniform(-0.6, 0.6), 4)
    lon = round(sinfo["lon"] + np.random.uniform(-0.6, 0.6), 4)

    ptype = np.random.choice(proj_names, p=proj_weights)
    pinfo = PROJECT_TYPES[ptype]
    department = random.choice(DEPARTMENTS[ptype])

    land_area = round(np.random.lognormal(mean=2.8, sigma=0.9), 1)
    land_area = min(max(land_area, 2.0), 900.0)

    families_affected = int(np.random.gamma(shape=2.0, scale=land_area * 2.2)) + 5
    families_affected = min(families_affected, 5000)

    # compensation assessed roughly scales with land area & families (INR)
    per_hectare_rate = np.random.uniform(15, 90) * 1e5  # 15L - 90L per hectare
    compensation_assessed = round(land_area * per_hectare_rate + families_affected * np.random.uniform(1, 4) * 1e5, -3)

    # notification date: 6 months to 6 years ago
    days_since_notif = np.random.randint(180, 6 * 365)
    notification_date = fake.date_between(start_date=f"-{days_since_notif}d", end_date=f"-{max(days_since_notif-30,1)}d")

    approval_stage = np.random.choice([1, 2, 3, 4, 5], p=[0.10, 0.18, 0.27, 0.25, 0.20])

    # legal disputes: base rate from project type, scaled up by families affected (more families -> more disputes)
    litig_prob = min(pinfo["litig_base"] * sinfo["risk"] * (1 + families_affected / 3000), 0.9)
    has_dispute = np.random.rand() < litig_prob
    legal_disputes_count = 0
    if has_dispute:
        # heavy tail per the 1.74L pending-cases national figure
        legal_disputes_count = int(np.random.choice([1, 2, 3, 4, 5, 8, 12], p=[0.38, 0.22, 0.14, 0.10, 0.08, 0.05, 0.03]))

    # compensation disbursed %: lower if more disputes, lower if earlier approval stage
    base_disb = 15 + approval_stage * 16
    disb_pct = base_disb - legal_disputes_count * 6 + np.random.normal(0, 8)
    compensation_disbursed_pct = float(np.clip(disb_pct, 0, 100))

    # R&R progress correlated with compensation disbursed & approval stage
    rr_progress_pct = float(np.clip(compensation_disbursed_pct * 0.85 + np.random.normal(0, 10), 0, 100))

    stakeholder_resp = np.random.choice(RESPONSIVENESS, p=[0.30, 0.45, 0.25])
    resp_penalty = {"Low": 1.25, "Medium": 1.0, "High": 0.75}[stakeholder_resp]

    hist_dept_avg_delay_days = int(np.clip(np.random.normal(180, 90) * sinfo["risk"], 20, 900))

    # ---- Delay model (drives the ML target) ----
    risk_score = (
        0.35 * (legal_disputes_count / 5)
        + 0.25 * (1 - compensation_disbursed_pct / 100)
        + 0.15 * (1 - rr_progress_pct / 100)
        + 0.10 * (families_affected / 3000)
        + 0.10 * (pinfo["overrun"] - 0.9)
        + 0.05 * (resp_penalty - 1)
    )
    risk_score = float(np.clip(risk_score + np.random.normal(0, 0.08), 0, 1.5))

    delayed = risk_score > 0.30
    if delayed:
        delay_days = int(np.clip(np.random.gamma(shape=2.0, scale=hist_dept_avg_delay_days * (0.5 + risk_score)), 15, 2200))
    else:
        delay_days = int(np.clip(np.random.exponential(15), 0, 60))

    # last_activity_date: healthy/on-track projects show recent activity;
    # higher-risk / delayed projects are more likely to show a long silence
    # (needed as a realistic training signal for the "silent stall" alarm feature)
    if delayed and risk_score > 0.55:
        # long-silence tail: 30 to 400 days since last update
        silence_days = int(np.random.exponential(120))
        silence_days = min(max(silence_days, 30), 400)
    elif delayed:
        silence_days = int(np.random.exponential(45))
        silence_days = min(silence_days, 180)
    else:
        silence_days = int(np.random.exponential(15))
        silence_days = min(silence_days, 90)
    last_activity_date = fake.date_between(start_date=f"-{silence_days}d", end_date=f"-{max(silence_days-5,0)}d") if silence_days > 5 else fake.date_between(start_date="-5d", end_date="today")

    rows.append({
        "project_id": f"LA-{notification_date.year}-{i:04d}",
        "state": state,
        "district": district,
        "latitude": lat,
        "longitude": lon,
        "project_type": ptype,
        "implementing_department": department,
        "land_area_hectares": land_area,
        "families_affected": families_affected,
        "compensation_assessed_inr": int(compensation_assessed),
        "compensation_disbursed_pct": round(compensation_disbursed_pct, 1),
        "legal_disputes_count": legal_disputes_count,
        "notification_date": notification_date.isoformat(),
        "approval_stage": f"Stage {approval_stage} of 5",
        "rr_progress_pct": round(rr_progress_pct, 1),
        "stakeholder_responsiveness": stakeholder_resp,
        "historical_dept_avg_delay_days": hist_dept_avg_delay_days,
        "last_activity_date": last_activity_date.isoformat(),
        "risk_score_raw": round(risk_score, 3),
        "delayed": "Y" if delayed else "N",
        "delay_days": delay_days,
    })

df = pd.DataFrame(rows)

# sanity: overall delay rate should land near real-world ~26-35%
delay_rate = (df["delayed"] == "Y").mean()
print(f"Rows generated: {len(df)}")
print(f"Overall delayed rate: {delay_rate:.1%}  (target ~25-35%, matches NHAI/parliamentary panel figures)")
print(df["project_type"].value_counts(normalize=True).round(2))
print(df.groupby("project_type")["delayed"].apply(lambda s: (s=="Y").mean()).round(2))

# sanity: project_id uniqueness
n_unique = df["project_id"].nunique()
assert n_unique == len(df), f"Duplicate project_ids found: {n_unique}/{len(df)} unique"
print(f"Unique project_ids: {n_unique}/{len(df)} - OK")

# sanity: last_activity_date should skew longer for delayed/high-risk projects
df["_days_since_activity"] = (pd.Timestamp.today().normalize() - pd.to_datetime(df["last_activity_date"])).dt.days
print("Median days since last activity, on-track vs delayed:")
print(df.groupby("delayed")["_days_since_activity"].median())
df = df.drop(columns=["_days_since_activity"])

# Relative path so this works on any teammate's machine, not just this sandbox.
# Run this script from inside the database/ folder (or adjust the path below).
OUTPUT_PATH = "land_acquisition_synthetic_dataset.csv"
df.to_csv(OUTPUT_PATH, index=False)
print(f"Saved CSV to {OUTPUT_PATH}")
