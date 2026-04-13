"""
Simulation routes — wired to pipeline engine + Convex persistence.

POST /api/simulations/collect      — collect from LLMs, persist to Convex, train model
POST /api/simulations/whatif       — XGBoost what-if prediction
POST /api/simulations/train        — retrain on ALL accumulated Convex data
GET  /api/simulations/status       — check data + model state
GET  /api/simulations/features     — current brand feature vectors
GET  /api/simulations/importance   — feature importance from trained model
GET  /api/simulations/recommendations — actionable GEO recommendations
"""

import asyncio
import time
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from pipeline.engine import (
    collect,
    extract_all,
    extract_all_per_model,
    merge_content_features,
    merge_content_features_for_brand,
    SurrogateModel,
    FEATURE_NAMES,
    CONTENT_FEATURE_NAMES,
)
from pipeline.content_analyzer import analyze_url, analyze_text, rate_features, compute_overall_score, generate_summary
from pipeline import convex_client as cx

router = APIRouter()

# ── In-memory model (trained on Convex data, served from RAM) ───────────────

_store: dict = {
    "features": [],
    "model": None,
    "config": None,
}

# ── Request / Response models ───────────────────────────────────────────────

class CollectRequest(BaseModel):
    target: str
    competitors: list[str]
    queries: list[str]
    website_url: Optional[str] = None
    models: list[str] = Field(default=["chatgpt", "claude", "gemini"])
    samples_per_query: int = Field(default=2, ge=1, le=5)
    # Engine improvements (all default off for backward compat)
    multi_generator_fanout: bool = False
    intent_fanout: bool = False
    cross_validate_extraction: bool = False
    cross_validate_rate: float = Field(default=0.5, ge=0, le=1)

class BrandResult(BaseModel):
    brand: str
    mention_rate: float
    avg_position: Optional[float]
    top1_rate: float
    top3_rate: float
    positive_rate: float
    negative_rate: float
    net_sentiment: float
    is_target: bool

class CollectResponse(BaseModel):
    total_observations: int
    total_calls: int
    brands: list[BrandResult]
    model_metrics: dict
    training_samples_total: int
    duration_seconds: float

class WhatIfRequest(BaseModel):
    brand: str
    changes: dict[str, float]
    model: Optional[str] = None  # if set, predict for one model; if None, predict all

class ContributionItem(BaseModel):
    feature: str
    contribution: float
    pct: float

class WhatIfResponse(BaseModel):
    brand: str
    base_prediction: float
    scenario_prediction: float
    lift: float
    lift_pct: float
    ci_lower: float
    ci_upper: float
    confidence: str
    contributions: list[ContributionItem]
    per_model: Optional[dict] = None  # {model_name: {lift, lift_pct, base, predicted}}

class StatusResponse(BaseModel):
    has_data: bool
    observation_count: int
    training_sample_count: int
    model_trained: bool
    model_r2: Optional[float]
    target: Optional[str]
    brands: list[str]
    feature_names: list[str]

class RecommendationItem(BaseModel):
    action: str
    feature: str
    current_value: float
    target_value: float
    predicted_lift: float
    effort: str
    tactics: list[str]

# ── Feature-to-action mapping ──────────────────────────────────────────────

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


def _clean_training_rows(samples: list[dict]) -> list[dict]:
    clean = []
    for sample in samples:
        row = {
            key: sample[key]
            for key in ["brand", "date", "mention_rate"] + FEATURE_NAMES + CONTENT_FEATURE_NAMES
            if key in sample
        }
        clean.append(row)
    return clean


def _latest_rows_by_brand(samples: list[dict]) -> list[dict]:
    latest: dict[str, dict] = {}
    for sample in sorted(samples, key=lambda s: (s.get("date", ""), s.get("brand", ""))):
        brand = sample.get("brand")
        if brand:
            latest[brand] = sample
    return list(latest.values())


def _content_metrics(analysis) -> dict[str, float | int | None]:
    return {
        "statistics_density": analysis.statistics_density,
        "quotation_count": analysis.quotation_count,
        "citation_count": analysis.citation_count,
        "content_length": analysis.content_length,
        "readability_grade": analysis.readability_grade,
        "freshness_days": analysis.freshness_days,
        "heading_count": analysis.h1_count + analysis.h2_count + analysis.h3_count,
    }

# ── Startup: load from Convex ──────────────────────────────────────────────

