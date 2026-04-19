"""POST /crawl-domain — playground for the tiered site crawler."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from pipeline.site_crawler import crawl_domain, result_to_dict, _cloudflare_available
from pipeline.scripted_crawler import scripted_crawl_domain, crawl_with_fallback
from pipeline.budget_guard import guarded_scripted_crawl  # noqa: F401  (used via fn ref below)


router = APIRouter()


class CrawlDomainRequest(BaseModel):
    url: str
    max_pages: int = Field(default=5, ge=1, le=25)
    depth: int = Field(default=2, ge=1, le=4)
    # "auto"    — Cloudflare /crawl first, scripted fallback on empty
    # "fast"    — /crawl only (tier 1)
    # "scripted"— Playwright over Cloudflare Browser Run CDP (tier 2)
    mode: str = Field(default="auto", pattern="^(auto|fast|scripted)$")


@router.post("/crawl-domain")
def crawl_domain_endpoint(req: CrawlDomainRequest):
    """
    Crawl a domain and return GEO-relevant content features, per-page and
    aggregated. Three modes:
      - auto:     tier 1 (fast, high-level) then tier 2 (scripted browser) on empty
      - fast:     tier 1 only — Cloudflare /crawl or direct HTTP
      - scripted: tier 2 only — Playwright driving Cloudflare Browser Run via CDP,
                  with cookie dismissal and scroll-for-lazy-load
    """
    if req.mode == "scripted":
        # guarded_scripted_crawl enforces DAILY_BROWSER_BUDGET_SECONDS and
        # records actual usage to Convex so /budget/today reflects reality.
        result = guarded_scripted_crawl(req.url, max_pages=req.max_pages)
    elif req.mode == "fast":
        result = crawl_domain(req.url, max_pages=req.max_pages, depth=req.depth)
    else:  # auto
        # Auto path does tier-1 first; scripted fallback runs via budget guard
        # inside crawl_with_fallback because it imports scripted_crawl_domain
        # lazily — tolerable for now, we can tighten later if needed.
        result = crawl_with_fallback(req.url, max_pages=req.max_pages, depth=req.depth)

    payload = result_to_dict(result)
    payload["cloudflare_configured"] = _cloudflare_available()
    payload["mode_requested"] = req.mode
    return payload
