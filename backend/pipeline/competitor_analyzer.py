"""
Competitor analysis — crawls competitor websites and computes gap analysis.

Extends content_analyzer to compare multiple brands side-by-side.
This is what turns abstract recommendations ("add statistics") into concrete
ones ("Salesforce has 14 statistics per 1K words, you have 0 — that's the gap").
"""

from typing import Optional
from dataclasses import dataclass, asdict

from pipeline.content_analyzer import analyze_url, ContentAnalysis


@dataclass
class BrandContentProfile:
    brand: str
    url: Optional[str]
    analysis: Optional[dict]  # ContentAnalysis.to_dict() or None
    error: Optional[str]


@dataclass
class FeatureGap:
    feature: str
    label: str
    target_value: float
    competitor_avg: float
    competitor_max: float
    leader_brand: str  # which competitor has the best value
    leader_value: float
    gap: float  # positive = target behind, negative = target ahead
    gap_direction: str  # "behind" | "ahead" | "even"
    priority: str  # "high" | "medium" | "low"


# Features worth comparing across competitors
COMPARABLE_FEATURES = [
    ("statistics_density", "Statistics per 1K words", "higher"),
    ("quotation_count", "Expert quotations", "higher"),
    ("citation_count", "External citations", "higher"),
    ("external_link_count", "External links", "higher"),
    ("content_length", "Content length (chars)", "higher"),  # up to 10K sweet spot
    ("word_count", "Word count", "higher"),
    ("technical_term_density", "Technical terms per 1K words", "higher"),
    ("h2_count", "H2 headings", "higher"),
    ("h3_count", "H3 headings", "higher"),
    ("readability_grade", "Readability grade", "lower"),  # lower = more readable
    ("freshness_days", "Days since update", "lower"),  # lower = fresher
    ("avg_sentence_length", "Avg sentence length", "lower"),  # lower = more readable
]


def crawl_all(brands: list[dict]) -> list[BrandContentProfile]:
    """
    Crawl all brand websites in sequence.
    brands: [{"brand": "Salesforce", "url": "https://salesforce.com"}, ...]
    Returns list of BrandContentProfile.
    """
    profiles = []
    for b in brands:
        brand_name = b.get("brand", "")
        url = b.get("url")

        if not url:
            profiles.append(BrandContentProfile(
                brand=brand_name, url=None, analysis=None,
                error="No URL provided",
            ))
            continue

        analysis = analyze_url(url, timeout=10)
        if analysis.fetch_error:
            profiles.append(BrandContentProfile(
                brand=brand_name, url=url, analysis=None,
                error=analysis.fetch_error,
            ))
        else:
            profiles.append(BrandContentProfile(
                brand=brand_name, url=url,
                analysis=analysis.to_dict(), error=None,
            ))

    return profiles


