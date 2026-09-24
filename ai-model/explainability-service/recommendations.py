"""
Rule-based recommendation engine -- Member 3's second deliverable.

Deliberately rule-based (not ML), per the team's task split -- fully
transparent and easy to defend to judges. Fires only for drivers that
are INCREASING a project's delay risk.
"""

RULES = {
    "compensation_disbursed_pct": lambda v: (
        f"Compensation only {float(v):.0f}% disbursed. Expedite pending "
        f"payments and prioritize disbursement approvals to defuse "
        f"landowner disputes."
    ),
    "legal_disputes_count": lambda v: (
        f"{int(v)} active legal disputes on this project. Fast-track "
        f"through a dedicated land-acquisition litigation cell; consider "
        f"the Lok Adalat/mediation route to avoid prolonged court delays."
    ),
    "rr_progress_pct": lambda v: (
        f"R&R progress only at {float(v):.0f}%. Accelerate rehabilitation "
        f"and resettlement work to reduce public resistance risk."
    ),
    "stakeholder_responsiveness": lambda v: (
        f"Stakeholder responsiveness is '{v}'. Escalate to the state land "
        f"acquisition unit / District Collector for direct follow-up."
    ),
    "historical_dept_avg_delay_days": lambda v: (
        f"Implementing department has a historical average delay of "
        f"{int(v)} days. Flag this department for closer monitoring and "
        f"additional resource allocation."
    ),
    "approval_stage_num": lambda v: (
        f"Project is only at approval stage {int(v)} of 5. Prioritize "
        f"pending administrative approvals to move to the next stage."
    ),
    "days_since_last_activity": lambda v: (
        f"No recorded activity in {int(v)} days. Trigger a 'silent stall' "
        f"check -- confirm the project hasn't gone quiet before an "
        f"official delay report is filed."
    ),
    "families_affected": lambda v: (
        f"{int(v)} families affected. Large-scale resettlement -- ensure "
        f"dedicated R&R staffing proportional to affected population."
    ),
    "land_area_hectares": lambda v: (
        f"Large land parcel ({float(v):.1f} hectares). Verify parcel-level "
        f"ownership records early to avoid late-stage title disputes."
    ),
    "state": lambda v: (
        f"State ('{v}') has a historically higher land-acquisition risk "
        f"profile. Engage the state nodal officer proactively."
    ),
    "district": lambda v: (
        f"District ('{v}') has a historically higher land-acquisition "
        f"risk profile. Flag for district-level review."
    ),
    "project_type": lambda v: (
        f"Project type ('{v}') has historically higher delay rates. Apply "
        f"the sector-specific mitigation playbook early."
    ),
    "implementing_department": lambda v: (
        f"Implementing department ('{v}') has historically higher delay "
        f"rates. Coordinate early with department leadership."
    ),
}

DEFAULT_RECOMMENDATION = (
    "No single dominant risk driver identified -- continue standard "
    "monitoring and re-check after the next data update."
)


def recommend(drivers: list, max_recommendations: int = 3) -> list:
    """
    drivers: output of Explainer.explain() -- ranked list of dicts with
    'raw_feature', 'value', 'direction'.

    Returns [{driver, recommendation}, ...] for risk-increasing drivers
    only, capped at max_recommendations.
    """
    actions = []
    for d in drivers:
        if d["direction"] != "increases_risk":
            continue
        rule = RULES.get(d["raw_feature"])
        if rule is None or d["value"] is None:
            continue
        try:
            text = rule(d["value"])
        except (TypeError, ValueError):
            continue
        actions.append({"driver": d["feature"], "recommendation": text})
        if len(actions) >= max_recommendations:
            break

    if not actions:
        actions.append({"driver": None, "recommendation": DEFAULT_RECOMMENDATION})
    return actions


# ---------------------------------------------------------------------------
# Feature #20 -- Budget-Impact Estimator
# ---------------------------------------------------------------------------
# Converts a project's predicted delay (in days) into an estimated rupee
# cost overrun, using the project's own budget and a delay-cost escalation
# rate. The rate below is a documented, adjustable ASSUMPTION -- calibrated
# loosely to publicly available infrastructure cost-overrun research (delays
# commonly add low-single-digit-% cost per month of slippage), not derived
# from DoLR data (none is available). Flag this openly to judges as a
# tunable parameter, per the team's "honest built vs. roadmap" framing --
# do not present it as an empirically fitted rate.
DELAY_COST_RATE_PCT_PER_DAY = 0.12  # ~3.6%/month assumption, tune as needed
MAX_OVERRUN_PCT = 80.0  # cap so extreme delay_days don't imply >budget overruns


def estimate_overrun_pct(delay_days) -> float:
    """Delay days -> estimated % cost overrun, capped at MAX_OVERRUN_PCT."""
    if delay_days is None:
        return 0.0
    return round(min(max(float(delay_days), 0) * DELAY_COST_RATE_PCT_PER_DAY, MAX_OVERRUN_PCT), 2)


def estimate_budget_impact(project_budget, predicted_delay_days):
    """
    project_budget: int/float INR, or None if not supplied.
    predicted_delay_days: from Manushree's regressor (land_delay_regressor.pkl).

    Returns None if project_budget wasn't supplied -- the estimate is
    meaningless without it -- rather than guessing a number.
    """
    if project_budget is None or predicted_delay_days is None:
        return None

    overrun_pct = estimate_overrun_pct(predicted_delay_days)
    overrun_inr = round(float(project_budget) * overrun_pct / 100)

    return {
        "predicted_delay_days": int(predicted_delay_days),
        "estimated_overrun_pct": overrun_pct,
        "estimated_cost_overrun_inr": int(overrun_inr),
        "assumption": (
            f"{DELAY_COST_RATE_PCT_PER_DAY}% of project_budget per day delayed, "
            f"capped at {MAX_OVERRUN_PCT}%. Adjustable estimate, not fitted to "
            f"real DoLR outcome data."
        ),
    }
