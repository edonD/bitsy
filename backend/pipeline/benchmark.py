"""
Benchmark panel — stable corpus of public brands for daily collection.

This seeds the surrogate model with consistent time-series data so that:
- New users get predictions from day 1 (cold-start prior)
- Per-model surrogates accumulate real multi-day history
- Drift detection has a baseline to compare against
- The model learns temporal relationships (state_t -> mention_rate_t+1)

Run daily: python -m pipeline.benchmark
Cost: ~50 queries × 3 models × 2 samples = 300 API calls/day ≈ $0.05/day
"""

import hashlib

# ── Benchmark verticals ─────────────────────────────────────────────────────
# Each vertical: 5 brands (first = target) + 5 stable buyer questions.
# Total: 10 verticals × 5 brands × 5 queries = 50 brands, 50 queries.

BENCHMARK_VERTICALS = {
    "crm": {
        "target": "HubSpot",
        "competitors": ["Salesforce", "Pipedrive", "Zoho CRM", "Monday.com"],
        "queries": [
            "Best CRM for small business",
            "Top CRM software for sales teams",
            "Best free CRM tools",
            "CRM with best email integration",
            "Which CRM is easiest to set up",
        ],
    },
    "ecommerce_fashion": {
        "target": "Zalando",
        "competitors": ["ASOS", "H&M", "Zara", "Shein"],
        "queries": [
            "Best online fashion store in Europe",
            "Where to buy affordable designer clothes online",
            "Best sustainable fashion marketplace",
            "Online store with best return policy for clothes",
            "Best place to buy sneakers online",
        ],
    },
    "cloud_hosting": {
        "target": "Vercel",
        "competitors": ["Netlify", "AWS", "Cloudflare Pages", "Railway"],
        "queries": [
            "Best hosting for Next.js applications",
            "Which web hosting is fastest",
            "Best cloud hosting for developers",
            "Cheapest hosting for web apps",
            "Best serverless platform for startups",
        ],
    },
    "project_management": {
        "target": "Asana",
        "competitors": ["Monday.com", "ClickUp", "Notion", "Linear"],
        "queries": [
            "Best project management tool for remote teams",
            "Which project management software should I use",
            "Best free project management tools",
            "Project management tool with best integrations",
            "Best agile project management software",
        ],
    },
    "email_marketing": {
        "target": "Mailchimp",
        "competitors": ["ConvertKit", "ActiveCampaign", "Brevo", "Klaviyo"],
        "queries": [
            "Best email marketing platform for ecommerce",
            "Which email marketing tool has the best automation",
            "Cheapest email marketing software",
            "Best email marketing for small business",
            "Email marketing platform with best deliverability",
        ],
    },
    "analytics": {
        "target": "Google Analytics",
        "competitors": ["Mixpanel", "Amplitude", "PostHog", "Plausible"],
        "queries": [
            "Best web analytics tool for SaaS",
            "Google Analytics alternatives that respect privacy",
            "Best product analytics platform",
            "Which analytics tool is easiest to set up",
            "Best analytics for tracking user behavior",
        ],
    },
    "design_tools": {
        "target": "Figma",
        "competitors": ["Canva", "Adobe XD", "Sketch", "Framer"],
        "queries": [
            "Best design tool for UI/UX",
            "Figma alternatives for teams",
            "Best free design tool for startups",
            "Which design tool is best for collaboration",
            "Best prototyping tool for web design",
        ],
    },
    "cybersecurity": {
        "target": "CrowdStrike",
        "competitors": ["Palo Alto Networks", "SentinelOne", "Fortinet", "Zscaler"],
        "queries": [
            "Best endpoint security for enterprise",
            "Top cybersecurity platforms for businesses",
            "Best cloud security solution",
            "Which cybersecurity vendor is best for mid-market",
            "Best zero trust security platform",
        ],
    },
    "ai_coding": {
        "target": "GitHub Copilot",
        "competitors": ["Cursor", "Codeium", "Tabnine", "Amazon CodeWhisperer"],
        "queries": [
            "Best AI coding assistant",
            "GitHub Copilot alternatives",
            "Best free AI code completion tool",
            "Which AI coding tool is best for Python",
            "Best AI tool for writing tests",
        ],
    },
    "video_conferencing": {
        "target": "Zoom",
        "competitors": ["Google Meet", "Microsoft Teams", "Webex", "Around"],
        "queries": [
            "Best video conferencing software for business",
            "Zoom alternatives for remote teams",
            "Best free video calling platform",
            "Which video conferencing tool has best recording",
            "Best video call quality for large meetings",
        ],
    },
}

# ── Metadata ────────────────────────────────────────────────────────────────

# Current prompt version (hash of ORGANIC_PROMPT for tracking)
from pipeline.engine import ORGANIC_PROMPT
PROMPT_VERSION = hashlib.md5(ORGANIC_PROMPT.encode()).hexdigest()[:8]
EXTRACTION_VERSION = "v2_organic_twopass_crossval"

def get_all_brands() -> list[str]:
    """Get flat list of all benchmark brands."""
    brands = set()
    for v in BENCHMARK_VERTICALS.values():
        brands.add(v["target"])
        brands.update(v["competitors"])
    return sorted(brands)

def get_all_queries() -> list[str]:
    """Get flat list of all unique benchmark queries."""
    queries = set()
    for v in BENCHMARK_VERTICALS.values():
        queries.update(v["queries"])
    return sorted(queries)

def get_vertical_for_brand(brand: str) -> str | None:
    """Find which vertical a brand belongs to."""
    for name, v in BENCHMARK_VERTICALS.items():
        if brand == v["target"] or brand in v["competitors"]:
            return name
    return None


