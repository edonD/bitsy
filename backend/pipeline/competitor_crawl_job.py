"""
Nightly competitor-content refresh.

For every tracked brand with a known homepage URL, crawl up to N pages,
extract GEO-relevant content features, and persist them as a brand_signal
row dated today. This removes the "competitors are all zeros on content
features" bias the model was suffering from.

Usage:
    python -m pipeline.competitor_crawl_job [--max-pages 5] [--depth 2]

Called nightly from cron at 03:00 UTC, between the benchmark run (02:00)
and the model retrain (04:00).
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import date

from pipeline import convex_client as cx
from pipeline.brand_domains import BRAND_DOMAINS
from pipeline.site_crawler import crawl_domain, _cloudflare_available


def run(max_pages: int = 5, depth: int = 2, limit: int | None = None) -> dict:
    today = date.today().isoformat()
    print(f"=== competitor crawl at {today} ===")
    print(f"cloudflare configured: {_cloudflare_available()}")
    print(f"brands to crawl: {len(BRAND_DOMAINS)}")

    items = list(BRAND_DOMAINS.items())
    if limit is not None:
        items = items[:limit]

    crawled = 0
    blocked = 0
    errored = 0
    records = []

    for brand, url in items:
        t0 = time.time()
        try:
            result = crawl_domain(url, max_pages=max_pages, depth=depth)
        except Exception as e:
            print(f"  [err]  {brand:20s}  {e!s}")
            errored += 1
            continue

        elapsed = time.time() - t0
        status = "blocked" if result.blocked else "ok" if result.pages_crawled else "empty"
        print(
            f"  [{status:7s}] {brand:20s}  "
            f"pages={result.pages_crawled}/{result.pages_found}  "
            f"words={result.total_words:>6d}  "
            f"stats={result.aggregate.get('statistics_count', 0):>3d}  "
            f"quotes={result.aggregate.get('quotation_count', 0):>3d}  "
            f"{elapsed:.1f}s"
        )

        if result.blocked:
            blocked += 1
        elif result.pages_crawled > 0:
            crawled += 1

        # Persist one signal row per brand per day. The brand_signals table
        # stores what the engine treats as the brand's current content state;
        # the surrogate retrain at 04:00 picks it up.
        records.append({
            "date": today,
            "brand": brand,
            "source": "competitor_crawl",
            "statistics_density": result.aggregate.get("statistics_density", 0),
            "quotation_count": result.aggregate.get("quotation_count", 0),
            "citation_count": result.aggregate.get("citation_count", 0),
            "content_length": result.aggregate.get("content_length", 0),
            "readability_grade": result.aggregate.get("readability_grade", 0),
            "freshness_days": result.aggregate.get("freshness_days"),
            "heading_count": result.aggregate.get("heading_count", 0),
            "has_schema_org": bool(result.aggregate.get("has_schema_org")),
            "word_count": result.total_words,
            "pages_crawled": result.pages_crawled,
            "crawler": result.crawler,
            "blocked": result.blocked,
            "note": result.note,
        })

    # Batch-store to Convex in chunks of 20.
    stored = 0
    for i in range(0, len(records), 20):
        batch = records[i:i + 20]
        try:
            cx.store_signals(batch)
            stored += len(batch)
        except Exception as e:
            print(f"  [warn] failed to store batch {i}: {e}")

    summary = {
        "date": today,
        "crawled": crawled,
        "blocked": blocked,
        "errored": errored,
        "total": len(items),
        "rows_stored": stored,
    }
    print(f"=== summary: {summary} ===")

    try:
        cx.add_log(
            "competitor_crawl",
            f"Crawled {crawled}/{len(items)} brands ({blocked} blocked, {errored} errored)",
            "success",
            summary,
        )
    except Exception:
        pass

    return summary


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")

    from dotenv import load_dotenv
    from pathlib import Path
    load_dotenv(Path(__file__).resolve().parent.parent.parent / "site" / ".env.local")

    parser = argparse.ArgumentParser()
    parser.add_argument("--max-pages", type=int, default=5)
    parser.add_argument("--depth", type=int, default=2)
    parser.add_argument("--limit", type=int, default=None,
                        help="Only crawl the first N brands (for testing)")
    args = parser.parse_args()

    run(max_pages=args.max_pages, depth=args.depth, limit=args.limit)
