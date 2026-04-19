"""
Publish-ready blog templates — research-backed post formats a company can
ship as an alternative to (or alongside) patching existing pages.

Each template carries:
  - title       : working title with {brand} / {category} / {leader} slots
  - premise     : one-paragraph pitch for the post
  - outline     : ordered list of sections with word-count targets
  - evidence_tags: the research that backs this format's LLM-citation impact
  - effort_hours: realistic time to ship (aim < 8h; "easy to upload")
  - target_word_count
  - why_this_works: single-sentence rationale

The playbook filters templates by feature, fills slots from the gap data,
and returns 2-3 per gap.
"""

from __future__ import annotations

from typing import Optional


# ── Template catalog ───────────────────────────────────────────────────────
#
# Ordered intentionally: for each feature gap, the first entry is the
# lowest-effort / highest-leverage option.

TEMPLATES: list[dict] = [
    # ── citation_count ─────────────────────────────────────────────────
    {
        "id": "sources_review",
        "title": "The {n} most-cited sources in {category}: a {year} review",
        "premise": (
            "A citation-dense research review becomes a citation vehicle itself. "
            "Each source you annotate is a citation you add. LLMs trained on "
            "research literature preferentially surface this format."
        ),
        "why_this_works": (
            "Citations drive up to +30% LLM visibility per the GEO paper. "
            "Research-review posts multiply that by sheer citation count."
        ),
        "outline": [
            {"heading": "Intro — why citations matter for this category",   "wordcount": 200},
            {"heading": "Methodology — how we picked the N sources",         "wordcount": 200},
            {"heading": "The {n} sources (one H2 per source, each cited)",   "wordcount": 1600},
            {"heading": "What this means for practitioners",                  "wordcount": 400},
            {"heading": "FAQ — 6-8 buyer questions about the topic",          "wordcount": 400},
        ],
        "target_word_count": 2800,
        "effort_hours": 5,
        "evidence_tags": ["citation_count", "authority_amplification"],
        "applies_to": ["citation_count"],
    },
    {
        "id": "benchmark_post",
        "title": "{category} by the numbers: our {year} benchmark of {n_brands} brands",
        "premise": (
            "An original benchmark post becomes the primary source other "
            "sites cite. It's the single most effective asset for getting "
            "into LLM training data within 12 months."
        ),
        "why_this_works": (
            "Original data = unique citations. Brand mentions are 3x more "
            "predictive than backlinks (Digital Bloom 2025)."
        ),
        "outline": [
            {"heading": "TL;DR — the three headline findings",            "wordcount": 200},
            {"heading": "Methodology — sample, timeframe, limits",        "wordcount": 300},
            {"heading": "Finding 1 (with chart + citation)",              "wordcount": 500},
            {"heading": "Finding 2 (with chart + citation)",              "wordcount": 500},
            {"heading": "Finding 3 (with chart + citation)",              "wordcount": 500},
            {"heading": "How we'd act on this if we were the reader",     "wordcount": 400},
            {"heading": "Dataset download + full methodology",            "wordcount": 300},
        ],
        "target_word_count": 2700,
        "effort_hours": 8,
        "evidence_tags": ["citation_count", "statistics_count", "brand_building"],
        "applies_to": ["citation_count", "statistics_count", "statistics_density"],
    },

    # ── statistics_count / statistics_density ──────────────────────────
    {
        "id": "stats_roundup",
        "title": "The {n} stats that define {category} in {year}",
        "premise": (
            "A stat-dense roundup that doubles as a reference page. Every "
            "statistic comes with a named source — gives the post its own "
            "citation weight while raising your site-wide stat density."
        ),
        "why_this_works": (
            "Statistics drive up to +37% LLM visibility (GEO paper), "
            "strongest on opinion and comparison queries."
        ),
        "outline": [
            {"heading": "Intro — why this list, why now",                     "wordcount": 150},
            {"heading": "Market size + growth stats",                          "wordcount": 400},
            {"heading": "Buyer behavior stats",                                "wordcount": 400},
            {"heading": "Product / tooling adoption stats",                    "wordcount": 400},
            {"heading": "What's changed in the last 12 months",                "wordcount": 300},
            {"heading": "Sources — every stat linked to its origin",           "wordcount": 200},
        ],
        "target_word_count": 1850,
        "effort_hours": 4,
        "evidence_tags": ["statistics_count", "statistics_density", "citation_count"],
        "applies_to": ["statistics_count", "statistics_density"],
    },

    # ── quotation_count ─────────────────────────────────────────────────
    {
        "id": "expert_roundtable",
        "title": "{n} {category} experts on where the industry is heading",
        "premise": (
            "An expert roundtable — each voice a direct quote with name + "
            "title + company. Easy to publish: email 8 people two questions, "
            "compile the answers."
        ),
        "why_this_works": (
            "Quotations drive up to +41% LLM visibility — the single highest-"
            "lift intervention in the GEO paper. Works best for narrative and "
            "historical / forward-looking queries."
        ),
        "outline": [
            {"heading": "Intro — the two questions we asked",                 "wordcount": 200},
            {"heading": "Q1 — each expert's answer, attributed",               "wordcount": 800},
            {"heading": "Q2 — each expert's answer, attributed",               "wordcount": 800},
            {"heading": "Our take — patterns across the answers",              "wordcount": 300},
            {"heading": "Methodology + contributor bios",                      "wordcount": 200},
        ],
        "target_word_count": 2300,
        "effort_hours": 6,
        "evidence_tags": ["quotation_count", "expert_sourcing", "authority_amplification"],
        "applies_to": ["quotation_count"],
    },

    # ── readability_grade (plain language) ──────────────────────────────
    {
        "id": "plain_english_guide",
        "title": "{category}, explained plainly — a one-page guide",
        "premise": (
            "A deliberately short, plain-English explainer page. Short "
            "sentences, active voice, Flesch grade 8-10. Becomes the answer "
            "LLMs lift for 'what is X' queries."
        ),
        "why_this_works": (
            "Fluency Optimization contributed +15-30% visibility in the GEO "
            "paper, strongest for first-time buyer queries."
        ),
        "outline": [
            {"heading": "What is {category}? (1-sentence answer)",             "wordcount": 80},
            {"heading": "How it works — 3 steps, plain words",                 "wordcount": 300},
            {"heading": "Who it's for, who it's not",                          "wordcount": 200},
            {"heading": "Common misunderstandings",                            "wordcount": 300},
            {"heading": "When to use it vs. alternatives",                     "wordcount": 300},
        ],
        "target_word_count": 1180,
        "effort_hours": 3,
        "evidence_tags": ["readability_grade", "faq_strategy"],
        "applies_to": ["readability_grade"],
    },

    # ── freshness_days (cadence posts) ──────────────────────────────────
    {
        "id": "monthly_update",
        "title": "{month} {year}: what's new in {category}",
        "premise": (
            "A recurring monthly update post on a stable slug (e.g. "
            "/updates/{year}-{month}). Gets the whole domain into the "
            "freshness signal loop. Writes itself once the template is set."
        ),
        "why_this_works": (
            "65% of AI-bot crawls hit content <1 year old (Seer). 76.4% of "
            "top-cited pages were updated within 30 days. A monthly cadence "
            "owns that freshness window."
        ),
        "outline": [
            {"heading": "Headline shifts in {category} this month",           "wordcount": 400},
            {"heading": "Product / tooling releases worth knowing",            "wordcount": 300},
            {"heading": "Research + data we published this month",             "wordcount": 300},
            {"heading": "What we're watching next month",                      "wordcount": 200},
        ],
        "target_word_count": 1200,
        "effort_hours": 2,
        "evidence_tags": ["freshness_days", "timing"],
        "applies_to": ["freshness_days"],
    },

    # ── content_length ──────────────────────────────────────────────────
    {
        "id": "definitive_guide",
        "title": "The definitive guide to {category}",
        "premise": (
            "One long, canonical page that becomes the source-of-truth URL "
            "for your category. 5-10K words, H2 per concept, inline citations, "
            "FAQ at the bottom."
        ),
        "why_this_works": (
            "Longer content correlates with higher citation rates in Digital "
            "Bloom's 5000-URL study. FAQ sections add another 3.2x lift."
        ),
        "outline": [
            {"heading": "Introduction",                                       "wordcount": 400},
            {"heading": "History + context",                                  "wordcount": 600},
            {"heading": "Core concepts (H2 per concept, 5-8 sections)",       "wordcount": 2500},
            {"heading": "Tools / vendors + how to evaluate them",             "wordcount": 1000},
            {"heading": "Common pitfalls",                                    "wordcount": 600},
            {"heading": "FAQ — 10-15 buyer questions",                        "wordcount": 900},
            {"heading": "Further reading + sources",                          "wordcount": 300},
        ],
        "target_word_count": 6300,
        "effort_hours": 8,
        "evidence_tags": ["content_length", "has_schema_org", "citation_count"],
        "applies_to": ["content_length"],
    },

    # ── has_schema_org / FAQ ────────────────────────────────────────────
    {
        "id": "canonical_faq",
        "title": "FAQ: {n} questions buyers ask about {category}",
        "premise": (
            "A dedicated FAQ page with FAQPage JSON-LD schema. Answer each "
            "question in 2-4 sentences max. Drop the schema block in <head>."
        ),
        "why_this_works": (
            "FAQPage schema is cited 3.2x more than equivalent body content "
            "(Digital Bloom 2025). The single highest-ROI format change."
        ),
        "outline": [
            {"heading": "What is {category}? (most basic question first)",   "wordcount": 120},
            {"heading": "How does {category} compare to {alternative}?",      "wordcount": 160},
            {"heading": "How much does it cost?",                             "wordcount": 120},
            {"heading": "How quickly can I see results?",                     "wordcount": 120},
            {"heading": "What data / access do I need to provide?",           "wordcount": 120},
            {"heading": "6-8 more specific buyer questions",                  "wordcount": 900},
            {"heading": "FAQPage JSON-LD schema block",                       "wordcount": 0,
             "note": "generated inline, drop into <head>"},
        ],
        "target_word_count": 1540,
        "effort_hours": 3,
        "evidence_tags": ["has_schema_org", "faq_strategy", "content_length"],
        "applies_to": ["has_schema_org", "heading_count"],
    },

    # ── Fallback / generic ──────────────────────────────────────────────
    {
        "id": "comparison_page",
        "title": "{brand} vs {leader}: a detailed comparison",
        "premise": (
            "A head-to-head comparison page that captures 'alternative to X' "
            "intent queries. Every claim in the table carries a citation."
        ),
        "why_this_works": (
            "Comparison pages dominate alternative-intent queries and are "
            "heavy citation vehicles. GEO paper methodology shows listicles "
            "and tables rank higher on opinion queries."
        ),
        "outline": [
            {"heading": "TL;DR: when each tool wins",                          "wordcount": 200},
            {"heading": "Feature-by-feature comparison table",                 "wordcount": 600},
            {"heading": "Pricing comparison",                                   "wordcount": 300},
            {"heading": "When to pick {brand}",                                 "wordcount": 300},
            {"heading": "When to pick {leader}",                                "wordcount": 300},
            {"heading": "What reviewers say — G2, Capterra quotes",             "wordcount": 300},
            {"heading": "FAQ",                                                  "wordcount": 400},
        ],
        "target_word_count": 2400,
        "effort_hours": 4,
        "evidence_tags": ["citation_count", "quotation_count", "has_schema_org"],
        "applies_to": [
            "citation_count", "quotation_count", "content_length",
            "has_schema_org",
        ],
    },
]