# ── Daily job ───────────────────────────────────────────────────────────────

def run_daily_benchmark(
    verticals: list[str] | None = None,
    models: list[str] = ["chatgpt", "claude", "gemini"],
    samples_per_query: int = 2,
    on_progress=None,
) -> dict:
    """
    Run the full daily benchmark panel.

    For each vertical: collect → store mentions → extract features → store signals.
    After all verticals: retrain surrogate on full Convex corpus.

    Returns summary dict with stats.
    """
    from datetime import date
    from pipeline.engine import collect, extract_all, SurrogateModel, FEATURE_NAMES, CONTENT_FEATURE_NAMES
    from pipeline import convex_client as cx

    today = date.today().isoformat()
    selected = verticals or list(BENCHMARK_VERTICALS.keys())

    total_observations = 0
    total_api_calls = 0
    verticals_done = 0

    cx.add_log("benchmark", f"Starting daily benchmark: {len(selected)} verticals", "pending", {
        "date": today,
        "prompt_version": PROMPT_VERSION,
        "extraction_version": EXTRACTION_VERSION,
        "verticals": selected,
    })

    for vertical_name in selected:
        vertical = BENCHMARK_VERTICALS.get(vertical_name)
        if not vertical:
            continue

        target = vertical["target"]
        competitors = vertical["competitors"]
        queries = vertical["queries"]
        all_brands = [target] + competitors

        if on_progress:
            on_progress(f"[{verticals_done+1}/{len(selected)}] {vertical_name}: {target} vs {len(competitors)} competitors")

        # Collect — NO fan-out for benchmark (stable query set for consistent time-series)
        observations, api_logs = collect(
            target=target,
            competitors=competitors,
            queries=queries,
            models=models,
            samples_per_query=samples_per_query,
            fan_out=False,
            multi_generator_fanout=False,
            intent_fanout=False,
            cross_validate_extraction=False,
        )

        # Store mentions
        mention_records = [{
            "date": today,
            "brand": o["brand"],
            "model": o["model"],
            "query": o["query"],
            "sample": o["sample"],
            "mentioned": o["mentioned"],
            "position": o.get("position"),
            "sentiment": o.get("sentiment"),
        } for o in observations]

        for i in range(0, len(mention_records), 50):
            cx.store_mentions(mention_records[i:i + 50])

        # Store API logs
        log_records = [{
            "date": today,
            "query": log["query"],
            "model": log["model"],
            "sample": log["sample"],
            "prompt_sent": log["prompt_sent"],
            "raw_response": (log.get("raw_response") or "")[:4000],
            "parsed_brands": log.get("parsed"),
            "status": log["status"],
            "error": log.get("error"),
        } for log in api_logs]
        for i in range(0, len(log_records), 20):
            cx.store_api_logs(log_records[i:i + 20])

        # Extract features
        rows = extract_all(observations, all_brands, models, queries)

        # Store signals + training samples
        training = [{"date": today, **{k: r[k] for k in ["brand", "mention_rate"] + FEATURE_NAMES}} for r in rows]
        # Add content feature defaults (benchmark doesn't crawl websites)
        for t in training:
            for feat in CONTENT_FEATURE_NAMES:
                t.setdefault(feat, 0)

        cx.store_signals(training)
        cx.store_training_samples(training)

        total_observations += len(observations)
        total_api_calls += len(api_logs)
        verticals_done += 1

    # Retrain on full corpus
    if on_progress:
        on_progress("Retraining model on full corpus...")

    all_samples = cx.get_all_training_samples()
    clean = []
    for s in all_samples:
        row = {k: s[k] for k in ["brand", "mention_rate"] + FEATURE_NAMES + CONTENT_FEATURE_NAMES if k in s}
        for feat in CONTENT_FEATURE_NAMES:
            row.setdefault(feat, 0)
        clean.append(row)

    has_content = any(s.get(CONTENT_FEATURE_NAMES[0], 0) > 0 for s in clean)
    model = SurrogateModel(use_content_features=has_content)
    metrics = model.train(clean)

    cx.store_training_run({
        "date": today,
        "r2_score": metrics["r2"],
        "rmse": metrics["rmse"],
        "mae": 0.0,
        "num_samples": len(clean),
        "feature_importance": metrics["importance"],
        "model_version": 1,
        "status": "success",
    })

    summary = {
        "date": today,
        "verticals": verticals_done,
        "total_observations": total_observations,
        "total_api_calls": total_api_calls,
        "training_samples": len(clean),
        "model_r2": metrics["r2"],
        "model_rmse": metrics["rmse"],
        "prompt_version": PROMPT_VERSION,
    }

    cx.add_log("benchmark", f"Daily benchmark complete: {verticals_done} verticals, {len(clean)} samples, R2={metrics['r2']:.4f}", "success", summary)

    return summary


# ── CLI entry point ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")

    from dotenv import load_dotenv
    from pathlib import Path
    load_dotenv(Path(__file__).resolve().parent.parent.parent / "site" / ".env.local")

    print("=" * 60)
    print("BITSY DAILY BENCHMARK")
    print("=" * 60)
    print(f"Verticals: {len(BENCHMARK_VERTICALS)}")
    print(f"Brands: {len(get_all_brands())}")
    print(f"Queries: {len(get_all_queries())}")
    print(f"Prompt version: {PROMPT_VERSION}")
    print()

    result = run_daily_benchmark(
        on_progress=lambda msg: print(f"  {msg}"),
    )

    print()
    print("=" * 60)
    print("RESULTS")
    print("=" * 60)
    for k, v in result.items():
        print(f"  {k}: {v}")
