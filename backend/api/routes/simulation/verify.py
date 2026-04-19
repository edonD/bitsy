"""
Verify — predicted-vs-actual attribution for shipped changes.

Loop:
  1. User logs a change via POST /verify/log-change
     (records baseline_rate from the current feature store)
  2. At least 14 days pass, nightly benchmark collects new mentions
  3. GET /verify/attribution?brand=X shows each logged change with
     actual_lift computed from the trend data

Calibration bucket:
  - accurate:   |actual - predicted| < 3pp
  - close:      |actual - predicted| < 6pp
  - off:        anything else

Closes the honesty loop on the Simulate step: every prediction
Bitsy made is held against reality.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from pipeline import convex_client as cx

from ._store import _store


router = APIRouter()


class LogChangeRequest(BaseModel):
    brand: str
    feature: str
    description: str
    predicted_lift: Optional[float] = None  # pp — from the playbook
    context: Optional[dict] = None          # URL, word count, snippet, etc.


@router.post("/verify/log-change")
def log_change(req: LogChangeRequest):
    """Record a shipped change so we can attribute lift to it 14+ days later."""
    today = date.today().isoformat()
    shipped_at_ms = int(datetime.now().timestamp() * 1000)

    # Capture baseline rate from the feature store so attribution is anchored
    # to what the engine knew at save time, not a later retrain.
    baseline_rate: Optional[float] = None
    for row in _store.get("features") or []:
        if row.get("brand", "").lower() == req.brand.lower():
            mr = row.get("mention_rate")
            if isinstance(mr, (int, float)):
                baseline_rate = float(mr)
            break

    ids = cx.store_change_log([{
        "date": today,
        "brand": req.brand,
        "feature": req.feature,
        "description": req.description,
        "shipped_at": shipped_at_ms,
        "predicted_lift": req.predicted_lift,
        "baseline_rate": baseline_rate,
        "context": req.context or {},
    }])

    return {
        "id": ids[0] if ids else None,
        "brand": req.brand,
        "feature": req.feature,
        "baseline_rate": baseline_rate,
        "shipped_at": shipped_at_ms,
        "note": (
            "Attribution will be available 14 days from now. In the meantime "
            "the nightly benchmark will populate the comparison data."
        ),
    }


@router.get("/verify/changes")
def list_changes(brand: str, limit: int = 50):
    """Recent changes logged for a brand, newest first."""
    rows = cx.get_changes_by_brand(brand, limit)
    return {"brand": brand, "changes": rows, "count": len(rows)}


def _classify(
    predicted: Optional[float],
    actual: Optional[float],
) -> str:
    """Bucket the prediction vs. actual: accurate / close / off / pending."""
    if predicted is None or actual is None:
        return "pending"
    diff = abs(actual - predicted)
    if diff < 3:
        return "accurate"
    if diff < 6:
        return "close"
    return "off"


@router.get("/verify/attribution")
def attribution(brand: str):
    """
    Compute predicted-vs-actual for every logged change. Uses the /trends
    signal for the brand to find the mention rate `shipped_at + 14 days`
    (or the most recent point if less than 14 days have passed).
    """
    changes = cx.get_changes_by_brand(brand, limit=100)
    try:
        signals = cx.get_signals_by_brand(brand, days=180)
    except Exception:
        signals = []

    # Build a date -> mention_rate lookup
    rate_by_date: dict[str, float] = {}
    for s in signals:
        d = s.get("date")
        mr = s.get("mention_rate")
        if d and isinstance(mr, (int, float)):
            rate_by_date[d] = float(mr)

    sorted_dates = sorted(rate_by_date.keys())

    def _nearest_after(d: str) -> Optional[str]:
        """Earliest date >= d with a mention_rate entry."""
        for cand in sorted_dates:
            if cand >= d:
                return cand
        return None

    results = []
    today_iso = date.today().isoformat()
    accurate_ct = close_ct = off_ct = pending_ct = 0

    for change in changes:
        shipped_ms = int(change.get("shipped_at") or 0)
        shipped_dt = (
            datetime.fromtimestamp(shipped_ms / 1000).date().isoformat()
            if shipped_ms else change.get("date")
        )
        target_dt = (
            datetime.fromtimestamp(shipped_ms / 1000 + 14 * 86400).date().isoformat()
            if shipped_ms else None
        )

        baseline = change.get("baseline_rate")
        # If baseline wasn't captured at save time, fall back to the rate on shipped date
        if baseline is None and shipped_dt:
            baseline = rate_by_date.get(shipped_dt)

        # Find the first available rate at or after target_dt (14d after ship)
        actual_rate: Optional[float] = None
        measured_at: Optional[str] = None
        days_elapsed: Optional[int] = None
        if shipped_dt:
            days_elapsed = (date.today() - datetime.fromisoformat(shipped_dt).date()).days
        if target_dt:
            if target_dt > today_iso:
                # Not yet 14 days — still pending
                pass
            else:
                nearest = _nearest_after(target_dt)
                if nearest:
                    actual_rate = rate_by_date.get(nearest)
                    measured_at = nearest

        predicted = change.get("predicted_lift")
        actual_lift = (
            (actual_rate - baseline) if (actual_rate is not None and baseline is not None) else None
        )

        status = _classify(predicted, actual_lift)
        if status == "accurate":
            accurate_ct += 1
        elif status == "close":
            close_ct += 1
        elif status == "off":
            off_ct += 1
        else:
            pending_ct += 1

        results.append({
            "id": change.get("_id"),
            "brand": change.get("brand"),
            "feature": change.get("feature"),
            "description": change.get("description"),
            "shipped_at": shipped_ms,
            "shipped_date": shipped_dt,
            "days_elapsed": days_elapsed,
            "predicted_lift": predicted,
            "baseline_rate": baseline,
            "actual_rate": actual_rate,
            "actual_lift": actual_lift,
            "measured_at": measured_at,
            "status": status,
            "context": change.get("context") or {},
        })

    total_done = accurate_ct + close_ct + off_ct
    calibration_pct = (
        round((accurate_ct + close_ct) / total_done * 100, 1)
        if total_done > 0 else None
    )

    return {
        "brand": brand,
        "changes": results,
        "counts": {
            "total": len(results),
            "accurate": accurate_ct,
            "close": close_ct,
            "off": off_ct,
            "pending": pending_ct,
        },
        "calibration_pct": calibration_pct,  # null if no verified yet
        "signal_days_available": len(rate_by_date),
    }
