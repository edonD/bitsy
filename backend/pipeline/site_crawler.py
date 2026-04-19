"""
Site crawler that pulls multiple pages from a domain and rolls up the
GEO-relevant content features across them. Used for:

  1. The nightly competitor content refresh (so every tracked brand has
     real feature values instead of zeros).
  2. The /api/simulations/crawl-domain playground endpoint (so a human
     can drop in any URL and see what the engine would extract).

Primary path: Cloudflare Browser Rendering /crawl API. One call discovers
up to N pages on a domain, renders them in headless Chrome, and returns
markdown. Configure with CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.

Fallback path: direct HTTP GET with the existing content analyzer. Used
when no Cloudflare token is configured or when the Cloudflare call fails.
Single-page only; we don't reimplement Cloudflare's page-discovery logic.

Cloudflare's /crawl endpoint self-identifies as a bot (Web Bot Auth) and
deliberately does NOT bypass bot protection. Sites that block AI crawlers
in robots.txt or via Cloudflare's own challenge will return empty / a
"blocked" signal. We surface that explicitly rather than pretending it
succeeded — a blocked site is a real data point.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field, asdict
from typing import Any, Optional
from urllib.parse import urlparse

import requests

from pipeline.content_analyzer import (
    ContentAnalysis,
    analyze_url,
    analyze_text,
    analyze_html,
)


CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4"
CRAWL_TIMEOUT_S = 90  # Cloudflare crawl can be slow on large sites.
FALLBACK_TIMEOUT_S = 15


@dataclass
class CrawledPage:
    url: str
    status: int
    word_count: int
    markdown_length: int
    title: Optional[str] = None
    features: Optional[dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class DomainCrawlResult:
    url: str
    crawler: str  # "cloudflare" or "direct"
    blocked: bool
    pages_found: int
    pages_crawled: int
    total_words: int
    duration_ms: int
    aggregate: dict[str, Any]  # ContentAnalysis as dict, over the whole domain
    pages: list[CrawledPage] = field(default_factory=list)
    note: Optional[str] = None  # e.g. "robots.txt blocked", "no pages returned"
    error: Optional[str] = None


# ── Cloudflare /crawl ───────────────────────────────────────────────────────

def _cloudflare_credentials() -> tuple[Optional[str], Optional[str]]:
    return os.getenv("CLOUDFLARE_API_TOKEN"), os.getenv("CLOUDFLARE_ACCOUNT_ID")


def _cloudflare_available() -> bool:
    token, account_id = _cloudflare_credentials()
    return bool(token and account_id)


def _cloudflare_crawl(url: str, max_pages: int, depth: int) -> dict[str, Any]:
    """
    Calls https://api.cloudflare.com/client/v4/accounts/{id}/browser-rendering/crawl.
    Raises requests.HTTPError on non-2xx. Returns the parsed JSON payload.
    """
    token, account_id = _cloudflare_credentials()
    if not (token and account_id):
        raise RuntimeError("Cloudflare API token / account id not configured")

    endpoint = f"{CLOUDFLARE_API_BASE}/accounts/{account_id}/browser-rendering/crawl"
    body = {
        "url": url,
        "maxPages": max_pages,
        "depth": depth,
        "format": "markdown",
    }
    resp = requests.post(
        endpoint,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=CRAWL_TIMEOUT_S,
    )
    resp.raise_for_status()
    return resp.json()


def _extract_pages_from_cf_response(payload: dict) -> list[dict]:
    """Defensive parser: Cloudflare's response shape may evolve. Try known paths."""
    if not isinstance(payload, dict):
        return []
    # API v4 convention: { success, result, errors, messages }
    result = payload.get("result") if "result" in payload else payload
    if not result:
        return []
    # Seen variants: result.pages, result.results, result.data, direct list
    for key in ("pages", "results", "data", "items"):
        if isinstance(result, dict) and key in result and isinstance(result[key], list):
            return result[key]
    if isinstance(result, list):
        return result
    return []


# ── Direct fallback ─────────────────────────────────────────────────────────

def _direct_crawl(url: str) -> CrawledPage:
    """Single-page fetch via the built-in content analyzer."""
    analysis = analyze_url(url, timeout=FALLBACK_TIMEOUT_S)
    d = asdict(analysis)
    return CrawledPage(
        url=url,
        status=200 if not analysis.fetch_error else 0,
        word_count=analysis.word_count,
        markdown_length=analysis.content_length,
        title=analysis.title,
        features=d,
        error=analysis.fetch_error,
    )


# ── Aggregation ─────────────────────────────────────────────────────────────