def templates_for_feature(
    feature: str,
    limit: int = 3,
) -> list[dict]:
    """Return the templates tagged for this feature, in catalog order."""
    hits = [t for t in TEMPLATES if feature in t.get("applies_to", [])]
    # If nothing matches, fall back to the comparison page — always useful.
    if not hits:
        hits = [t for t in TEMPLATES if t["id"] == "comparison_page"]
    return hits[:limit]


def render_template(
    template: dict,
    *,
    brand: str,
    leader: Optional[str] = None,
    category: str = "your category",
    year: int = 2026,
    n: int = 12,
    n_brands: int = 50,
    month: str = "this month",
    alternative: Optional[str] = None,
) -> dict:
    """Fill the {slot} variables in title + outline for display."""
    ctx = {
        "brand": brand,
        "leader": leader or "the category leader",
        "category": category,
        "year": year,
        "n": n,
        "n_brands": n_brands,
        "month": month,
        "alternative": alternative or (leader or "alternatives"),
    }

    def _fill(s: str) -> str:
        try:
            return s.format(**ctx)
        except (KeyError, IndexError):
            return s

    return {
        "id": template["id"],
        "title": _fill(template["title"]),
        "premise": _fill(template["premise"]),
        "why_this_works": _fill(template["why_this_works"]),
        "outline": [
            {
                "heading": _fill(o["heading"]),
                "wordcount": o.get("wordcount", 0),
                "note": o.get("note"),
            }
            for o in template["outline"]
        ],
        "target_word_count": template["target_word_count"],
        "effort_hours": template["effort_hours"],
        "evidence_tags": template["evidence_tags"],
    }
