"""
Budget — guards and reports Cloudflare Browser Run spend.

Workers Paid includes 10 browser-hours/month (36,000 seconds). The
DAILY_BROWSER_BUDGET_SECONDS cap below keeps us comfortably under that
even in the absence of Cloudflare's own billing alerts.

  GET  /budget/today   — usage for today
  GET  /budget/recent  — last 30 days

The scripted crawler wrapper (pipeline.budget_guard) enforces the cap
before each expensive Browser Run call and records actual usage after.
"""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter

from pipeline import convex_client as cx
from pipeline.budget_guard import DAILY_BROWSER_BUDGET_SECONDS


router = APIRouter()


@router.get("/budget/today")
def budget_today():
    today = date.today().isoformat()
    try:
        usage = cx.get_browser_usage_for_date(today) or {}
    except Exception:
        usage = {}
    seconds_used = float(usage.get("seconds_used") or 0)
    return {
        "date": today,
        "seconds_used": round(seconds_used, 1),
        "seconds_budget": DAILY_BROWSER_BUDGET_SECONDS,
        "seconds_remaining": max(0.0, DAILY_BROWSER_BUDGET_SECONDS - seconds_used),
        "pct_used": round(seconds_used / DAILY_BROWSER_BUDGET_SECONDS * 100, 1)
                     if DAILY_BROWSER_BUDGET_SECONDS > 0 else 0,
        "request_count": int(usage.get("request_count") or 0),
        "blocked_today": seconds_used >= DAILY_BROWSER_BUDGET_SECONDS,
    }


@router.get("/budget/recent")
def budget_recent(days: int = 30):
    try:
        rows = cx.get_browser_usage_recent(days=days) or []
    except Exception:
        rows = []

    total_seconds = sum(float(r.get("seconds_used") or 0) for r in rows)
    total_requests = sum(int(r.get("request_count") or 0) for r in rows)

    # Fill in missing days with zeros so the chart is continuous
    today = date.today()
    by_date = {r["date"]: r for r in rows if r.get("date")}
    timeline = []
    for i in range(days):
        d = (today - timedelta(days=days - 1 - i)).isoformat()
        row = by_date.get(d)
        timeline.append({
            "date": d,
            "seconds_used": float((row or {}).get("seconds_used") or 0),
            "request_count": int((row or {}).get("request_count") or 0),
        })

    # Rough $/month projection at Cloudflare's $0.09/hr overage rate
    avg_daily_seconds = total_seconds / max(len(rows), 1)
    projected_monthly_hours = avg_daily_seconds / 3600 * 30
    included_hours = 10  # Workers Paid tier
    overage_hours = max(0.0, projected_monthly_hours - included_hours)
    projected_overage_usd = round(overage_hours * 0.09, 2)

    return {
        "timeline": timeline,
        "total_seconds": round(total_seconds, 1),
        "total_requests": total_requests,
        "avg_daily_seconds": round(avg_daily_seconds, 1),
        "projected_monthly_hours": round(projected_monthly_hours, 2),
        "projected_overage_usd": projected_overage_usd,
        "daily_budget_seconds": DAILY_BROWSER_BUDGET_SECONDS,
    }
