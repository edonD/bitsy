"""POST /crawl-domain — playground for the tiered site crawler."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from pipeline.site_crawler import crawl_domain, result_to_dict, _cloudflare_available
from pipeline.scripted_crawler import scripted_crawl_domain, crawl_with_fallback


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
        result = scripted_crawl_domain(req.url, max_pages=req.max_pages)
    elif req.mode == "fast":
        result = crawl_domain(req.url, max_pages=req.max_pages, depth=req.depth)
    else:  # auto
        result = crawl_with_fallback(req.url, max_pages=req.max_pages, depth=req.depth)

    payload = result_to_dict(result)
    payload["cloudflare_configured"] = _cloudflare_available()
    payload["mode_requested"] = req.mode
    return payload
