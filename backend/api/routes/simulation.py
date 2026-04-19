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
import threading
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
    LAG_FEATURE_NAME,
    SURROGATE_XGB_PARAMS,
    summarize_training_rows,
)
from pipeline.content_analyzer import analyze_url, analyze_text, rate_features, compute_overall_score, generate_summary
from pipeline.site_crawler import crawl_domain, result_to_dict, _cloudflare_available
from pipeline.scripted_crawler import scripted_crawl_domain, crawl_with_fallback
from pipeline import convex_client as cx

router = APIRouter()

# ── In-memory model (trained on Convex data, served from RAM) ───────────────

_store: dict = {
    "features": [],
    "model": None,
    "config": None,
    "api_logs": [],
    "per_model_metrics": {},
}

_api_log_lock = threading.Lock()


def _remember_api_log(log: dict) -> None:
    created_at = int(time.time() * 1000)
    entry = {
        "_id": f"live-{created_at}-{log['model']}-{log['sample']}-{log.get('mode', 'memory')}",
        "_creationTime": created_at,
        "createdAt": created_at,
        **log,
    }
    with _api_log_lock:
        logs = _store.setdefault("api_logs", [])
        logs.append(entry)
        if len(logs) > 500:
            del logs[:-500]

# ── Request / Response models ───────────────────────────────────────────────

class CollectRequest(BaseModel):
    target: str
    competitors: list[str]
    queries: list[str]
    website_url: Optional[str] = None
    models: list[str] = Field(default=["chatgpt", "claude", "gemini"])
    samples_per_query: int = Field(default=2, ge=1, le=5)
    # Engine improvements (all default off for backward compat)
    fan_out: bool = True  # paraphrase fan-out (2 queries -> 9 queries)
    # Mode toggles — memory = trained knowledge only, search = web tools on
    enable_memory: bool = True
    enable_search: bool = False
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
    per_model: Optional[dict] = None
    # Confidence gates
    data_days: int = 0
    confidence_tier: str = "benchmark"  # "benchmark" | "emerging" | "established"

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


def _safe_latest_training_run() -> dict | None:
    try:
        return cx.get_latest_training_run()
    except Exception:
        return None

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
        _store["per_model_metrics"] = {}

        brands = list({s["brand"] for s in clean})
        print(f"  Convex: loaded {len(clean)} training samples, {len(brands)} brands, R2={metrics['r2']:.4f}")
    except Exception as e:
        print(f"  Convex load failed: {e}")


