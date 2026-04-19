"""
Playbook builder — given a gap, produce the five-section playbook:

  1. content_patch    — paste-ready paragraph (LLM-authored, evidence-footnoted)
  2. channels         — where the patch should be published + schema guidance
  3. amplification    — which authority domains to pitch, ranked by
                        competitor-co-citation gap from /cited-sources data
  4. content_pairing  — other pages/components the target is missing
  5. timing           — ship-by + refresh cadence with research backing

Each section entry carries an `evidence: list[dict]` — the claims the
recommendation rests on. Evidence comes from `pipeline/execute/evidence.py`.
"""

from __future__ import annotations

import os
from typing import Optional

from pipeline import convex_client as cx
from pipeline.engine import _get_openai, OPENAI_MODEL
from .evidence import EVIDENCE, find_evidence
from .blog_templates import templates_for_feature, render_template


# ── Channel defaults per gap type ──────────────────────────────────────────
#
# These are the "where does this content live" recommendations. Mostly
# deterministic — we don't need an LLM to tell you a FAQ belongs on a /faq
# page. Each channel spec knows which evidence tags back its choice.

_CHANNEL_DEFAULTS: dict[str, list[dict]] = {
    "citation_count": [
        {"kind": "primary",   "where": "Your /research or /benchmarks page (long-lived, authoritative tone)", "evidence_tags": ["citation_count", "freshness_days"]},
        {"kind": "secondary", "where": "A dated blog post this month (freshness layer)",                      "evidence_tags": ["freshness_days", "timing"]},
        {"kind": "schema",    "where": "Add schema.org ClaimReview or Article JSON-LD in <head>",             "evidence_tags": ["has_schema_org"]},
    ],
    "statistics_count": [
        {"kind": "primary",   "where": "Homepage hero + product pages (highest-traffic surfaces)",            "evidence_tags": ["statistics_count", "avg_position"]},
        {"kind": "secondary", "where": "FAQ page, one stat per answer (3.2× citation lift)",                  "evidence_tags": ["has_schema_org"]},
        {"kind": "schema",    "where": "FAQPage JSON-LD",                                                     "evidence_tags": ["has_schema_org"]},
    ],
    "statistics_density": [
        {"kind": "primary",   "where": "Rewrite the top 3 pages to add one stat per paragraph",              "evidence_tags": ["statistics_density", "statistics_count"]},
        {"kind": "secondary", "where": "Replace marketing adjectives (\"industry-leading\") with concrete numbers", "evidence_tags": ["anti_pattern"]},
    ],
    "quotation_count": [
        {"kind": "primary",   "where": "Quote a named industry analyst in your hero copy",                    "evidence_tags": ["quotation_count", "expert_sourcing"]},
        {"kind": "secondary", "where": "Customer testimonial block with full name + title + company",         "evidence_tags": ["quotation_count"]},
        {"kind": "amplify",   "where": "Pitch analysts to quote you — their quote becomes content you can re-embed", "evidence_tags": ["authority_amplification"]},
    ],
    "readability_grade": [
        {"kind": "primary",   "where": "Rewrite top 3 pages to ≤ 18-word sentences, active voice",            "evidence_tags": ["readability_grade"]},
        {"kind": "secondary", "where": "Replace jargon with plain language — run Flesch check at publish",    "evidence_tags": ["readability_grade"]},
    ],
    "freshness_days": [
        {"kind": "primary",   "where": "Add / update the 'Last updated' date on every content page",         "evidence_tags": ["freshness_days"]},
        {"kind": "secondary", "where": "Publish one new dated post per month on a stable category page",     "evidence_tags": ["timing"]},
        {"kind": "schema",    "where": "dateModified in Article schema JSON-LD",                              "evidence_tags": ["has_schema_org"]},
    ],
    "content_length": [
        {"kind": "primary",   "where": "Expand the top 3 pages to 5–10K characters with dedicated sections", "evidence_tags": ["content_length"]},
        {"kind": "secondary", "where": "Add a substantial FAQ at the bottom (3.2× citation lift)",           "evidence_tags": ["has_schema_org"]},
    ],
    "heading_count": [
        {"kind": "primary",   "where": "Break long pages into H2/H3 sections named after buyer questions",   "evidence_tags": ["heading_count", "has_schema_org"]},
    ],
    "has_schema_org": [
        {"kind": "primary",   "where": "Add Organization + Product + FAQPage JSON-LD to /<head>",            "evidence_tags": ["has_schema_org"]},
    ],
}


# ── Content pairing defaults ───────────────────────────────────────────────
#
# "What else you probably lack if you lack X" — these are the adjacent
# artifacts that make the patch actually land.