def compute_gaps(
    target: BrandContentProfile,
    competitors: list[BrandContentProfile],
) -> list[FeatureGap]:
    """Compute per-feature gap between target and competitors."""
    if not target.analysis:
        return []

    successful_comps = [c for c in competitors if c.analysis]
    if not successful_comps:
        return []

    gaps = []
    for feat_key, label, direction in COMPARABLE_FEATURES:
        target_val = target.analysis.get(feat_key)
        if target_val is None:
            continue

        comp_vals = []
        leader_brand = ""
        leader_val = target_val

        for c in successful_comps:
            v = c.analysis.get(feat_key) if c.analysis else None
            if v is not None:
                comp_vals.append(v)
                if direction == "higher" and v > leader_val:
                    leader_val = v
                    leader_brand = c.brand
                elif direction == "lower" and 0 < v < leader_val:
                    leader_val = v
                    leader_brand = c.brand

        if not comp_vals:
            continue

        comp_avg = sum(comp_vals) / len(comp_vals)
        comp_max = max(comp_vals) if direction == "higher" else min(v for v in comp_vals if v > 0) if any(v > 0 for v in comp_vals) else 0

        # Gap: how far target is behind the leader
        if direction == "higher":
            gap = leader_val - target_val
            if gap > 0:
                gap_direction = "behind"
            elif gap < 0:
                gap_direction = "ahead"
            else:
                gap_direction = "even"
        else:
            # "lower" features (readability_grade, freshness_days)
            if target_val == 0 and leader_val == 0:
                gap = 0
                gap_direction = "even"
            elif target_val == 0:
                gap = -leader_val  # target has no data, inconclusive
                gap_direction = "unknown"
            elif leader_val == 0:
                gap = target_val  # no competitor has data
                gap_direction = "unknown"
            else:
                gap = target_val - leader_val
                if gap > 0:
                    gap_direction = "behind"
                elif gap < 0:
                    gap_direction = "ahead"
                else:
                    gap_direction = "even"

        # Priority: how significant is the gap?
        relative_gap = abs(gap) / max(1, leader_val) if leader_val else 0
        if relative_gap > 0.5 or (target_val == 0 and leader_val > 0):
            priority = "high"
        elif relative_gap > 0.2:
            priority = "medium"
        else:
            priority = "low"

        if not leader_brand:
            leader_brand = successful_comps[0].brand
            leader_val = comp_vals[0]

        gaps.append(FeatureGap(
            feature=feat_key,
            label=label,
            target_value=round(float(target_val), 2),
            competitor_avg=round(float(comp_avg), 2),
            competitor_max=round(float(comp_max), 2),
            leader_brand=leader_brand,
            leader_value=round(float(leader_val), 2),
            gap=round(float(gap), 2),
            gap_direction=gap_direction,
            priority=priority,
        ))

    # Sort: high priority behind-gaps first
    gaps.sort(key=lambda g: (
        0 if g.gap_direction == "behind" and g.priority == "high" else
        1 if g.gap_direction == "behind" and g.priority == "medium" else
        2 if g.gap_direction == "behind" else
        3
    ))

    return gaps


def build_specific_recommendations(
    target: BrandContentProfile,
    competitors: list[BrandContentProfile],
    gaps: list[FeatureGap],
) -> list[dict]:
    """Build specific, named recommendations grounded in competitor data."""
    recommendations = []

    # Take top 5 gaps where target is "behind" with "high" priority
    top_gaps = [g for g in gaps if g.gap_direction == "behind" and g.priority in ("high", "medium")][:5]

    for gap in top_gaps:
        action = _action_for_feature(gap)
        if action:
            recommendations.append({
                "feature": gap.feature,
                "label": gap.label,
                "action": action["headline"],
                "detail": action["detail"].format(
                    target=target.brand,
                    leader=gap.leader_brand,
                    leader_value=gap.leader_value,
                    target_value=gap.target_value,
                    gap=abs(gap.gap),
                ),
                "evidence": action["evidence"],
                "effort": action["effort"],
                "priority": gap.priority,
                "gap": gap.gap,
                "leader_brand": gap.leader_brand,
                "leader_value": gap.leader_value,
                "target_value": gap.target_value,
            })

    return recommendations


