"""
Scripted crawler — tier 2 of the crawl cascade.

Connects to Cloudflare Browser Run over the Chrome DevTools Protocol via
Playwright, navigates to the target, runs a small browsing recipe (accept
cookies, scroll to trigger lazy-load, wait for real content), then extracts
the rendered HTML. This fixes the cases where Cloudflare's high-level
/crawl endpoint returns an empty shell — SPAs that finish hydrating after
initial load, sites hiding content behind consent banners, infinite-scroll
pages.

Still runs on Cloudflare infrastructure (same token, same Web Bot Auth),
so the ethics/compliance posture is identical to /crawl. What's different
is control: we drive the browser instead of letting the high-level API
guess how to interact with each site.

Usage:
    from pipeline.scripted_crawler import scripted_crawl_domain
    result = scripted_crawl_domain("https://example.com", max_pages=3)
"""

from __future__ import annotations

import time
from dataclasses import asdict
from typing import Optional
from urllib.parse import urljoin, urlparse

from pipeline.content_analyzer import analyze_html, ContentAnalysis
from pipeline.site_crawler import (
    CrawledPage,
    DomainCrawlResult,
    _aggregate,
    _cloudflare_credentials,
)


# Common cookie/consent dismissal targets. Order matters — we try each
# and stop at the first success so we don't click through to unrelated
# buttons on sites that don't have a banner at all.
CONSENT_SELECTORS = [
    'button:has-text("Accept all")',
    'button:has-text("Accept All")',
    'button:has-text("Accept cookies")',
    'button:has-text("Accept")',
    'button:has-text("Allow all")',
    'button:has-text("Agree")',
    'button:has-text("I agree")',
    'button:has-text("Got it")',
    '[aria-label*="accept" i]',
    '[data-testid*="accept" i]',
    '[id*="accept-cookies" i]',
    'button[id*="consent" i]',
    'button[class*="accept" i]',
]

# Link patterns we prefer when discovering additional pages from the
# homepage. A rough proxy for "content-rich" vs. "login/checkout/legal".
PREFERRED_PATH_FRAGMENTS = [
    "/blog", "/docs", "/guide", "/resource", "/learn", "/academy",
    "/about", "/company", "/pricing", "/product", "/features",
    "/solutions", "/platform", "/case-stud", "/customer",
]
AVOID_PATH_FRAGMENTS = [
    "login", "signin", "signup", "register", "checkout", "cart",
    "terms", "privacy", "cookie", "contact", "support", "help-center",
    "careers", "jobs", "newsroom", "#", "javascript:", "mailto:",
]

PER_PAGE_TIMEOUT_MS = 30_000
SCROLL_ITERATIONS = 4
SCROLL_PAUSE_MS = 700


def _cf_ws_endpoint() -> Optional[str]:
    token, account_id = _cloudflare_credentials()
    if not (token and account_id):
        return None
    # keep_alive in ms — gives us room for multi-page sessions.
    return (
        f"wss://api.cloudflare.com/client/v4/accounts/{account_id}"
        f"/browser-rendering/devtools/browser?keep_alive=600000"
    )


def _dismiss_cookies(page) -> Optional[str]:
    """Try each known consent selector; return the one that worked, or None."""
    for sel in CONSENT_SELECTORS:
        try:
            element = page.locator(sel).first
            if element.is_visible(timeout=500):
                element.click(timeout=1500)
                page.wait_for_timeout(400)
                return sel
        except Exception:
            continue
    return None


def _lazy_scroll(page) -> None:
    """Scroll to the bottom a few times to trigger lazy-loaded content."""
    for _ in range(SCROLL_ITERATIONS):
        try:
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(SCROLL_PAUSE_MS)
        except Exception:
            break
    # Go back to top so a final screenshot / serialization sees a fresh viewport.
    try:
        page.evaluate("window.scrollTo(0, 0)")
    except Exception:
        pass


def _pick_followup_links(page, base_url: str, limit: int) -> list[str]:
    """
    From the currently-loaded homepage, pick `limit` content-rich follow-up URLs.
    Filters to same-origin, prefers /blog /docs /about, excludes auth/legal.
    """
    if limit <= 0:
        return []
    try:
        hrefs: list[str] = page.eval_on_selector_all(
            "a[href]",
            "(els) => els.map(e => e.getAttribute('href')).filter(Boolean)",
        )
    except Exception:
        return []

    base = urlparse(base_url)
    same_origin = []
    for href in hrefs:
        abs_url = urljoin(base_url, href)
        parsed = urlparse(abs_url)
        if parsed.scheme not in ("http", "https"):
            continue
        if parsed.netloc != base.netloc:
            continue
        path_lc = (parsed.path or "/").lower()
        if path_lc == "/" or path_lc == base.path:
            continue
        if any(f in path_lc for f in AVOID_PATH_FRAGMENTS):
            continue
        same_origin.append(abs_url.split("#")[0])

    # Prefer content-rich paths, dedupe, cap.
    scored = []
    for u in same_origin:
        path_lc = urlparse(u).path.lower()
        score = next(
            (i for i, frag in enumerate(PREFERRED_PATH_FRAGMENTS) if frag in path_lc),
            len(PREFERRED_PATH_FRAGMENTS),
        )
        scored.append((score, u))
    scored.sort()

    seen = set()
    ordered: list[str] = []
    for _, u in scored:
        if u in seen:
            continue
        seen.add(u)
        ordered.append(u)
        if len(ordered) >= limit:
            break
    return ordered