_PAIRING_DEFAULTS: dict[str, list[dict]] = {
    "citation_count": [
        {"what": "A dedicated /research or /benchmarks page",      "why": "Gives citations a permanent home and signals credibility for category-level queries."},
        {"what": "A 'Bitsy vs {leader}' comparison page",          "why": "Comparison pages dominate alternative-intent queries and are heavy citation vehicles."},
        {"what": "A FAQPage with 5–8 buyer questions answered",     "why": "FAQPage schema is cited 3.2× more than equivalent body content."},
    ],
    "statistics_count": [
        {"what": "A /benchmarks page with your own original numbers", "why": "Original stats generate inbound citations and get you into the citation graph."},
        {"what": "A FAQPage with one stat per answer",                "why": "Combines the FAQ schema lift with the statistics density lift."},
    ],
    "statistics_density": [
        {"what": "A benchmark / survey / case-study asset",            "why": "You need the raw numbers before you can sprinkle them across pages — build the dataset once, reuse everywhere."},
    ],
    "quotation_count": [
        {"what": "An expert advisory board / analyst relations doc",   "why": "Pre-built quote sources make future content drafts faster and consistently authoritative."},
    ],
    "freshness_days": [
        {"what": "A blog / newsroom / changelog with visible dates",   "why": "Dated content gives the whole domain a recency signal."},
    ],
    "has_schema_org": [
        {"what": "An Organization schema block on the homepage",       "why": "Baseline signal every LLM crawler looks for to disambiguate your brand."},
    ],
}


# ── Timing defaults ────────────────────────────────────────────────────────

_TIMING_DEFAULTS: dict[str, dict] = {
    "citation_count": {
        "ship_by": "this week",
        "refresh_cadence_days": 30,
        "rationale": "LLM crawlers reindex top-cited pages monthly. Ship now to get into the next indexing window.",
        "evidence_tags": ["timing", "freshness_days"],
    },
    "statistics_count": {
        "ship_by": "this week",
        "refresh_cadence_days": 30,
        "rationale": "Stats age fast — monthly refresh keeps the claim defensible.",
        "evidence_tags": ["timing", "freshness_days"],
    },
    "quotation_count": {
        "ship_by": "within 2 weeks (analyst outreach takes time)",
        "refresh_cadence_days": 90,
        "rationale": "Quotes are durable — refresh cadence is quarterly unless the analyst issues new commentary.",
        "evidence_tags": ["expert_sourcing"],
    },
    "freshness_days": {
        "ship_by": "today",
        "refresh_cadence_days": 30,
        "rationale": "65% of AI-bot crawls hit content <12 months old. 76.4% of top-cited pages were updated within 30 days.",
        "evidence_tags": ["freshness_days", "timing"],
    },
    "readability_grade": {
        "ship_by": "within 1 week",
        "refresh_cadence_days": 180,
        "rationale": "Structural rewrites only need periodic audit; cadence is every 6 months.",
        "evidence_tags": ["readability_grade"],
    },
}


_DEFAULT_TIMING = {
    "ship_by": "this week",
    "refresh_cadence_days": 30,
    "rationale": "Default cadence: ship now, refresh monthly. LLM crawlers reindex frequently and stale content decays fast.",
    "evidence_tags": ["timing", "freshness_days"],
}


# ── LLM-authored content patch ─────────────────────────────────────────────

def _generate_content_patch(
    brand: str,
    feature: str,
    leader_brand: Optional[str],
    user_value: float,
    leader_value: float,
    query: Optional[str],
) -> str:
    """
    Prompt an LLM to write a ≤100-word paste-ready paragraph addressing
    the gap. The paragraph must include at least one research citation
    (the GEO paper) and be in a tone that fits the brand's homepage.
    """
    if not os.getenv("OPENAI_API_KEY"):
        # Fallback text when LLM is not available — still useful, still cites.
        return (
            f"Generative Engine Optimization research (Aggarwal et al., KDD 2024) "
            f"shows that improving {feature.replace('_', ' ')} drives measurable "
            f"lift in LLM citation rates. In the Bitsy benchmark across 50 brands, "
            f"{leader_brand or 'top performers'} averaged {leader_value:.0f} while "
            f"{brand} is currently at {user_value:.0f}."
        )

    prompt = f"""You are writing a homepage paragraph for the brand "{brand}" to
close a measurable gap in LLM citation rate.

Constraints:
- ≤ 100 words
- Include exactly one citation to real research (use GEO paper, Aggarwal et al.,
  KDD 2024, or a named Bitsy benchmark fact)
- Include at least one concrete number
- No marketing adjectives like "industry-leading" or "world-class"
- Voice: confident but evidence-first, like an analyst
- Avoid first-person "we" — write in third person for credibility

Gap details:
- feature: {feature}
- {brand} current value: {user_value}
- {leader_brand or 'top peer'} value: {leader_value}
- buyer query this targets: {query or 'category-level queries'}

Output ONLY the paragraph, nothing else. No preamble, no quotes, no markdown.
""".strip()

    try:
        r = _get_openai().chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        text = (r.choices[0].message.content or "").strip()
        # Strip surrounding quotes if the model added them anyway.
        if text and text[0] in ('"', "'") and text[-1] == text[0]:
            text = text[1:-1].strip()
        return text
    except Exception as e:
        return (
            f"Research on LLM citation rates (Aggarwal et al., KDD 2024) shows "
            f"the '{feature.replace('_', ' ')}' gap is closeable. {brand} is at "
            f"{user_value:.0f}; {leader_brand or 'the leader'} is at {leader_value:.0f}. "
            f"[patch-generation error: {e}]"
        )


