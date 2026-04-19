"""
Time-series and aggregate analytics:

  GET /query-breakdown — per-query winners in recent collections
  GET /cited-sources   — domains that appear with a brand in LLM responses
  GET /trends          — mention-rate timeline for a brand
"""

from __future__ import annotations

import re
from datetime import date, timedelta
from urllib.parse import urlparse

from fastapi import APIRouter

from pipeline import convex_client as cx


router = APIRouter()


@router.get("/query-breakdown")
async def query_breakdown(days: int = 7):
    """Per-query breakdown: who wins each buyer query in recent collections."""
    all_mentions: list[dict] = []
    for i in range(days):
        d = (date.today() - timedelta(days=i)).isoformat()
        try:
            daily = cx.get_mentions_by_date(d)
            all_mentions.extend(daily)
        except Exception:
            continue

    if not all_mentions:
        return {"queries": [], "total_observations": 0}

    by_query: dict[str, list[dict]] = {}
    for m in all_mentions:
        q = m.get("query", "")
        by_query.setdefault(q, []).append(m)

    results = []
    for query, observations in by_query.items():
        by_brand: dict[str, list[dict]] = {}
        for obs in observations:
            by_brand.setdefault(obs["brand"], []).append(obs)

        brand_stats = []
        for brand, brand_obs in by_brand.items():
            mentioned = [o for o in brand_obs if o.get("mentioned")]
            if not brand_obs:
                continue

            mention_rate = len(mentioned) / len(brand_obs) * 100
            positions = [o["position"] for o in mentioned if o.get("position")]
            avg_pos = sum(positions) / len(positions) if positions else None

            per_model = {}
            for model_name in ["chatgpt", "claude", "gemini"]:
                m_obs = [o for o in brand_obs if o["model"] == model_name]
                m_mentioned = [o for o in m_obs if o.get("mentioned")]
                if m_obs:
                    per_model[model_name] = {
                        "rate": round(len(m_mentioned) / len(m_obs) * 100, 1),
                        "total": len(m_obs),
                    }

            brand_stats.append({
                "brand": brand,
                "mention_rate": round(mention_rate, 1),
                "avg_position": round(avg_pos, 1) if avg_pos else None,
                "samples": len(brand_obs),
                "per_model": per_model,
            })

        brand_stats.sort(key=lambda x: x["mention_rate"], reverse=True)
        winner = brand_stats[0]["brand"] if brand_stats else None

        results.append({
            "query": query,
            "winner": winner,
            "brands": brand_stats,
            "total_samples": len(observations),
        })

    results.sort(key=lambda x: x["total_samples"], reverse=True)

    return {
        "queries": results,
        "total_observations": len(all_mentions),
        "days_covered": days,
    }


@router.get("/cited-sources")
async def cited_sources(brand: str, days: int = 7):
    """Domains that appear in LLM responses when a given brand is cited."""
    url_pattern = re.compile(r'https?://[^\s\])\>"\']+')

    try:
        all_logs = cx.get_recent_api_logs(limit=500)
    except Exception:
        all_logs = []

    cutoff = (date.today() - timedelta(days=days)).isoformat()
    recent_logs = [log for log in all_logs if log.get("date", "") >= cutoff]

    domain_counts: dict[str, int] = {}
    total_mentioning = 0

    for log in recent_logs:
        parsed = log.get("parsed_brands")
        raw = log.get("raw_response") or ""

        brand_mentioned = False
        if parsed and isinstance(parsed, dict):
            for m in parsed.get("brands_mentioned", []):
                if isinstance(m, dict) and m.get("brand", "").lower() == brand.lower():
                    brand_mentioned = True
                    break
        if not brand_mentioned and brand.lower() in raw.lower():
            brand_mentioned = True

        if not brand_mentioned:
            continue

        total_mentioning += 1

        urls = url_pattern.findall(raw)
        seen_domains = set()
        for url in urls:
            try:
                domain = urlparse(url).netloc.lower().replace("www.", "")
                if domain and domain not in seen_domains:
                    seen_domains.add(domain)
                    domain_counts[domain] = domain_counts.get(domain, 0) + 1
            except Exception:
                continue

    sources = [
        {"domain": d, "count": c, "rate": round(c / total_mentioning * 100, 1) if total_mentioning else 0}
        for d, c in domain_counts.items()
    ]
    sources.sort(key=lambda x: x["count"], reverse=True)

    return {
        "brand": brand,
        "total_responses_mentioning": total_mentioning,
        "total_logs_checked": len(recent_logs),
        "sources": sources[:30],
        "days_covered": days,
    }


@router.get("/trends")
async def get_trends(brand: str, days: int = 30):
    """Mention rate timeline for a brand over the last N days."""
    try:
        signals = cx.get_signals_by_brand(brand, days=days)
    except Exception:
        signals = []

    by_date: dict[str, dict] = {}
    for s in signals:
        d = s.get("date", "")
        if d:
            by_date[d] = s

    timeline = []
    for d in sorted(by_date.keys()):
        s = by_date[d]
        timeline.append({
            "date": d,
            "mention_rate": s.get("mention_rate", 0),
            "avg_position": s.get("avg_position"),
            "net_sentiment": s.get("net_sentiment", 0),
            "top1_rate": s.get("top1_rate", 0),
        })

    return {
        "brand": brand,
        "timeline": timeline,
        "days_of_data": len(timeline),
    }
