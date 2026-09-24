"""
Feature #19 -- Historical Outcome Evidence (Member 3 deliverable).

For a project flagged high-risk, shows what happened to similar PAST
projects -- same project_type + same top SHAP delay driver -- where NO
corrective action was taken (action_taken == False). Turns the rule-based
recommendation engine from purely prescriptive ("do X") into evidence-backed
("last time nobody did X on a similar project, here's what happened").

Built once at service startup (HistoricalEvidenceIndex), reused for every
/recommend call -- SHAP top-driver labelling for ~180 historical rows is
cheap, but there's no reason to redo it per request.
"""

import pandas as pd

from explain import load_feature_frame, DATA_PATH
from recommendations import estimate_overrun_pct

MIN_SAMPLE_FOR_EXACT_MATCH = 3  # below this, broaden the match (see lookup())


class HistoricalEvidenceIndex:
    def __init__(self, explainer):
        self.explainer = explainer
        self.index = self._build()

    def _build(self) -> pd.DataFrame:
        raw = pd.read_csv(DATA_PATH)
        for col in ("action_taken", "final_outcome", "project_budget"):
            if col not in raw.columns:
                raise ValueError(
                    f"Historical evidence needs '{col}' in the dataset -- "
                    f"confirm Jesni's latest CSV (27 columns) is being used, "
                    f"not an older copy."
                )

        # Only projects that were actually flagged delayed AND where no
        # corrective action was recorded -- this is the "what if nobody
        # acts" evidence the feature is meant to show.
        subset = raw[
            (raw["delayed"] == "Y")
            & (raw["action_taken"].astype(str) == "False")
        ].copy()

        if subset.empty:
            return pd.DataFrame(
                columns=["project_type", "top_driver", "final_outcome", "delay_days"]
            )

        # Rebuild the same raw feature frame explain.py uses, restricted to
        # this subset, so SHAP sees identical preprocessing to /explain.
        full_features = load_feature_frame()
        feature_rows = full_features.loc[subset.index]

        subset["top_driver"] = self.explainer.top_risk_increasing_driver_batch(feature_rows)

        return subset[["project_type", "top_driver", "final_outcome", "delay_days"]].reset_index(drop=True)

    def lookup(self, project_type: str, top_driver: str):
        """
        Returns evidence dict, or None if there's no historical basis at
        all (e.g. brand-new project_type not seen in training data).
        """
        if self.index.empty:
            return None

        matches = self.index[
            (self.index["project_type"] == project_type)
            & (self.index["top_driver"] == top_driver)
        ]
        matched_on = "project_type + top_driver"

        if len(matches) < MIN_SAMPLE_FOR_EXACT_MATCH:
            broader = self.index[self.index["project_type"] == project_type]
            if len(broader) > len(matches):
                matches = broader
                matched_on = "project_type only (too few exact matches)"

        if matches.empty:
            return None

        shelved = int((matches["final_outcome"] == "Shelved").sum())
        shelving_rate_pct = round(100 * shelved / len(matches), 1)
        avg_overrun_pct = round(
            matches["delay_days"].apply(estimate_overrun_pct).mean(), 1
        )

        return {
            "matched_on": matched_on,
            "sample_size": int(len(matches)),
            "avg_budget_overrun_pct": avg_overrun_pct,
            "shelving_rate_pct": shelving_rate_pct,
            "note": (
                f"Based on {len(matches)} similar past project(s) "
                f"({matched_on}) where no corrective action was taken."
            ),
        }
