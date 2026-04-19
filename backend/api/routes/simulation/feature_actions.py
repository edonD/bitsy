"""
Recommendation catalog — one entry per surrogate feature the user can act on.

Used by /recommendations to rank actions by predicted lift from changing
the feature to its target value. Effort tiers and tactic lists are the
copy shown to the user.
"""

FEATURE_ACTIONS = {
    "positive_rate": {
        "action": "Improve brand sentiment",
        "target": 90,
        "effort": "medium",
        "tactics": [
            "Earn positive analyst coverage and reviews",
            "Publish customer success stories and case studies",
            "Address negative mentions proactively",
        ],
    },
    "avg_position": {
        "action": "Get cited earlier in AI responses",
        "target": 1.5,
        "effort": "high",
        "tactics": [
            "Add statistics and data points to key pages (GEO: +37%)",
            "Include expert quotations (GEO: +41%)",
            "Get listed on authoritative comparison sites",
        ],
    },
    "top1_rate": {
        "action": "Become the #1 recommendation",
        "target": 80,
        "effort": "high",
        "tactics": [
            "Dominate 'best of' lists in your category",
            "Build the definitive comparison page",
            "Earn top position on review aggregators",
        ],
    },
    "top3_rate": {
        "action": "Stay in the top-3 consistently",
        "target": 95,
        "effort": "medium",
        "tactics": [
            "Cover all major buyer question types",
            "Ensure content freshness (update within 30 days)",
            "Add structured data for easy extraction",
        ],
    },
    "net_sentiment": {
        "action": "Fix negative brand perception",
        "target": 80,
        "effort": "medium",
        "tactics": [
            "Respond to negative reviews publicly",
            "Publish transparency reports",
            "Address common criticism in your content",
        ],
    },
    "model_agreement": {
        "action": "Get all AI models to agree",
        "target": 100,
        "effort": "medium",
        "tactics": [
            "Ensure brand appears across diverse source types",
            "Get third-party mentions (6.5x more effective than owned)",
            "Build presence on sources each model favors",
        ],
    },
    "query_coverage": {
        "action": "Cover more buyer query types",
        "target": 100,
        "effort": "low",
        "tactics": [
            "Create FAQ pages for common questions",
            "Build comparison and alternative pages",
            "Target long-tail conversational queries",
        ],
    },
    "share_of_mentions": {
        "action": "Increase share of voice",
        "target": 25,
        "effort": "high",
        "tactics": [
            "Outpace competitors on content freshness",
            "Earn more third-party citations",
            "Expand into adjacent query categories",
        ],
    },
    "model_spread": {
        "action": "Reduce cross-model variance",
        "target": 5,
        "effort": "medium",
        "tactics": [
            "Diversify source types (blogs, reviews, directories)",
            "Ensure consistent brand messaging across channels",
            "Monitor which model is weakest and target its sources",
        ],
    },
    "negative_rate": {
        "action": "Eliminate negative mentions",
        "target": 2,
        "effort": "medium",
        "tactics": [
            "Audit what's causing negative AI sentiment",
            "Fix product issues mentioned in reviews",
            "Counter negative narratives with data",
        ],
    },
    # ── Content features (controllable by the user) ─────────────────────
    "statistics_density": {
        "action": "Add statistics and data points to your content",
        "target": 8.0,
        "effort": "low",
        "tactics": [
            "Include concrete numbers, percentages, and data-backed claims",
            "Add comparison metrics (X% faster, Y% cheaper)",
            "Reference industry benchmarks and research findings",
        ],
    },
    "quotation_count": {
        "action": "Add expert quotations to your content",
        "target": 4,
        "effort": "low",
        "tactics": [
            "Quote industry analysts or recognized experts",
            "Include customer testimonials with attribution",
            "Reference research papers with direct quotes",
        ],
    },
    "citation_count": {
        "action": "Cite credible external sources",
        "target": 6,
        "effort": "low",
        "tactics": [
            "Link to authoritative industry reports and studies",
            "Reference well-known publications (TechCrunch, Forbes, Nature)",
            "Add numbered references to academic papers",
        ],
    },
    "content_length": {
        "action": "Expand your content to 5-10K characters",
        "target": 7000,
        "effort": "medium",
        "tactics": [
            "Add detailed explanations for each product feature",
            "Include comparison sections with competitors",
            "Write FAQ sections addressing common buyer questions",
        ],
    },
    "readability_grade": {
        "action": "Improve content readability",
        "target": 10,
        "effort": "low",
        "tactics": [
            "Shorten sentences to 15-20 words average",
            "Use active voice instead of passive constructions",
            "Break complex paragraphs into bullet points",
        ],
    },
    "freshness_days": {
        "action": "Refresh your content (update within 30 days)",
        "target": 14,
        "effort": "low",
        "tactics": [
            "Update publication and modification dates",
            "Refresh statistics with the most recent data available",
            "Add recent developments, product updates, or news",
        ],
    },
    "heading_count": {
        "action": "Improve content structure with headings",
        "target": 8,
        "effort": "low",
        "tactics": [
            "Add H2 sections for each major topic",
            "Use H3 subsections for detailed breakdowns",
            "Structure content as scannable sections AI can extract",
        ],
    },
}