# ── Amplification (from /cited-sources data) ────────────────────────────────

def _cited_sources_for_brand(brand: str, days: int = 30) -> list[dict]:
    """
    Reuses the same logic as the /cited-sources endpoint: pull recent API
    logs, find ones where the brand was mentioned, extract URLs from the
    raw responses, dedupe by domain per response, aggregate counts.

    Factored out here because the endpoint itself doesn't expose a callable
    Python helper, and we don't want the playbook to hit the HTTP layer.
    """
    import re
    from datetime import date, timedelta
    from urllib.parse import urlparse

    url_pattern = re.compile(r'https?://[^\s\])\>"\']+')

    try:
        all_logs = cx.get_recent_api_logs(limit=500) or []
    except Exception:
        return []

    cutoff = (date.today() - timedelta(days=days)).isoformat()
    recent_logs = [log for log in all_logs if log.get("date", "") >= cutoff]

    brand_lc = brand.lower()
    domain_counts: dict[str, int] = {}

    for log in recent_logs:
        raw = log.get("raw_response") or ""
        parsed = log.get("parsed_brands")

        brand_mentioned = False
        if isinstance(parsed, dict):
            for m in parsed.get("brands_mentioned", []) or []:
                if isinstance(m, dict) and m.get("brand", "").lower() == brand_lc:
                    brand_mentioned = True
                    break
        if not brand_mentioned and brand_lc in raw.lower():
            brand_mentioned = True
        if not brand_mentioned:
            continue

        seen_domains: set[str] = set()
        for url in url_pattern.findall(raw):
            try:
                domain = urlparse(url).netloc.lower().replace("www.", "")
            except Exception:
                continue
            if not domain or domain in seen_domains:
                continue
            seen_domains.add(domain)
            domain_counts[domain] = domain_counts.get(domain, 0) + 1

    return [
        {"domain": d, "count": c}
        for d, c in sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)
    ]


def _build_amplification(
    target: str,
    peer_brands: list[str],
    limit: int = 5,
) -> list[dict]:
    """
    For each peer, find the domains cited alongside them. Rank by total
    competitor co-citation count, weighted down by target's own cite count.
    """
    target_sources = _cited_sources_for_brand(target, days=30)
    target_domains = {s["domain"]: s["count"] for s in target_sources}

    combined: dict[str, dict] = {}
    for peer in peer_brands:
        peer_sources = _cited_sources_for_brand(peer, days=30)
        for s in peer_sources:
            dom = s.get("domain")
            if not dom:
                continue
            slot = combined.setdefault(dom, {"domain": dom, "peers": {}, "total_peer_cites": 0})
            slot["peers"][peer] = int(s.get("count", 0) or 0)
            slot["total_peer_cites"] += int(s.get("count", 0) or 0)

    # Filter to domains where the target has a real gap
    rows = []
    for dom, slot in combined.items():
        target_count = target_domains.get(dom, 0)
        gap = slot["total_peer_cites"] - target_count
        if gap <= 0:
            continue
        rows.append({
            "domain": dom,
            "target_cite_count": target_count,
            "peer_cite_counts": slot["peers"],
            "total_peer_cites": slot["total_peer_cites"],
            "gap": gap,
            "pitch_angle": _pitch_angle_for(dom, slot["peers"]),
            "evidence": find_evidence("authority_amplification", "outreach", limit=2),
        })

    rows.sort(key=lambda r: r["gap"], reverse=True)
    return rows[:limit]