def _action_for_feature(gap: FeatureGap) -> dict | None:
    """Map a feature gap to a specific action."""
    mapping = {
        "statistics_density": {
            "headline": "Add statistics and data points",
            "detail": "{leader} has {leader_value} statistics per 1K words. You have {target_value}. Add specific numbers, percentages, and data-backed claims — aim to match or exceed {leader}'s density.",
            "evidence": "GEO paper (KDD 2024): +37% visibility from Statistics Addition",
            "effort": "low",
        },
        "quotation_count": {
            "headline": "Add expert quotations",
            "detail": "{leader} has {leader_value} quotations. You have {target_value}. Quote industry analysts, customers, or recognized experts. Attribution matters — link to the source.",
            "evidence": "GEO paper: +41% visibility from Quotation Addition (highest single-strategy lift)",
            "effort": "medium",
        },
        "citation_count": {
            "headline": "Cite credible external sources",
            "detail": "{leader} cites {leader_value} external sources. You cite {target_value}. Link to authoritative reports (Gartner, Forrester, Nature), not just your own content.",
            "evidence": "GEO paper: +30% visibility (up to +115% for lower-ranked sites)",
            "effort": "low",
        },
        "external_link_count": {
            "headline": "Link out to authoritative sources",
            "detail": "{leader} has {leader_value} external links. You have {target_value}. AI models treat sites that reference credible external sources as more trustworthy.",
            "evidence": "Profound 680M citation study: source diversity = strongest predictor",
            "effort": "low",
        },
        "content_length": {
            "headline": "Expand your content",
            "detail": "{leader}'s page has {leader_value} characters. Yours has {target_value}. The sweet spot is 5,000–10,000 chars — add context, examples, and use cases.",
            "evidence": "Profound 680M study: 5-10K chars = biggest citation lift",
            "effort": "medium",
        },
        "word_count": {
            "headline": "Expand your content",
            "detail": "{leader}'s page has {leader_value} words. Yours has {target_value}. Add context, examples, FAQs, and comparison sections.",
            "evidence": "Profound: pages of 800-1,500 words have highest citation rate",
            "effort": "medium",
        },
        "technical_term_density": {
            "headline": "Use domain-specific terminology",
            "detail": "{leader}'s content uses {leader_value} technical terms per 1K words. Yours uses {target_value}. Using appropriate jargon signals authority and relevance.",
            "evidence": "GEO paper: +18% visibility from Technical Terms",
            "effort": "low",
        },
        "h2_count": {
            "headline": "Structure content with clear headings",
            "detail": "{leader}'s page has {leader_value} H2 sections. Yours has {target_value}. AI models extract information section-by-section — more structure = easier citation.",
            "evidence": "Structured content is easier for RAG retrieval",
            "effort": "low",
        },
        "h3_count": {
            "headline": "Add subheadings for scannability",
            "detail": "{leader} uses {leader_value} H3 subsections. You use {target_value}. Break content into scannable chunks with specific topic headers.",
            "evidence": "Structured content signals quality to retrievers",
            "effort": "low",
        },
        "readability_grade": {
            "headline": "Simplify your writing",
            "detail": "Your readability grade is {target_value} — higher means more complex. {leader} reads at grade {leader_value}. Shorten sentences, use active voice, avoid jargon walls.",
            "evidence": "GEO paper: +28% visibility from Fluency Optimization",
            "effort": "medium",
        },
        "freshness_days": {
            "headline": "Update your content",
            "detail": "Your page is {target_value} days old. {leader}'s is {leader_value} days old. AI models citing this topic strongly favor fresh content.",
            "evidence": "Seer: 76.4% of top-cited pages updated within 30 days. Ahrefs: AI-cited content is 25.7% fresher than organic.",
            "effort": "low",
        },
        "avg_sentence_length": {
            "headline": "Shorten your sentences",
            "detail": "Your avg sentence is {target_value} words. {leader} averages {leader_value}. Aim for 15-20 word sentences — shorter is easier to extract.",
            "evidence": "Fluency optimization: +28% visibility (GEO paper)",
            "effort": "medium",
        },
    }

    return mapping.get(gap.feature)


# Per-model guidance — what each LLM actually prefers
MODEL_GUIDANCE = {
    "chatgpt": {
        "label": "ChatGPT (GPT-4o)",
        "knowledge_mix": "79% parametric (training data), 21% web search",
        "prefers": "Well-established brands with strong Wikipedia presence and broad mentions in training data.",
        "actions": [
            "Earn Wikipedia mentions and third-party editorial coverage",
            "Build authority through long-form content with clear structure",
            "Changes take weeks/months to show up (parametric knowledge updates slowly)",
        ],
    },
    "claude": {
        "label": "Claude (Sonnet)",
        "knowledge_mix": "Heavy user-generated content weighting",
        "prefers": "Brands with strong Reddit, review site, and community presence. 2-4x more likely to cite user-generated sources than other models.",
        "actions": [
            "Engage in relevant subreddits and forums authentically",
            "Ensure positive reviews on G2, Capterra, TrustPilot",
            "Quote customers and community members in your content",
        ],
    },
    "gemini": {
        "label": "Gemini (2.5 Flash)",
        "knowledge_mix": "Strong E-E-A-T signals, official source preference",
        "prefers": "Brands with authoritative official sources, Google-indexed content, schema markup.",
        "actions": [
            "Strengthen your Google Knowledge Graph entry",
            "Add schema.org structured data to your pages",
            "Build backlinks from high-authority domains",
        ],
    },
}