def _load_from_convex():
    """Load accumulated training data from Convex and train model."""
    try:
        samples = cx.get_all_training_samples()
        if not samples:
            print("  Convex: no training samples yet")
            return

        clean = _clean_training_rows(samples)
        latest = _latest_rows_by_brand(clean)
        has_content = any(CONTENT_FEATURE_NAMES[0] in s for s in clean)

        model = SurrogateModel(use_content_features=has_content)
        metrics = model.train(clean)
        _store["model"] = model
        _store["features"] = latest

        brands = list({s["brand"] for s in clean})
        print(f"  Convex: loaded {len(clean)} training samples, {len(brands)} brands, R2={metrics['r2']:.4f}")
    except Exception as e:
        print(f"  Convex load failed: {e}")


print("Loading from Convex...")
_load_from_convex()

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/collect", response_model=CollectResponse)
async def run_collection(req: CollectRequest):
    """
    Run real LLM API calls → persist to Convex → train model on ALL accumulated data.
    """
    start = time.time()
    today = date.today().isoformat()

    cx.add_log("collect", f"Starting collection for {req.target}", "pending")

    # 1. Collect from real LLM APIs
    observations, api_logs = collect(
        target=req.target,
        competitors=req.competitors,
        queries=req.queries,
        models=req.models,
        samples_per_query=req.samples_per_query,
        on_progress=lambda done, total, m, q: print(f"  [{done}/{total}] {m} | {q[:50]}"),
        multi_generator_fanout=req.multi_generator_fanout,
        intent_fanout=req.intent_fanout,
        cross_validate_extraction=req.cross_validate_extraction,
        cross_validate_rate=req.cross_validate_rate,
    )

    # 1b. Persist raw API logs to Convex
    log_records = []
    for log in api_logs:
        log_records.append({
            "date": today,
            "query": log["query"],
            "model": log["model"],
            "sample": log["sample"],
            "prompt_sent": log["prompt_sent"],
            "raw_response": (log.get("raw_response") or "")[:4000],  # cap at 4KB
            "parsed_brands": log.get("parsed"),
            "status": log["status"],
            "error": log.get("error"),
        })
    for i in range(0, len(log_records), 20):
        cx.store_api_logs(log_records[i:i + 20])

    cx.add_log("collect", f"Stored {len(api_logs)} API call logs", "success")

    # 2. Write raw observations to Convex
    mention_records = []
    for obs in observations:
        mention_records.append({
            "date": today,
            "brand": obs["brand"],
            "model": obs["model"],
            "query": obs["query"],
            "sample": obs["sample"],
            "mentioned": obs["mentioned"],
            "position": obs.get("position"),
            "sentiment": obs.get("sentiment"),
        })

    # Batch in groups of 50
    for i in range(0, len(mention_records), 50):
        batch = mention_records[i:i + 50]
        cx.store_mentions(batch)

    cx.add_log("collect", f"Stored {len(mention_records)} mention records", "success")

    # 3. Extract features for all brands
    all_brands = [req.target] + req.competitors
    rows = extract_all(observations, all_brands, req.models, req.queries)
    content_metrics = None
    if req.website_url:
        analysis = await asyncio.to_thread(analyze_url, req.website_url)
        if not analysis.fetch_error:
            content_metrics = _content_metrics(analysis)
            merge_content_features_for_brand(rows, req.target, content_metrics)
            cx.add_log("content", f"Analyzed content for {req.target}", "success", content_metrics)
        else:
            cx.add_log("content", f"Content analysis failed for {req.target}", "error", {"error": analysis.fetch_error})
            merge_content_features_for_brand(rows, req.target, None)
    else:
        merge_content_features_for_brand(rows, req.target, None)

    # 4. Write brand signals to Convex
    signal_records = []
    training_records = []
    for r in rows:
        signal = {"date": today, **{k: r[k] for k in ["brand", "mention_rate"] + FEATURE_NAMES + CONTENT_FEATURE_NAMES if k in r}}
        signal_records.append(signal)
        training_records.append(signal)

    cx.store_signals(signal_records)
    cx.store_training_samples(training_records)

    cx.add_log("features", f"Stored signals + training samples for {len(rows)} brands", "success")

    # 5. Train model on ALL accumulated Convex data (not just today)
    all_samples = cx.get_all_training_samples()
    clean_samples = _clean_training_rows(all_samples)

    # Check if any content features exist in the data
    has_content = any(CONTENT_FEATURE_NAMES[0] in s for s in clean_samples)

    model = SurrogateModel(use_content_features=has_content)
    metrics = model.train(clean_samples)

    # Train per-model surrogates from today's per-model observations only
    # (not mixed with aggregate history — that dilutes model-specific signal)
    per_model_rows: dict[str, list[dict]] = {}
    for model_name in req.models:
        today_pm = extract_all_per_model(observations, all_brands, [model_name], req.queries)
        today_rows = today_pm.get(model_name, [])

        # Content features: only apply to the TARGET brand, not competitors
        if content_metrics:
            for row in today_rows:
                if row.get("brand") == req.target:
                    for feat in CONTENT_FEATURE_NAMES:
                        row[feat] = content_metrics.get(feat, 0) or 0
                else:
                    for feat in CONTENT_FEATURE_NAMES:
                        row.setdefault(feat, 0)
        else:
            for row in today_rows:
                for feat in CONTENT_FEATURE_NAMES:
                    row.setdefault(feat, 0)

        per_model_rows[model_name] = today_rows

    per_model_metrics = model.train_per_model(per_model_rows)

    _store["model"] = model
    _store["features"] = rows  # current day's features for what-if
    _store["config"] = {
        "target": req.target,
        "competitors": req.competitors,
        "queries": req.queries,
        "models": req.models,
        "website_url": req.website_url,
    }

    # 6. Store training run metadata in Convex
    cx.store_training_run({
        "date": today,
        "r2_score": metrics["r2"],
        "rmse": metrics["rmse"],
        "mae": metrics.get("mae", 0),
        "num_samples": len(clean_samples),
        "feature_importance": metrics["importance"],
        "model_version": 1,
        "status": "success",
    })

    cx.add_log("train", f"Model trained on {len(clean_samples)} samples, R2={metrics['r2']:.4f}", "success")

    # Build response
    brands_out = []
    for r in rows:
        brands_out.append(BrandResult(
            brand=r["brand"],
            mention_rate=r["mention_rate"],
            avg_position=r["avg_position"],
            top1_rate=r["top1_rate"],
            top3_rate=r["top3_rate"],
            positive_rate=r["positive_rate"],
            negative_rate=r["negative_rate"],
            net_sentiment=r["net_sentiment"],
            is_target=(r["brand"] == req.target),
        ))
    brands_out.sort(key=lambda b: b.mention_rate, reverse=True)

    return CollectResponse(
        total_observations=len(observations),
        total_calls=len(api_logs),
        brands=brands_out,
        model_metrics=metrics,
        training_samples_total=len(clean_samples),
        duration_seconds=round(time.time() - start, 1),
    )