def _pitch_angle_for(domain: str, peer_cites: dict[str, int]) -> str:
    """Short pitch-angle string per domain. Pattern-based; specific enough to be useful."""
    top_peer = max(peer_cites.items(), key=lambda x: x[1])[0] if peer_cites else None
    d = domain.lower()
    if "g2.com" in d or "capterra" in d or "trustradius" in d:
        return f"Submit a category page / get reviews; {top_peer} uses this heavily."
    if "techcrunch" in d or "theverge" in d or "wired" in d:
        return f"Original data story — pitch a benchmark or survey. {top_peer} got coverage this way."
    if "reddit" in d:
        return f"Authentic participation in category subreddits; don't shill, contribute."
    if "producthunt" in d:
        return "Relaunch with a strong hook (new feature / benchmark / integration)."
    if "wikipedia" in d:
        return "Get notable third-party coverage first, then create / update the wiki entry."
    if "linkedin" in d or "medium" in d:
        return f"Thought-leadership post from a recognized voice; {top_peer} does this regularly."
    if "ycombinator" in d or "hackernews" in d:
        return "HN-appropriate technical content (not marketing); let it get organic upvotes."
    return f"Study the competitor content there — {top_peer} is cited by {peer_cites.get(top_peer, 0)} times in 30d."


# ── Main builder ───────────────────────────────────────────────────────────

def build_playbook(
    *,
    brand: str,
    feature: str,
    user_value: float,
    leader_value: float,
    leader_brand: Optional[str],
    peer_brands: list[str],
    query: Optional[str] = None,
    category: Optional[str] = None,
) -> dict:
    """
    Produce the six-section playbook. `feature` is a gap-analysis key
    like 'citation_count', 'quotation_count', etc.
    """

    content_patch_text = _generate_content_patch(
        brand=brand,
        feature=feature,
        leader_brand=leader_brand,
        user_value=user_value,
        leader_value=leader_value,
        query=query,
    )

    content_evidence = find_evidence(feature, "content_patch", limit=3)

    channels_spec = _CHANNEL_DEFAULTS.get(feature, [])
    channels = []
    for spec in channels_spec:
        channels.append({
            "kind": spec["kind"],
            "where": spec["where"].format(leader=leader_brand or "the leader"),
            "evidence": find_evidence(*spec["evidence_tags"], limit=2),
        })

    amplification = _build_amplification(brand, peer_brands, limit=5)

    pairing_spec = _PAIRING_DEFAULTS.get(feature, [])
    pairings = [
        {
            "what": p["what"].format(leader=leader_brand or "the leader"),
            "why": p["why"],
            "evidence": find_evidence(feature, "content_pairing", limit=2),
        }
        for p in pairing_spec
    ]

    timing_spec = _TIMING_DEFAULTS.get(feature, _DEFAULT_TIMING)
    timing = {
        "ship_by": timing_spec["ship_by"],
        "refresh_cadence_days": timing_spec["refresh_cadence_days"],
        "rationale": timing_spec["rationale"],
        "evidence": find_evidence(*timing_spec["evidence_tags"], limit=2),
    }

    # Blog templates a company can publish as a whole new post.
    # Each template is research-backed: evidence attached from the
    # same library as the other sections.
    blog_templates_spec = templates_for_feature(feature, limit=3)
    blog_templates = []
    for spec in blog_templates_spec:
        rendered = render_template(
            spec,
            brand=brand,
            leader=leader_brand,
            category=category or "your category",
        )
        rendered["evidence"] = find_evidence(*spec["evidence_tags"], limit=2)
        blog_templates.append(rendered)

    summary = (
        f"Gap: {feature.replace('_', ' ')} — you {user_value:.0f}, "
        f"{leader_brand or 'leader'} {leader_value:.0f}. "
        f"Ship the content patch to {channels[0]['where'].lower() if channels else 'your highest-traffic page'}, "
        f"then pursue {len(amplification)} amplification targets over "
        f"the next {timing['refresh_cadence_days']} days. "
        f"Alternative path: publish one of the {len(blog_templates)} "
        f"research-backed blog formats below."
    )

    return {
        "brand": brand,
        "feature": feature,
        "query": query,
        "user_value": user_value,
        "leader_value": leader_value,
        "leader_brand": leader_brand,
        "content_patch": {
            "text": content_patch_text,
            "char_count": len(content_patch_text),
            "evidence": content_evidence,
        },
        "channels": channels,
        "amplification": amplification,
        "content_pairing": pairings,
        "blog_templates": blog_templates,
        "timing": timing,
        "summary": summary,
        "evidence_library_size": len(EVIDENCE),
    }
