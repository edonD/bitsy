"""
POST /collect — run real LLM calls across models × queries × samples,
persist raw mentions + content features + training samples to Convex,
and retrain the surrogate on all accumulated data.
"""

from __future__ import annotations

import time
from datetime import date
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from pipeline.engine import (
    collect,
    extract_all,
    extract_all_per_model,
    merge_content_features_for_brand,
    SurrogateModel,
    FEATURE_NAMES,
    CONTENT_FEATURE_NAMES,
)
from pipeline.content_analyzer import analyze_url
from pipeline import convex_client as cx

from ._store import (
    _store,
    _api_log_lock,
    _remember_api_log,
    _clean_training_rows,
    _content_metrics,
)


router = APIRouter()


class CollectRequest(BaseModel):
    target: str
    competitors: list[str]
    queries: list[str]
    website_url: Optional[str] = None
    models: list[str] = Field(default=["chatgpt", "claude", "gemini"])
    samples_per_query: int = Field(default=2, ge=1, le=5)
    # Paraphrase fan-out (2 queries -> 9 queries)
    fan_out: bool = True
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


@router.post("/collect", response_model=CollectResponse)
def run_collection(req: CollectRequest):
    """LLM panel -> Convex -> retrain surrogate."""
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

    has_content = any(CONTENT_FEATURE_NAMES[0] in s for s in clean_samples)

    model = SurrogateModel(use_content_features=has_content)
    metrics = model.train(clean_samples)

    # Per-model surrogates trained on today's per-model observations only
    # (mixing with aggregate history dilutes model-specific signal).
    per_model_rows: dict[str, list[dict]] = {}
    for model_name in req.models:
        today_pm = extract_all_per_model(observations, all_brands, [model_name], req.queries)
        today_rows = today_pm.get(model_name, [])

        # Content features attach to the target only; competitors get zeros
        # since we don't crawl their sites in the main /collect path.
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
