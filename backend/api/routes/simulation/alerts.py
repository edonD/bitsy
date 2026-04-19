"""
Alerts — pattern-match recent data for the three events a user wants
to hear about:

  1. /alerts/drops         — mention-rate dropped >threshold pp vs 7-day avg
  2. /alerts/new-entrants  — a brand appeared in recent responses that
                             wasn't in the prior period
  3. /alerts/summary       — everything in one payload, for the dashboard

No email / Slack delivery yet — this is the data layer. Email sender
lands when auth + workspaces do; until then, poll the endpoint.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter

from pipeline import convex_client as cx


router = APIRouter()


@router.get("/alerts/drops")
def alert_drops(days: int = 7, threshold_pp: float = 5.0):
    """
    Find brands whose latest mention_rate dropped >= threshold_pp below
    the mean of the prior `days` window. Returns one row per drop.
    """
    try:
        samples = cx.get_all_training_samples()
    except Exception:
        samples = []

    by_brand: dict[str, list[dict]] = {}
    for s in samples:
        b = s.get("brand")
        if b:
            by_brand.setdefault(b, []).append(s)

    drops = []
    today_iso = date.today().isoformat()
    for brand, rows in by_brand.items():
        # Sort by date ascending
        rows.sort(key=lambda r: r.get("date", ""))
        if len(rows) < 2:
            continue

        latest = rows[-1]
        latest_rate = latest.get("mention_rate")
        if not isinstance(latest_rate, (int, float)):
            continue

        # Prior window: everything before latest, last `days` rows
        prior = rows[:-1][-days:]
        if not prior:
            continue
        prior_rates = [
            r.get("mention_rate")
            for r in prior
            if isinstance(r.get("mention_rate"), (int, float))
        ]
        if not prior_rates:
            continue

        prior_mean = sum(prior_rates) / len(prior_rates)
        delta = latest_rate - prior_mean

        if delta <= -threshold_pp:
            drops.append({
                "brand": brand,
                "latest_rate": round(latest_rate, 1),
                "prior_mean": round(prior_mean, 1),
                "delta_pp": round(delta, 1),
                "latest_date": latest.get("date"),
                "window_days": len(prior),
                "severity": "high" if delta <= -threshold_pp * 2 else "medium",
            })

    drops.sort(key=lambda d: d["delta_pp"])  # biggest negative first
    return {
        "drops": drops,
        "threshold_pp": threshold_pp,
        "window_days": days,
        "as_of": today_iso,
    }


@router.get("/alerts/new-entrants")
def alert_new_entrants(days: int = 14):
    """
    Find brand names appearing in LLM responses during the recent window
    that weren't present in the window before that. Uses the parsed_brands
    field from api_logs.
    """
    try:
        all_logs = cx.get_recent_api_logs(limit=500) or []
    except Exception:
        all_logs = []

    today = date.today()
    mid_cutoff = (today - timedelta(days=days)).isoformat()
    start_cutoff = (today - timedelta(days=days * 2)).isoformat()

    def _extract_brands(logs: list[dict]) -> set[str]:
        out: set[str] = set()
        for log in logs:
            parsed = log.get("parsed_brands")
            if not isinstance(parsed, dict):
                continue
            for m in parsed.get("brands_mentioned") or []:
                if isinstance(m, dict) and isinstance(m.get("brand"), str):
                    name = m["brand"].strip()
                    if name:
                        out.add(name)
        return out

    recent_logs = [l for l in all_logs if (l.get("date") or "") >= mid_cutoff]
    prior_logs = [l for l in all_logs if start_cutoff <= (l.get("date") or "") < mid_cutoff]

    recent_brands = _extract_brands(recent_logs)
    prior_brands = _extract_brands(prior_logs)
    entrants = sorted(recent_brands - prior_brands)

    # Count how often each entrant appears in the recent window (signal strength)
    entrant_counts: dict[str, int] = {e: 0 for e in entrants}
    for log in recent_logs:
        parsed = log.get("parsed_brands")
        if not isinstance(parsed, dict):
            continue
        for m in parsed.get("brands_mentioned") or []:
            if isinstance(m, dict):
                name = (m.get("brand") or "").strip()
                if name in entrant_counts:
                    entrant_counts[name] += 1

    rows = [
        {"brand": b, "mentions_in_window": entrant_counts.get(b, 0)}
        for b in entrants
        if entrant_counts.get(b, 0) >= 2  # filter rare one-off extractions
    ]
    rows.sort(key=lambda r: r["mentions_in_window"], reverse=True)

    return {
        "entrants": rows,
        "window_days": days,
        "recent_brand_total": len(recent_brands),
        "prior_brand_total": len(prior_brands),
    }


@router.get("/alerts/summary")
def alert_summary(days: int = 7, threshold_pp: float = 5.0):
    """One call for the dashboard — drops + new entrants in one payload."""
    drops = alert_drops(days=days, threshold_pp=threshold_pp)
    entrants = alert_new_entrants(days=days * 2)

    return {
        "drops": drops["drops"],
        "entrants": entrants["entrants"],
        "as_of": drops["as_of"],
        "window_days": days,
        "counts": {
            "drops": len(drops["drops"]),
            "entrants": len(entrants["entrants"]),
        },
    }
