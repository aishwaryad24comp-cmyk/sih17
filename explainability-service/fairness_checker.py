"""
Feature #9 -- Fairness-Gap Checker (Member 3 deliverable).

Compares a project's compensation offer (per hectare) against a peer
benchmark rate, and flags it if the offer looks unfairly low -- since
perceived-unfair compensation is one of the biggest real-world causes of
land acquisition delay and litigation.

DESIGN NOTE (be upfront about this with judges):
The dataset has no real "market land-sale rate" or "other government
payout" field to benchmark against -- only each project's own
compensation_assessed_inr and land_area_hectares. So the benchmark here
is a PEER PROXY: the median offer-rate of OTHER projects in the same
district (same project_type where there's enough sample), with the
project under review excluded from its own benchmark so the check isn't
self-referential. This is a legitimate hackathon-stage proxy, not the
full spec -- the roadmap upgrade is to benchmark against real land-record
sale rates (DILRMP / state land-record portals) instead of peer projects.

Built once at service startup (FairnessGapIndex), same pattern as
HistoricalEvidenceIndex in historical_evidence.py, so both indexes are
built from one CSV read at boot and reused per request.
"""

import pandas as pd

from explain import DATA_PATH

MIN_SAMPLE_FOR_TYPE_MATCH = 3  # below this, broaden from district+type to district only
DEFAULT_GAP_THRESHOLD_PCT = 20.0  # matches the frontend's fairnessGapThresholdPct


def _rate_per_hectare(row) -> float:
    area = row["land_area_hectares"] if row["land_area_hectares"] else 1.0
    return row["compensation_assessed_inr"] / area


class FairnessGapIndex:
    def __init__(self):
        self.df = self._build()

    def _build(self) -> pd.DataFrame:
        raw = pd.read_csv(DATA_PATH)
        for col in ("district", "project_type", "compensation_assessed_inr", "land_area_hectares"):
            if col not in raw.columns:
                raise ValueError(
                    f"Fairness-Gap Checker needs '{col}' in the dataset -- "
                    f"confirm the latest CSV is being used."
                )
        raw = raw.copy()
        raw["rate_per_hectare"] = raw.apply(_rate_per_hectare, axis=1)
        return raw[["project_id", "district", "project_type", "rate_per_hectare"]]

    def _benchmark(self, district: str, project_type: str, exclude_project_id: str | None):
        """
        Returns (benchmark_rate, matched_on, sample_size) using the
        narrowest peer group with enough sample, broadening step by step:
        district + project_type -> district only.
        """
        pool = self.df[self.df["district"] == district]
        if exclude_project_id is not None:
            pool = pool[pool["project_id"] != exclude_project_id]

        narrow = pool[pool["project_type"] == project_type]
        if len(narrow) >= MIN_SAMPLE_FOR_TYPE_MATCH:
            return narrow["rate_per_hectare"].median(), "district + project_type", len(narrow)

        if len(pool) > 0:
            return pool["rate_per_hectare"].median(), "district only (too few exact matches)", len(pool)

        return None, "no peer projects in this district", 0

    def check(
        self,
        district: str,
        project_type: str,
        compensation_assessed_inr: float,
        land_area_hectares: float,
        project_id: str | None = None,
        threshold_pct: float = DEFAULT_GAP_THRESHOLD_PCT,
    ):
        """
        Returns a fairness-gap report dict, or None if there's no peer
        basis at all (brand-new district with zero other projects).
        """
        offer_rate = compensation_assessed_inr / (land_area_hectares or 1.0)
        benchmark_rate, matched_on, sample_size = self._benchmark(district, project_type, project_id)

        if benchmark_rate is None or benchmark_rate == 0:
            return None

        gap_pct = round(100 * (benchmark_rate - offer_rate) / benchmark_rate, 1)
        flagged = bool(gap_pct >= threshold_pct)

        if gap_pct >= 0:
            comparison = f"{gap_pct}% below the peer benchmark"
        else:
            comparison = f"{abs(gap_pct)}% above the peer benchmark"

        return {
            "offer_rate_per_hectare": round(float(offer_rate), 2),
            "peer_benchmark_rate_per_hectare": round(float(benchmark_rate), 2),
            "gap_pct": float(gap_pct),
            "flagged": flagged,
            "matched_on": matched_on,
            "sample_size": int(sample_size),
            "note": (
                f"Offer is {comparison} ({matched_on}, n={sample_size}). "
                + ("Flagged as a likely dispute risk." if flagged
                   else "Within normal range for this district.")
            ),
        }