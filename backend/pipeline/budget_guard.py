"""
Budget guard for Cloudflare Browser Run — prevents runaway browser-second
spend. Every call to scripted_crawl_domain passes through here.

Workers Paid tier:
  10 browser-hours/mo included, $0.09/hr overage.
  DAILY_BROWSER_BUDGET_SECONDS is a hard client-side stop.

Design:
  - before_call(): reads today's usage from Convex. If we're over budget,
    raises BudgetExceeded.
  - record_usage(seconds): logs the seconds used for today.
  - Failures to read/write usage are logged and swallowed so a Convex
    outage doesn't take down the crawler.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from pipeline import convex_client as cx


DAILY_BROWSER_BUDGET_SECONDS = 1800  # 30 minutes — ~15h/month worst case


class BudgetExceeded(RuntimeError):
    """Raised when today's browser-second usage exceeds the cap."""


def check_budget() -> tuple[bool, Optional[dict]]:
    """
    Returns (allowed, current_usage).
    Swallows Convex errors and returns (True, None) so a Convex outage
    doesn't block the crawler — the Cloudflare billing alert is the
    backstop in that case.
    """
    today = date.today().isoformat()
    try:
        usage = cx.get_browser_usage_for_date(today)
    except Exception:
        return True, None

    if not usage:
        return True, None

    seconds = float(usage.get("seconds_used") or 0)
    if seconds >= DAILY_BROWSER_BUDGET_SECONDS:
        return False, usage
    return True, usage


def record_usage(seconds: float) -> None:
    """Add seconds to today's tally. Swallows errors — this is best-effort."""
    if seconds <= 0:
        return
    today = date.today().isoformat()
    try:
        cx.record_browser_usage(today, float(seconds))
    except Exception as e:
        # Don't fail the caller; log and move on.
        print(f"  WARN: budget_guard could not record usage: {e}")


def guarded_scripted_crawl(url: str, max_pages: int = 3):
    """
    Wrapper around scripted_crawl_domain that enforces the daily budget
    and records actual browser-seconds used on completion. Returns the
    same DomainCrawlResult shape; on budget exceedance, returns a
    blocked result with note="budget_exhausted" and crawler="scripted".
    """
    # Import here to avoid a circular import at module load
    from pipeline.scripted_crawler import scripted_crawl_domain
    from pipeline.site_crawler import DomainCrawlResult, _aggregate

    allowed, usage = check_budget()
    if not allowed:
        seconds_used = float((usage or {}).get("seconds_used") or 0)
        return DomainCrawlResult(
            url=url,
            crawler="scripted",
            blocked=True,
            pages_found=0,
            pages_crawled=0,
            total_words=0,
            duration_ms=0,
            aggregate=_aggregate([]),
            pages=[],
            note=(
                f"budget_exhausted: {seconds_used:.0f}s used today / "
                f"{DAILY_BROWSER_BUDGET_SECONDS}s cap. Use tier 1 (fast) "
                f"mode or wait until tomorrow."
            ),
            error="daily_browser_budget_exceeded",
        )

    import time
    start = time.time()
    result = scripted_crawl_domain(url, max_pages=max_pages)
    elapsed = time.time() - start

    # Only charge against the budget if the call actually hit Cloudflare
    # (ie it wasn't a short-circuit failure before CDP connected).
    if result.crawler == "scripted" and result.duration_ms and result.duration_ms > 500:
        record_usage(elapsed)

    return result