@router.post("/train")
async def retrain_model():
    """Retrain XGBoost on ALL accumulated Convex data."""
    samples = cx.get_all_training_samples()
    if not samples:
        raise HTTPException(status_code=400, detail="No training data in Convex.")

    clean = _clean_training_rows(samples)
    latest = _latest_rows_by_brand(clean)
    has_content = any(CONTENT_FEATURE_NAMES[0] in s for s in clean)

    model = SurrogateModel(use_content_features=has_content)
    metrics = model.train(clean)
    _store["model"] = model
    _store["features"] = latest

    today = date.today().isoformat()
    cx.store_training_run({
        "date": today,
        "r2_score": metrics["r2"],
        "rmse": metrics["rmse"],
        "mae": metrics.get("mae", 0),
        "num_samples": len(clean),
        "feature_importance": metrics["importance"],
        "model_version": 1,
        "status": "success",
    })

    return {"status": "trained", "samples": len(clean), "metrics": metrics}


@router.post("/whatif", response_model=WhatIfResponse)
async def run_whatif(req: WhatIfRequest):
    """Run what-if prediction using the trained XGBoost surrogate."""
    if not _store["model"]:
        raise HTTPException(status_code=400, detail="No model trained. Run /collect first.")

    brand_feats = None
    for r in _store["features"]:
        if r.get("brand") == req.brand:
            brand_feats = r
            break

    if not brand_feats:
        raise HTTPException(status_code=404, detail=f"Brand '{req.brand}' not found.")

    # Aggregate prediction
    result = _store["model"].whatif(brand_feats, req.changes, req.model)

    # Per-model predictions (if per-model surrogates exist)
    per_model = None
    if not req.model and _store["model"].per_model_models:
        pm_results = _store["model"].whatif_all_models(brand_feats, req.changes)
        per_model = {
            m: {"lift": r["lift"], "lift_pct": r["lift_pct"], "base": r["base_prediction"], "predicted": r["scenario_prediction"]}
            for m, r in pm_results.items()
        }

    return WhatIfResponse(
        brand=req.brand,
        base_prediction=result["base_prediction"],
        scenario_prediction=result["scenario_prediction"],
        lift=result["lift"],
        lift_pct=result["lift_pct"],
        ci_lower=result["ci_lower"],
        ci_upper=result["ci_upper"],
        confidence=result["confidence"],
        contributions=[
            ContributionItem(feature=c["feature"], contribution=round(c["contribution"], 2), pct=round(c["pct"], 1))
            for c in result["contributions"]
        ],
        per_model=per_model,
    )


