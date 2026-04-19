"""
POST /gap-analysis — the "what should I change" surface.

Pulls mention rates + content features for the target and its peers from
the in-memory feature store (populated by the last /collect) and, when
the store is empty, from fresh crawls. Ranks feature gaps by
(normalized magnitude × research-backed impact coefficient) so the user
gets a punch list ordered by likely payoff.

Effect sizes come from Aggarwal et al., KDD 2024 (GEO paper). They're
used only to rank gaps; we don't pass them off as forecasts.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from pipeline.site_crawler import crawl_domain
from pipeline.scripted_crawler import scripted_crawl_domain, crawl_with_fallback

from ._store import _store


router = APIRouter()


# ── Research priors (GEO paper, KDD 2024) ──────────────────────────────────

RESEARCH_IMPACT = {
    "citation_count":     {"coef": 0.30, "direction": "increase"},
    "statistics_density": {"coef": 0.37, "direction": "increase"},
    "statistics_count":   {"coef": 0.37, "direction": "increase"},
    "quotation_count":    {"coef": 0.41, "direction": "increase"},
    "readability_grade":  {"coef": 0.28, "direction": "decrease"},  # easier = better
    "freshness_days":     {"coef": 0.25, "direction": "decrease"},  # recent = better
    "content_length":     {"coef": 0.15, "direction": "increase"},
    "heading_count":      {"coef": 0.12, "direction": "increase"},
    "external_link_count":{"coef": 0.10, "direction": "increase"},
    "has_schema_org":     {"coef": 0.08, "direction": "increase"},
}

GAP_FEATURE_LABELS = {
    "citation_count":     "Citations",
    "statistics_density": "Statistics per 1K words",
    "statistics_count":   "Statistics (total)",
    "quotation_count":    "Quotations",
    "readability_grade":  "Readability grade",
    "freshness_days":     "Days since update",
    "content_length":     "Content length (chars)",
    "heading_count":      "Heading count (h1+h2+h3)",
    "external_link_count":"External links",
    "has_schema_org":     "Schema.org markup",
}


# ── Schemas ────────────────────────────────────────────────────────────────

class GapAnalysisRequest(BaseModel):
    target: str
    peers: list[str] = Field(default_factory=list)
    crawl_mode: str = Field(default="fast", pattern="^(fast|scripted|auto|none)$")
    max_pages: int = Field(default=3, ge=1, le=10)
    max_gaps: int = Field(default=8, ge=1, le=20)


# ── Helpers ────────────────────────────────────────────────────────────────

def _brand_mention_rate(brand: str) -> Optional[float]:
    for row in _store.get("features") or []:
        if row.get("brand", "").lower() == brand.lower():
            mr = row.get("mention_rate")
            if isinstance(mr, (int, float)):
                return float(mr)
    return None


def _brand_content_features(brand: str, crawl_mode: str, max_pages: int) -> dict:
    """Feature store first, crawl on-demand when numbers are all zero."""
    from pipeline.brand_domains import get_domain

    store_row = None
    for row in _store.get("features") or []:
        if row.get("brand", "").lower() == brand.lower():
            store_row = row
            break

    content_keys = list(GAP_FEATURE_LABELS.keys())

    def _zero_shape():
        return {k: 0.0 for k in content_keys}

    store_features = _zero_shape()
    store_has_signal = False
    if store_row:
        for k in content_keys:
            v = store_row.get(k, 0)
            if isinstance(v, bool):
                store_features[k] = 1.0 if v else 0.0
            elif isinstance(v, (int, float)):
                store_features[k] = float(v)
                if v != 0:
                    store_has_signal = True

    if store_has_signal and crawl_mode == "none":
        return {"source": "store", "features": store_features, "url": None}

    url = get_domain(brand)
    if not url or crawl_mode == "none":
        return {"source": "store", "features": store_features, "url": url}

    try:
        if crawl_mode == "scripted":
            result = scripted_crawl_domain(url, max_pages=max_pages)
        elif crawl_mode == "auto":
            result = crawl_with_fallback(url, max_pages=max_pages, depth=2)
        else:
            result = crawl_domain(url, max_pages=max_pages, depth=2)
    except Exception:
        return {"source": "store_fallback", "features": store_features, "url": url}

    agg = result.aggregate or {}
    out = _zero_shape()
    for k in content_keys:
        v = agg.get(k, 0)
        if isinstance(v, bool):
            out[k] = 1.0 if v else 0.0
        elif isinstance(v, (int, float)):
            out[k] = float(v)

    # Fall back to store values for any keys the crawler couldn't measure.
    for k in content_keys:
        if out[k] == 0 and store_features[k]:
            out[k] = store_features[k]

    return {
        "source": "crawl" if result.pages_crawled > 0 else "store_fallback",
        "features": out,
        "url": url,
        "crawler": result.crawler,
        "pages_crawled": result.pages_crawled,
        "blocked": result.blocked,
        "note": result.note,
    }


def _compute_gap(feature: str, user_val: float, peer_vals: list[float]) -> Optional[dict]:
    """
    One feature's gap. Returns None if no meaningful gap exists.
    Direction-aware: for "decrease" features the leader has the smaller value.
    """
    if not peer_vals:
        return None
    cfg = RESEARCH_IMPACT.get(feature, {"coef": 0.05, "direction": "increase"})
    direction = cfg["direction"]
    coef = cfg["coef"]

    if direction == "increase":
        leader_val = max(peer_vals)
        gap = leader_val - user_val
    else:
        leader_val = min(peer_vals)
        gap = user_val - leader_val

    if gap <= 0:
        return None

    peer_avg = sum(peer_vals) / len(peer_vals)
    scale = max(abs(leader_val), abs(user_val), 1.0)
    normalized = min(gap / scale, 1.0)
    impact_score = round(normalized * coef, 4)

    return {
        "feature": feature,
        "label": GAP_FEATURE_LABELS.get(feature, feature),
        "direction": direction,
        "user_value": round(user_val, 2),
        "leader_value": round(leader_val, 2),
        "peer_avg": round(peer_avg, 2),
        "gap": round(gap, 2),
        "impact_score": impact_score,
        "research_coef": coef,
    }


def _evidence_text(gap: dict, leader_brand: str, target_brand: str) -> str:
    if gap["direction"] == "increase":
        return (
            f"{leader_brand} has {gap['leader_value']:.0f} vs your {gap['user_value']:.0f}. "
            f"Research: brands with more {gap['label'].lower()} see up to "
            f"{int(gap['research_coef'] * 100)}% higher LLM citation rates."
        )
    return (
        f"{leader_brand} is at {gap['leader_value']:.0f} ({gap['label'].lower()}), "
        f"you're at {gap['user_value']:.0f}. Research: reducing {gap['label'].lower()} "
        f"improves citation rate by up to {int(gap['research_coef'] * 100)}%."
    )


# ── Endpoint ───────────────────────────────────────────────────────────────

@router.post("/gap-analysis")
def gap_analysis_endpoint(req: GapAnalysisRequest):
    """
    Compute the target's biggest content-feature gaps vs named peers and
    return them ranked by expected impact. Each gap has leader_brand,
    peer_avg, research_coef, per-peer values for the bar chart, and a
    one-sentence evidence string.
    """
    peers = [p for p in (req.peers or []) if p and p.lower() != req.target.lower()]

    target_data = _brand_content_features(req.target, req.crawl_mode, req.max_pages)
    peer_data = [
        {"brand": p, **_brand_content_features(p, req.crawl_mode, req.max_pages)}
        for p in peers
    ]

    target_mention = _brand_mention_rate(req.target)
    peer_mentions = [
        {"brand": p, "mention_rate": _brand_mention_rate(p) or 0.0}
        for p in peers
    ]

    ranked: list[dict] = []
    for feature in RESEARCH_IMPACT.keys():
        user_val = target_data["features"].get(feature, 0.0)
        peer_vals = [pd["features"].get(feature, 0.0) for pd in peer_data]
        # Drop all-zero peers except for features where zero is meaningful.
        peer_vals = [v for v in peer_vals if v != 0 or feature in ("readability_grade",)]
        if not peer_vals:
            continue
        gap = _compute_gap(feature, user_val, peer_vals)
        if not gap:
            continue
        direction = gap["direction"]
        leader_brand = None
        for pd in peer_data:
            v = pd["features"].get(feature, 0.0)
            if direction == "increase" and v == gap["leader_value"]:
                leader_brand = pd["brand"]; break
            if direction == "decrease" and v == gap["leader_value"]:
                leader_brand = pd["brand"]; break
        gap["leader_brand"] = leader_brand or "—"
        gap["evidence"] = _evidence_text(gap, gap["leader_brand"], req.target)
        gap["peer_values"] = [
            {"brand": pd["brand"], "value": round(pd["features"].get(feature, 0.0), 2)}
            for pd in peer_data
        ]
        ranked.append(gap)

    ranked.sort(key=lambda g: g["impact_score"], reverse=True)
    ranked = ranked[: req.max_gaps]

    return {
        "target": {
            "brand": req.target,
            "mention_rate": target_mention,
            "content_source": target_data.get("source"),
            "content_url": target_data.get("url"),
            "features": target_data["features"],
            "crawler": target_data.get("crawler"),
            "pages_crawled": target_data.get("pages_crawled"),
        },
        "peers": [
            {
                "brand": p["brand"],
                "mention_rate": next((m["mention_rate"] for m in peer_mentions if m["brand"] == p["brand"]), 0.0),
                "content_source": p.get("source"),
                "content_url": p.get("url"),
                "features": p["features"],
                "crawler": p.get("crawler"),
                "pages_crawled": p.get("pages_crawled"),
            }
            for p in peer_data
        ],
        "ranked_gaps": ranked,
        "crawl_mode": req.crawl_mode,
    }