def _aggregate(pages: list[CrawledPage]) -> dict[str, Any]:
    """
    Combine per-page ContentAnalysis dicts into a single domain-level view.
    Counts sum; densities are recomputed from totals; freshness takes the
    most recently modified page.
    """
    total_words = sum(p.word_count for p in pages if p.word_count)
    total_content_length = sum(p.markdown_length for p in pages if p.markdown_length)
    totals = {
        "statistics_count": 0,
        "quotation_count": 0,
        "citation_count": 0,
        "external_link_count": 0,
        "h1_count": 0,
        "h2_count": 0,
        "h3_count": 0,
        "has_schema_org": False,
    }
    freshness_days: Optional[int] = None
    readability_grades: list[float] = []
    tech_densities: list[float] = []

    for page in pages:
        f = page.features or {}
        for key in (
            "statistics_count", "quotation_count", "citation_count",
            "external_link_count", "h1_count", "h2_count", "h3_count",
        ):
            v = f.get(key)
            if isinstance(v, (int, float)):
                totals[key] += int(v)
        if f.get("has_schema_org"):
            totals["has_schema_org"] = True
        rg = f.get("readability_grade")
        if isinstance(rg, (int, float)) and rg > 0:
            readability_grades.append(float(rg))
        td = f.get("technical_term_density")
        if isinstance(td, (int, float)):
            tech_densities.append(float(td))
        fd = f.get("freshness_days")
        if isinstance(fd, int):
            if freshness_days is None or fd < freshness_days:
                freshness_days = fd

    def _density(count: int) -> float:
        return round(count / total_words * 1000, 1) if total_words > 0 else 0.0

    return {
        "word_count": total_words,
        "content_length": total_content_length,
        "statistics_count": totals["statistics_count"],
        "statistics_density": _density(totals["statistics_count"]),
        "quotation_count": totals["quotation_count"],
        "citation_count": totals["citation_count"],
        "external_link_count": totals["external_link_count"],
        "h1_count": totals["h1_count"],
        "h2_count": totals["h2_count"],
        "h3_count": totals["h3_count"],
        "heading_count": totals["h1_count"] + totals["h2_count"] + totals["h3_count"],
        "readability_grade": (
            round(sum(readability_grades) / len(readability_grades), 1)
            if readability_grades else 0.0
        ),
        "technical_term_density": (
            round(sum(tech_densities) / len(tech_densities), 1)
            if tech_densities else 0.0
        ),
        "freshness_days": freshness_days,
        "has_schema_org": totals["has_schema_org"],
    }


# ── Public API ──────────────────────────────────────────────────────────────

def crawl_domain(
    url: str,
    max_pages: int = 5,
    depth: int = 2,
) -> DomainCrawlResult:
    """
    Crawl a domain, extract GEO features per page, and return an aggregated
    domain-level feature vector. Uses Cloudflare Browser Rendering /crawl
    when configured; falls back to a single-page HTTP fetch otherwise.
    """
    start = time.time()

    # Normalize the URL so "example.com" works.
    if not urlparse(url).scheme:
        url = f"https://{url}"

    if _cloudflare_available():
        try:
            return _crawl_via_cloudflare(url, max_pages, depth, start)
        except requests.HTTPError as e:
            # Fall through to direct — keep the reason in `note`.
            note = f"cloudflare HTTP {e.response.status_code if e.response else '?'}, fell back to direct"
            result = _crawl_direct_only(url, start)
            result.note = note
            return result
        except Exception as e:
            result = _crawl_direct_only(url, start)
            result.note = f"cloudflare failed: {e!s}, fell back to direct"
            return result

    return _crawl_direct_only(url, start)


def _crawl_via_cloudflare(
    url: str, max_pages: int, depth: int, start: float
) -> DomainCrawlResult:
    payload = _cloudflare_crawl(url, max_pages=max_pages, depth=depth)
    raw_pages = _extract_pages_from_cf_response(payload)

    pages: list[CrawledPage] = []
    for item in raw_pages:
        page_url = item.get("url") or item.get("link") or url
        markdown = item.get("markdown") or item.get("content") or ""
        html = item.get("html") or ""
        title = item.get("title")
        status = int(item.get("status") or item.get("statusCode") or 200)

        # Prefer HTML analysis when present (gets structured-data signals);
        # otherwise treat markdown as text.
        if html:
            analysis = analyze_html(html[:2_000_000], url=page_url)
        elif markdown:
            analysis = analyze_text(markdown[:2_000_000])
            analysis.url = page_url
            if title:
                analysis.title = title
        else:
            analysis = ContentAnalysis(url=page_url, fetch_error="empty content")

        pages.append(CrawledPage(
            url=page_url,
            status=status,
            word_count=analysis.word_count,
            markdown_length=analysis.content_length,
            title=analysis.title or title,
            features=asdict(analysis),
            error=analysis.fetch_error,
        ))

    blocked = False
    note = None
    if not pages:
        # Cloudflare returns no pages when robots.txt blocks crawling or the
        # site returns a bot challenge. That's information, not a failure.
        blocked = True
        note = "no pages returned — likely blocked by robots.txt or bot protection"

    return DomainCrawlResult(
        url=url,
        crawler="cloudflare",
        blocked=blocked,
        pages_found=len(raw_pages),
        pages_crawled=len(pages),
        total_words=sum(p.word_count for p in pages),
        duration_ms=int((time.time() - start) * 1000),
        aggregate=_aggregate(pages),
        pages=pages,
        note=note,
    )


def _crawl_direct_only(url: str, start: float) -> DomainCrawlResult:
    """Single-page direct HTTP fallback. One request, no discovery."""
    page = _direct_crawl(url)
    blocked = False
    note = None
    if page.error:
        err_lc = page.error.lower()
        if "403" in err_lc or "cloudflare" in err_lc or "blocked" in err_lc:
            blocked = True
            note = f"direct fetch blocked: {page.error}"

    return DomainCrawlResult(
        url=url,
        crawler="direct",
        blocked=blocked,
        pages_found=1 if not page.error else 0,
        pages_crawled=1 if not page.error else 0,
        total_words=page.word_count,
        duration_ms=int((time.time() - start) * 1000),
        aggregate=_aggregate([page] if not page.error else []),
        pages=[page],
        note=note,
        error=page.error if page.error and not blocked else None,
    )


def result_to_dict(result: DomainCrawlResult) -> dict:
    """JSON-safe serialization (for API responses + Convex storage)."""
    return {
        "url": result.url,
        "crawler": result.crawler,
        "blocked": result.blocked,
        "pages_found": result.pages_found,
        "pages_crawled": result.pages_crawled,
        "total_words": result.total_words,
        "duration_ms": result.duration_ms,
        "aggregate": result.aggregate,
        "pages": [asdict(p) for p in result.pages],
        "note": result.note,
        "error": result.error,
    }