def _extract_page(page, url: str) -> CrawledPage:
    """Go to url, run the recipe, return a CrawledPage."""
    error: Optional[str] = None
    html: str = ""
    title: Optional[str] = None
    status_code = 0

    try:
        response = page.goto(url, wait_until="domcontentloaded", timeout=PER_PAGE_TIMEOUT_MS)
        status_code = response.status if response else 0
        # Give React/Vue/etc a beat to hydrate.
        try:
            page.wait_for_load_state("networkidle", timeout=6000)
        except Exception:
            pass
        _dismiss_cookies(page)
        _lazy_scroll(page)
        try:
            title = page.title() or None
        except Exception:
            pass
        html = page.content()
    except Exception as e:
        error = str(e)

    if html:
        analysis = analyze_html(html[:2_000_000], url=url)
        if not analysis.title and title:
            analysis.title = title
        return CrawledPage(
            url=url,
            status=status_code or 200,
            word_count=analysis.word_count,
            markdown_length=analysis.content_length,
            title=analysis.title,
            features=asdict(analysis),
            error=error,
        )

    blank = ContentAnalysis(url=url, fetch_error=error or "empty")
    return CrawledPage(
        url=url,
        status=status_code,
        word_count=0,
        markdown_length=0,
        title=title,
        features=asdict(blank),
        error=error or "empty",
    )


def scripted_crawl_domain(
    url: str,
    max_pages: int = 3,
) -> DomainCrawlResult:
    """
    Drive a remote Cloudflare browser via Playwright CDP to crawl a site.
    Loads the start URL, runs the consent/scroll recipe, discovers up to
    `max_pages - 1` same-origin content pages, visits each, and returns an
    aggregated feature vector.
    """
    start = time.time()

    if not urlparse(url).scheme:
        url = f"https://{url}"

    ws = _cf_ws_endpoint()
    token, _ = _cloudflare_credentials()
    if not ws:
        # No Cloudflare creds — surface a clear error. Scripted crawling
        # needs the remote browser; there's no sensible local fallback.
        return DomainCrawlResult(
            url=url,
            crawler="scripted",
            blocked=False,
            pages_found=0,
            pages_crawled=0,
            total_words=0,
            duration_ms=int((time.time() - start) * 1000),
            aggregate=_aggregate([]),
            pages=[],
            note="scripted crawler requires CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID",
            error="cloudflare credentials missing",
        )

    from playwright.sync_api import sync_playwright  # local import — heavy module

    pages_out: list[CrawledPage] = []
    error: Optional[str] = None
    note: Optional[str] = None

    try:
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(
                ws,
                headers={"Authorization": f"Bearer {token}"},
            )
            # CDP sessions come with a default context; reuse it so
            # consent-cookie state carries across the follow-up pages.
            context = browser.contexts[0] if browser.contexts else browser.new_context()
            page = context.pages[0] if context.pages else context.new_page()

            # 1. First page (homepage / starting URL)
            home = _extract_page(page, url)
            pages_out.append(home)

            # 2. Pick follow-up URLs and visit them
            followups: list[str] = []
            if home.word_count > 0 and max_pages > 1:
                try:
                    followups = _pick_followup_links(page, url, max_pages - 1)
                except Exception:
                    followups = []

            for follow in followups:
                pages_out.append(_extract_page(page, follow))

            try:
                browser.close()
            except Exception:
                pass

    except Exception as e:
        error = f"{type(e).__name__}: {e}"

    total_words = sum(p.word_count for p in pages_out)
    blocked = (
        not pages_out
        or (len(pages_out) == 1 and total_words == 0)
    )
    if blocked and not note:
        note = "scripted crawl produced no content — site may block rendering or require auth"

    return DomainCrawlResult(
        url=url,
        crawler="scripted",
        blocked=blocked,
        pages_found=len(pages_out),
        pages_crawled=sum(1 for p in pages_out if p.word_count > 0),
        total_words=total_words,
        duration_ms=int((time.time() - start) * 1000),
        aggregate=_aggregate(pages_out),
        pages=pages_out,
        note=note,
        error=error,
    )


# ── Integration hook for site_crawler.crawl_domain ─────────────────────────

def crawl_with_fallback(
    url: str,
    max_pages: int = 5,
    depth: int = 2,
    allow_scripted: bool = True,
) -> DomainCrawlResult:
    """
    Tiered crawl: try Cloudflare /crawl first; if it returns nothing useful,
    fall back to the scripted CDP browser. Used by the /crawl-domain
    endpoint when mode == "auto".
    """
    from pipeline.site_crawler import crawl_domain  # avoid circular import at module load

    first = crawl_domain(url, max_pages=max_pages, depth=depth)

    tier_one_empty = (
        first.pages_crawled == 0
        or first.total_words == 0
        or first.blocked
    )
    if not tier_one_empty or not allow_scripted:
        return first

    # Tier 2 fallback. Record the fact that tier 1 was tried first.
    second = scripted_crawl_domain(url, max_pages=max_pages)
    prior_note = first.note or f"tier1 produced {first.pages_crawled} pages / {first.total_words} words"
    second.note = f"fell back to scripted (tier 1: {prior_note})" + (
        f" — {second.note}" if second.note else ""
    )
    return second