@router.get("/status", response_model=StatusResponse)
async def get_status():
    """Check data + model state."""
    try:
        samples = cx.get_all_training_samples()
    except Exception:
        samples = []

    brands = list({s["brand"] for s in samples}) if samples else []
    target = _store["config"]["target"] if _store.get("config") else None

    try:
        from datetime import date
        today_mentions = cx.get_mentions_by_date(date.today().isoformat())
        obs_count = len(today_mentions)
    except Exception:
        obs_count = 0

    return StatusResponse(
        has_data=len(samples) > 0,
        observation_count=obs_count,
        training_sample_count=len(samples),
        model_trained=_store["model"] is not None,
        model_r2=_store["model"].r2 if _store["model"] else None,
        target=target,
        brands=brands,
        feature_names=FEATURE_NAMES + (CONTENT_FEATURE_NAMES if _store["model"] and _store["model"].use_content_features else []),
    )


@router.get("/features")
async def get_features():
    """Get current brand feature vectors."""
    if not _store["features"]:
        raise HTTPException(status_code=400, detail="No data. Run /collect first.")
    return {"features": _store["features"]}


@router.get("/importance")
async def get_importance():
    """Get feature importance from trained model."""
    if not _store["model"]:
        raise HTTPException(status_code=400, detail="No model. Run /collect first.")
    return {"importance": _store["model"].importance, "r2": _store["model"].r2}


@router.get("/logs")
async def get_api_logs(limit: int = 50):
    """Get recent raw API call logs (prompt sent, response received)."""
    try:
        logs = cx.get_recent_api_logs(limit)
        return {"logs": logs, "count": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations")
async def get_recommendations(brand: str):
    """Get ranked GEO recommendations for a brand."""
    if not _store["model"]:
        raise HTTPException(status_code=400, detail="No model trained.")

    brand_feats = None
    for r in _store["features"]:
        if r.get("brand") == brand:
            brand_feats = r
            break

    if not brand_feats:
        raise HTTPException(status_code=404, detail=f"Brand '{brand}' not found.")

    recommendations = []
    for feat, info in FEATURE_ACTIONS.items():
        if feat not in brand_feats:
            continue

        current = brand_feats[feat]
        target_val = info["target"]

        # Only recommend if there's room to improve
        # These features improve when the value goes DOWN (lower = better)
        improves_up = feat not in ("avg_position", "negative_rate", "model_spread", "brands_ahead", "readability_grade", "freshness_days")
        if improves_up and current >= target_val:
            continue
        if not improves_up and current <= target_val:
            continue

        # Predict lift from this change alone
        result = _store["model"].whatif(brand_feats, {feat: target_val})

        recommendations.append(RecommendationItem(
            action=info["action"],
            feature=feat,
            current_value=round(current, 1),
            target_value=target_val,
            predicted_lift=result["lift"],
            effort=info["effort"],
            tactics=info["tactics"],
        ))

    # Sort by predicted lift (biggest first)
    recommendations.sort(key=lambda r: abs(r.predicted_lift), reverse=True)

    return {"brand": brand, "recommendations": recommendations}


# ── Content Analysis ───────────────────────────────────────────────────────

class AnalyzeContentRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None

class ContentFeatureResponse(BaseModel):
    name: str
    label: str
    value: Optional[float | int | bool | str] = None
    geo_impact: str
    rating: str
    description: str

class AnalyzeContentResponse(BaseModel):
    url: Optional[str]
    title: Optional[str]
    features: list[ContentFeatureResponse]
    metrics: dict[str, float | int | None]
    summary: str
    content_length: int
    word_count: int
    overall_score: float
    fetch_error: Optional[str]

@router.post("/analyze-content", response_model=AnalyzeContentResponse)
async def analyze_content_endpoint(req: AnalyzeContentRequest):
    """Analyze a URL or raw text for GEO-relevant content features."""
    if not req.url and not req.text:
        raise HTTPException(status_code=400, detail="Provide either 'url' or 'text'.")

    if req.url:
        analysis = await asyncio.to_thread(analyze_url, req.url)
    else:
        analysis = analyze_text(req.text)

    if analysis.fetch_error:
        return AnalyzeContentResponse(
            url=analysis.url, title=None, features=[], metrics={}, summary=analysis.fetch_error,
            content_length=0, word_count=0, overall_score=0, fetch_error=analysis.fetch_error,
        )

    rated = rate_features(analysis)
    score = compute_overall_score(rated)
    summary = generate_summary(analysis, rated)

    features = [
        ContentFeatureResponse(
            name=f["name"], label=f["label"], value=f["value"],
            geo_impact=f["geo_impact"], rating=f["rating"], description=f["description"],
        )
        for f in rated
    ]

    return AnalyzeContentResponse(
        url=analysis.url, title=analysis.title, features=features, metrics=_content_metrics(analysis),
        summary=summary, content_length=analysis.content_length,
        word_count=analysis.word_count, overall_score=score, fetch_error=None,
    )