print("Loading from Convex...")
_load_from_convex()

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/collect", response_model=CollectResponse)
def run_collection(req: CollectRequest):
    """
    Run real LLM API calls → persist to Convex → train model on ALL accumulated data.
    """
    start = time.time()
    today = date.today().isoformat()
    with _api_log_lock:
        _store["api_logs"] = []

    cx.add_log("collect", f"Starting collection for {req.target}", "pending")

    # Stream each log to Convex immediately so the trace page can poll /logs
    # and show live progress instead of waiting for the full run to finish.
    def _store_log_live(log: dict) -> None:
        rich_log = {
            "date": today,
            "query": log["query"],
            "model": log["model"],
            "sample": log["sample"],
            "mode": log.get("mode") or "memory",
            "prompt_sent": log["prompt_sent"],
            "raw_response": log.get("raw_response") or "",
            "parsed_brands": log.get("parsed"),
            "sources": log.get("sources") or [],
            "status": log["status"],
            "error": log.get("error"),
            "latency_ms": log.get("latency_ms"),
            "parser_status": log.get("parser_status"),
            "parse_strategy": log.get("parse_strategy"),
            "search_used": log.get("search_used"),
            "tool_trace": log.get("tool_trace"),
            "tracked_brands": log.get("tracked_brands") or [],
        }
        _remember_api_log(rich_log)
        try:
            cx.store_api_logs([{
                "date": today,
                "query": log["query"],
                "model": log["model"],
                "sample": log["sample"],
                "mode": log.get("mode") or "memory",
                "prompt_sent": log["prompt_sent"],
                "raw_response": (log.get("raw_response") or "")[:4000],
                "parsed_brands": log.get("parsed"),
                "sources": log.get("sources") or [],
                "status": log["status"],
                "error": log.get("error"),
            }])
        except Exception as e:
            print(f"  WARN: failed to store log: {e}")

    # 1. Collect from real LLM APIs
    observations, api_logs = collect(
        target=req.target,
        competitors=req.competitors,
        queries=req.queries,
        models=req.models,
        samples_per_query=req.samples_per_query,
        fan_out=req.fan_out,
        on_progress=lambda done, total, m, q: print(f"  [{done}/{total}] {m} | {q[:50]}"),
        on_log_complete=_store_log_live,
        enable_memory=req.enable_memory,
        enable_search=req.enable_search,
        multi_generator_fanout=req.multi_generator_fanout,
        intent_fanout=req.intent_fanout,
        cross_validate_extraction=req.cross_validate_extraction,
        cross_validate_rate=req.cross_validate_rate,
    )

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
        analysis = analyze_url(req.website_url)
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
    _store["per_model_metrics"] = per_model_metrics
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
        mention_rate = r["mention_rate"]
        avg_position = r["avg_position"] if mention_rate > 0 and r["avg_position"] is not None else 0
        brands_out.append(BrandResult(
            brand=r["brand"],
            mention_rate=mention_rate,
            avg_position=avg_position,
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
def retrain_model():
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
    _store["per_model_metrics"] = {}

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
def run_whatif(req: WhatIfRequest):
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

    # Compute confidence tier based on how much data exists for this brand
    try:
        brand_signals = cx.get_signals_by_brand(req.brand, days=90)
        unique_dates = {s.get("date") for s in brand_signals}
        data_days = len(unique_dates)
    except Exception:
        data_days = 0

    if data_days >= 21:
        confidence_tier = "established"
    elif data_days >= 7:
        confidence_tier = "emerging"
    else:
        confidence_tier = "benchmark"

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
        data_days=data_days,
        confidence_tier=confidence_tier,
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


@router.get("/model-diagnostics")
async def get_model_diagnostics():
    """Explain how the current surrogate is trained and how trustworthy it is."""
    try:
        samples = cx.get_all_training_samples()
    except Exception:
        samples = []

    clean_samples = _clean_training_rows(samples)
    summary = summarize_training_rows(clean_samples)
    model = _store.get("model")
    latest_run = _safe_latest_training_run()
    per_model_metrics = _store.get("per_model_metrics", {})

    metrics = None
    active_feature_names: list[str] = []
    base_feature_names = FEATURE_NAMES.copy()
    if model and model.use_content_features:
        base_feature_names = base_feature_names + CONTENT_FEATURE_NAMES

    if model:
        active_feature_names = list(model.feature_cols)
        metrics = {
            "rmse": model.rmse,
            "mae": model.mae,
            "r2": model.r2,
            "interval_radius": model.interval_radius,
            "training_mode": model.training_mode,
            "validation_mode": model.validation_mode,
            "lag_feature_enabled": LAG_FEATURE_NAME in model.feature_cols,
            "target_column": (
                "target_mention_rate"
                if model.training_mode == "next_period_forecast"
                else "mention_rate"
            ),
        }

    return {
        "model_trained": model is not None,
        "training_sample_count": summary["sample_count"],
        "brand_count": summary["brand_count"],
        "unique_dates": summary["unique_dates"],
        "date_start": summary["date_start"],
        "date_end": summary["date_end"],
        "latest_row_count": summary["latest_row_count"],
        "duplicate_brand_date_rows": summary["duplicate_brand_date_rows"],
        "temporal_pair_count": summary["temporal_pair_count"],
        "rows_by_date": summary["rows_by_date"],
        "top_brands_by_rows": summary["top_brands_by_rows"],
        "mention_rate_summary": summary["mention_rate_summary"],
        "brand_row_summary": summary["brand_row_summary"],
        "use_content_features": bool(model.use_content_features) if model else False,
        "feature_count": len(active_feature_names) if active_feature_names else len(base_feature_names),
        "base_feature_names": base_feature_names,
        "active_feature_names": active_feature_names,
        "xgb_params": SURROGATE_XGB_PARAMS,
        "metrics": metrics,
        "importance": (
            [{"feature": feature, "importance": score} for feature, score in model.importance.items()]
            if model
            else []
        ),
        "per_model_metrics": per_model_metrics,
        "latest_training_run": latest_run,
        "config": _store.get("config"),
    }


@router.get("/logs")
async def get_api_logs(limit: int = 50):
    """Get recent raw API call logs (prompt sent, response received)."""
    try:
        with _api_log_lock:
            live_logs = list(_store.get("api_logs", []))
        if live_logs:
            live_logs.sort(key=lambda l: l.get("_creationTime", 0), reverse=True)
            logs = live_logs[:limit]
        else:
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
def analyze_content_endpoint(req: AnalyzeContentRequest):
    """Analyze a URL or raw text for GEO-relevant content features."""
    if not req.url and not req.text:
        raise HTTPException(status_code=400, detail="Provide either 'url' or 'text'.")

    if req.url:
        analysis = analyze_url(req.url)
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


# ── Benchmark ──────────────────────────────────────────────────────────────

@router.post("/benchmark/run")
def run_benchmark(verticals: list[str] | None = None):
    """Trigger a benchmark panel run (admin only)."""
    from pipeline.benchmark import run_daily_benchmark

    result = run_daily_benchmark(
        verticals=verticals,
        on_progress=lambda msg: print(f"  benchmark: {msg}"),
    )

    # Reload model from fresh Convex data
    _load_from_convex()

    return result


@router.get("/benchmark/status")
async def benchmark_status():
    """Get benchmark corpus info and latest run."""
    from pipeline.benchmark import BENCHMARK_VERTICALS, get_all_brands, get_all_queries, PROMPT_VERSION

    latest_run = cx.get_latest_training_run()

    return {
        "verticals": len(BENCHMARK_VERTICALS),
        "brands": len(get_all_brands()),
        "queries": len(get_all_queries()),
        "prompt_version": PROMPT_VERSION,
        "latest_run": latest_run,
        "vertical_names": list(BENCHMARK_VERTICALS.keys()),
    }


# ── Competitor analysis ────────────────────────────────────────────────────

class CompetitorBrand(BaseModel):
    brand: str
    url: Optional[str] = None


class AnalyzeCompetitorsRequest(BaseModel):
    target: CompetitorBrand
    competitors: list[CompetitorBrand]


@router.post("/analyze-competitors")
def analyze_competitors(req: AnalyzeCompetitorsRequest):
    """Crawl target + competitor websites and return gap analysis + specific recommendations."""
    import asyncio
    from pipeline.competitor_analyzer import (
        crawl_all,
        compute_gaps,
        build_specific_recommendations,
        MODEL_GUIDANCE,
    )
    from dataclasses import asdict

    all_brands = [{"brand": req.target.brand, "url": req.target.url}] + [
        {"brand": c.brand, "url": c.url} for c in req.competitors
    ]

    # Crawl in a thread (requests is blocking)
    profiles = crawl_all(all_brands)

    target_profile = profiles[0]
    competitor_profiles = profiles[1:]

    gaps = compute_gaps(target_profile, competitor_profiles)
    recommendations = build_specific_recommendations(
        target_profile, competitor_profiles, gaps
    )

    return {
        "target": {
            "brand": target_profile.brand,
            "url": target_profile.url,
            "analysis": target_profile.analysis,
            "error": target_profile.error,
        },
        "competitors": [
            {
                "brand": c.brand,
                "url": c.url,
                "analysis": c.analysis,
                "error": c.error,
            }
            for c in competitor_profiles
        ],
        "gaps": [asdict(g) for g in gaps],
        "recommendations": recommendations,
        "model_guidance": MODEL_GUIDANCE,
    }


# ── Per-query breakdown ────────────────────────────────────────────────────

@router.get("/query-breakdown")
async def query_breakdown(days: int = 7):
    """Per-query breakdown: who wins each buyer query in recent collections."""
    from datetime import date, timedelta

    # Get last N days of mentions
    all_mentions = []
    for i in range(days):
        d = (date.today() - timedelta(days=i)).isoformat()
        try:
            daily = cx.get_mentions_by_date(d)
            all_mentions.extend(daily)
        except Exception:
            continue

    if not all_mentions:
        return {"queries": [], "total_observations": 0}

    # Group by query
    by_query: dict[str, list[dict]] = {}
    for m in all_mentions:
        q = m.get("query", "")
        by_query.setdefault(q, []).append(m)

    results = []
    for query, observations in by_query.items():
        # Group by brand within this query
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

            # Per-model breakdown for this brand on this query
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

        # Sort by mention rate
        brand_stats.sort(key=lambda x: x["mention_rate"], reverse=True)
        winner = brand_stats[0]["brand"] if brand_stats else None

        results.append({
            "query": query,
            "winner": winner,
            "brands": brand_stats,
            "total_samples": len(observations),
        })

    # Sort queries by total samples (most tested first)
    results.sort(key=lambda x: x["total_samples"], reverse=True)

    return {
        "queries": results,
        "total_observations": len(all_mentions),
        "days_covered": days,
    }


# ── Cited sources ──────────────────────────────────────────────────────────

@router.get("/cited-sources")
async def cited_sources(brand: str, days: int = 7):
    """Extract URLs/domains that appear in LLM responses when a given brand is cited."""
    import re
    from datetime import date, timedelta
    from urllib.parse import urlparse

    url_pattern = re.compile(r'https?://[^\s\])\>"\']+')

    # Get logs from last N days
    try:
        all_logs = cx.get_recent_api_logs(limit=500)
    except Exception:
        all_logs = []

    cutoff = (date.today() - timedelta(days=days)).isoformat()
    recent_logs = [log for log in all_logs if log.get("date", "") >= cutoff]

    # Filter to responses where the brand was mentioned
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

        # Extract URLs from raw response
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

    # Sort by frequency
    sources = [
        {"domain": d, "count": c, "rate": round(c / total_mentioning * 100, 1) if total_mentioning else 0}
        for d, c in domain_counts.items()
    ]
    sources.sort(key=lambda x: x["count"], reverse=True)

    return {
        "brand": brand,
        "total_responses_mentioning": total_mentioning,
        "total_logs_checked": len(recent_logs),
        "sources": sources[:30],  # Top 30
        "days_covered": days,
    }


# ── Trends (temporal) ──────────────────────────────────────────────────────

@router.get("/trends")
async def get_trends(brand: str, days: int = 30):
    """Mention rate timeline for a brand over the last N days."""
    try:
        signals = cx.get_signals_by_brand(brand, days=days)
    except Exception:
        signals = []

    # Group by date, take the latest per day
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


# ── Crawl playground ───────────────────────────────────────────────────────

class CrawlDomainRequest(BaseModel):
    url: str
    max_pages: int = Field(default=5, ge=1, le=25)
    depth: int = Field(default=2, ge=1, le=4)
    # "auto"    — Cloudflare /crawl first, scripted fallback on empty
    # "fast"    — /crawl only (tier 1)
    # "scripted"— Playwright over Cloudflare Browser Run CDP (tier 2)
    mode: str = Field(default="auto", pattern="^(auto|fast|scripted)$")


@router.post("/crawl-domain")
def crawl_domain_endpoint(req: CrawlDomainRequest):
    """
    Crawl a domain and return GEO-relevant content features, per-page and
    aggregated. Three modes:
      - auto:     tier 1 (fast, high-level) then tier 2 (scripted browser) on empty
      - fast:     tier 1 only — Cloudflare /crawl or direct HTTP
      - scripted: tier 2 only — Playwright driving Cloudflare Browser Run via CDP,
                  with cookie dismissal and scroll-for-lazy-load

    Intended as a playground: submit any URL and see exactly what the
    engine would extract for that brand on a given tier.
    """
    if req.mode == "scripted":
        result = scripted_crawl_domain(req.url, max_pages=req.max_pages)
    elif req.mode == "fast":
        result = crawl_domain(req.url, max_pages=req.max_pages, depth=req.depth)
    else:  # auto
        result = crawl_with_fallback(req.url, max_pages=req.max_pages, depth=req.depth)

    payload = result_to_dict(result)
    payload["cloudflare_configured"] = _cloudflare_available()
    payload["mode_requested"] = req.mode
    return payload
