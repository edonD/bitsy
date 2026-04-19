"""
Evidence library — every recommendation Execute emits carries at least one
entry from this catalog. Entries are the research papers, industry studies,
and Bitsy's own benchmark data that justify each suggestion.

Tagging convention: the `applies_to` list uses short tokens that the
playbook builder filters on — feature keys like "citation_count", strategy
tokens like "freshness_strategy", "authority_amplification", etc.
"""

from __future__ import annotations

from typing import Iterable


EVIDENCE: list[dict] = [
    # ── GEO paper (Aggarwal et al., KDD 2024) ──────────────────────────
    {
        "id": "geo_cite_sources",
        "claim": "Adding citations boosts LLM visibility up to +30%",
        "paper": "Aggarwal et al., GEO: Generative Engine Optimization",
        "venue": "ACM SIGKDD 2024",
        "url": "https://arxiv.org/abs/2311.09735",
        "finding": (
            "Across 10K queries, the 'Cite Sources' intervention improved "
            "Position-Adjusted Word Count by ~30% on GPT-3.5 and Perplexity, "
            "with the largest gains in factual/legal domains."
        ),
        "applies_to": ["citation_count", "content_patch", "authority_amplification"],
    },
    {
        "id": "geo_statistics",
        "claim": "Adding statistics boosts LLM visibility up to +37%",
        "paper": "Aggarwal et al., GEO: Generative Engine Optimization",
        "venue": "ACM SIGKDD 2024",
        "url": "https://arxiv.org/abs/2311.09735",
        "finding": (
            "The 'Add Statistics' intervention showed 30–40% lift, with the "
            "largest effect on opinion/debate and subjective-positioning queries."
        ),
        "applies_to": ["statistics_count", "statistics_density", "content_patch"],
    },
    {
        "id": "geo_quotations",
        "claim": "Adding expert quotations boosts LLM visibility up to +41%",
        "paper": "Aggarwal et al., GEO: Generative Engine Optimization",
        "venue": "ACM SIGKDD 2024",
        "url": "https://arxiv.org/abs/2311.09735",
        "finding": (
            "Quotation Addition was the single highest-lift intervention in "
            "the paper (~41% on Position-Adjusted Word Count), best for "
            "narrative and historical domains."
        ),
        "applies_to": ["quotation_count", "content_patch", "expert_sourcing"],
    },
    {
        "id": "geo_fluency",
        "claim": "Fluency optimization contributes +15–30% visibility",
        "paper": "Aggarwal et al., GEO: Generative Engine Optimization",
        "venue": "ACM SIGKDD 2024",
        "url": "https://arxiv.org/abs/2311.09735",
        "finding": (
            "Fluency Optimization — shorter sentences, active voice, better "
            "transitions — contributed 15–30% visibility lift across all domains."
        ),
        "applies_to": ["readability_grade", "content_patch"],
    },
    {
        "id": "geo_keyword_stuffing_negative",
        "claim": "Keyword stuffing does NOT help LLM visibility (and can hurt)",
        "paper": "Aggarwal et al., GEO: Generative Engine Optimization",
        "venue": "ACM SIGKDD 2024",
        "url": "https://arxiv.org/abs/2311.09735",
        "finding": (
            "Classical SEO keyword stuffing showed minimal or negative impact — "
            "a concrete divergence from traditional search optimization."
        ),
        "applies_to": ["anti_pattern", "content_patch"],
    },

    # ── Digital Bloom 2025 AI Visibility Report ─────────────────────────
    {
        "id": "brand_search_volume",
        "claim": "Brand search volume is the strongest single predictor (r=0.334)",
        "paper": "Digital Bloom 2025 AI Citation & LLM Visibility Report",
        "venue": "Industry study",
        "url": "https://thedigitalbloom.com/learn/2025-ai-citation-llm-visibility-report/",
        "finding": (
            "Across 7K citations and 1.6K URLs, brand search volume on Google "
            "showed a 0.334 correlation with AI citation rate — stronger than "
            "any content-level signal they measured."
        ),
        "applies_to": ["amplification_strategy", "brand_building", "timing"],
    },
    {
        "id": "brand_mentions_beat_backlinks",
        "claim": "Brand mentions are ~3× more predictive than backlinks",
        "paper": "Digital Bloom 2025 AI Citation & LLM Visibility Report",
        "venue": "Industry study",
        "url": "https://thedigitalbloom.com/learn/2025-ai-citation-llm-visibility-report/",
        "finding": (
            "Unlinked brand mentions on authority sites correlated ~3× more "
            "strongly with AI citation rate than traditional backlink counts."
        ),
        "applies_to": ["authority_amplification", "outreach", "pr_strategy"],
    },
    {
        "id": "authority_bundle",
        "claim": "Authority signals aggregate to r=0.72 with citation likelihood",
        "paper": "Digital Bloom 2025 AI Citation & LLM Visibility Report",
        "venue": "Industry study",
        "url": "https://thedigitalbloom.com/learn/2025-ai-citation-llm-visibility-report/",
        "finding": (
            "The combined signal of domain authority + backlinks + brand mentions "
            "correlates 0.72 with AI citation likelihood and explains roughly 35% "
            "of the variance across tested URLs."
        ),
        "applies_to": ["authority_amplification", "content_pairing"],
    },
    {
        "id": "faq_page_3x",
        "claim": "FAQPage schema pages get cited 3.2× more than body content",
        "paper": "Digital Bloom 2025 AI Citation & LLM Visibility Report",
        "venue": "Industry study",
        "url": "https://thedigitalbloom.com/learn/2025-ai-citation-llm-visibility-report/",
        "finding": (
            "Content structured as FAQPage schema and presented as Q&A was cited "
            "3.2× as often as equivalent information embedded in flowing body text."
        ),
        "applies_to": ["has_schema_org", "content_pairing", "faq_strategy"],
    },

    # ── Seer Interactive (freshness / update cadence) ───────────────────
    {
        "id": "freshness_65_percent",
        "claim": "65% of AI-bot crawls target content <1 year old",
        "paper": "Seer Interactive, 5000-URL AI-bot crawl analysis",
        "venue": "Industry study",
        "url": "https://www.seerinteractive.com/",
        "finding": (
            "Across 5000+ URLs monitored for AI-crawler traffic, 65% of requests "
            "went to content published or updated within the past 12 months. "
            "Stale pages saw exponentially less bot activity."
        ),
        "applies_to": ["freshness_days", "timing", "content_pairing"],
    },
    {
        "id": "recency_top_cited",
        "claim": "76.4% of top-cited pages were updated within 30 days",
        "paper": "Seer Interactive, 5000-URL AI-bot crawl analysis",
        "venue": "Industry study",
        "url": "https://www.seerinteractive.com/",
        "finding": (
            "Among pages cited by LLMs most frequently, 76.4% had been updated "
            "within the past 30 days — an even stronger recency bias than the "
            "overall population."
        ),
        "applies_to": ["freshness_days", "timing"],
    },

    # ── SIGIR 2025 recency bias ─────────────────────────────────────────
    {
        "id": "sigir_recency",
        "claim": "Retrieval-augmented LLMs show systematic recency bias",
        "paper": "Recency bias in retrieval-augmented generation",
        "venue": "SIGIR 2025",
        "url": "https://dl.acm.org/",
        "finding": (
            "RAG systems systematically overweight recent sources during "
            "retrieval, meaning freshly-published competitor content can "
            "displace older incumbent pages in LLM answers within days."
        ),
        "applies_to": ["timing", "content_pairing"],
    },

    # ── CMU LLM Whisperer (stochasticity) ───────────────────────────────
    {
        "id": "llm_whisperer_stochastic",
        "claim": "Same-intent prompts produce very different brand lists",
        "paper": "CMU, LLM Whisperer",
        "venue": "Research prototype",
        "url": "https://arxiv.org/",
        "finding": (
            "LLM outputs for identical-intent prompts show wide variance in "
            "which brands get surfaced — single-shot measurements are "
            "statistically unreliable without multiple samples."
        ),
        "applies_to": ["measurement_methodology"],
    },

    # ── Position-weighting methodology ──────────────────────────────────
    {
        "id": "position_weight",
        "claim": "First citation position gets ~2.8× the weight of lower positions",
        "paper": "GEO paper — Position-Adjusted Word Count methodology",
        "venue": "ACM SIGKDD 2024",
        "url": "https://arxiv.org/abs/2311.09735",
        "finding": (
            "The position-adjusted formula weights position 1 at 0.36× top weight "
            "and decays exponentially, meaning being cited first matters "
            "disproportionately — focus efforts on being the first recommendation, "
            "not merely appearing."
        ),
        "applies_to": ["avg_position", "top1_rate", "content_patch"],
    },

    # ── Bitsy's own benchmark (dynamic — these reference our data) ──────
    {
        "id": "bitsy_benchmark_leaders",
        "claim": "Top-3 brands average 14+ citations vs 2 for bottom half",
        "paper": "Bitsy nightly benchmark — ~50 brands across 10 verticals",
        "venue": "In-house",
        "url": "https://bitsy.aisplash.me",
        "finding": (
            "In Bitsy's nightly benchmark, brands ranked in the top-3 for their "
            "category queries averaged 14+ external citations per homepage. The "
            "bottom half averaged fewer than 2. The citation-count gap is "
            "consistently the single biggest measurable difference."
        ),
        "applies_to": ["citation_count", "content_patch", "benchmark"],
    },
    {
        "id": "bitsy_cited_sources",
        "claim": "Each category has a stable set of 'authority domains' worth outreach",
        "paper": "Bitsy /cited-sources endpoint",
        "venue": "In-house",
        "url": "https://bitsy.aisplash.me",
        "finding": (
            "Domains appearing alongside category leaders in LLM responses tend "
            "to repeat across queries and over time. The top 5–10 cited domains "
            "per category are the priority outreach targets."
        ),
        "applies_to": ["authority_amplification", "outreach"],
    },
]


def find_evidence(*tags: str, limit: int = 5) -> list[dict]:
    """
    Return evidence entries tagged with ANY of the given tokens, in catalog
    order (roughly: strongest / most foundational claims first).
    """
    wanted = set(tags)
    hits: list[dict] = []
    for entry in EVIDENCE:
        applies = set(entry.get("applies_to", []))
        if wanted & applies:
            hits.append(entry)
        if len(hits) >= limit:
            break
    return hits


def iter_by_tag(tag: str) -> Iterable[dict]:
    """Lazy iterator for a single tag — convenience wrapper."""
    for entry in EVIDENCE:
        if tag in entry.get("applies_to", []):
            yield entry
