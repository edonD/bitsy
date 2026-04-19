"""
Endpoints that read or operate on the trained surrogate model:

  POST /train             — retrain on all accumulated Convex data
  POST /whatif            — scenario prediction
  GET  /status            — data + model summary
  GET  /features          — current per-brand feature vectors
  GET  /importance        — feature importance
  GET  /model-diagnostics — honest read of how/why the current score is what it is
  GET  /recommendations   — ranked GEO actions using FEATURE_ACTIONS
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from pipeline.engine import (
    SurrogateModel,
    FEATURE_NAMES,
    CONTENT_FEATURE_NAMES,
    LAG_FEATURE_NAME,
    SURROGATE_XGB_PARAMS,
    summarize_training_rows,
)
from pipeline import convex_client as cx

from ._store import (
    _store,
    _clean_training_rows,
    _latest_rows_by_brand,
    _safe_latest_training_run,
)
from .feature_actions import FEATURE_ACTIONS


router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class WhatIfRequest(BaseModel):
    brand: str
    changes: dict[str, float]
    model: Optional[str] = None  # if set, predict for one model; else all


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


# ── Endpoints ──────────────────────────────────────────────────────────────

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
    """Scenario prediction on the trained surrogate."""
    if not _store["model"]:
        raise HTTPException(status_code=400, detail="No model trained. Run /collect first.")

    brand_feats = None
    for r in _store["features"]:
        if r.get("brand") == req.brand:
            brand_feats = r
            break

    if not brand_feats:
        raise HTTPException(status_code=404, detail=f"Brand '{req.brand}' not found.")

    result = _store["model"].whatif(brand_feats, req.changes, req.model)

    per_model = None
    if not req.model and _store["model"].per_model_models:
        pm_results = _store["model"].whatif_all_models(brand_feats, req.changes)
        per_model = {
            m: {"lift": r["lift"], "lift_pct": r["lift_pct"], "base": r["base_prediction"], "predicted": r["scenario_prediction"]}
            for m, r in pm_results.items()
        }

    # Confidence tier: how much history does this brand have?
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
    """Data + model state."""
    try:
        samples = cx.get_all_training_samples()
    except Exception:
        samples = []

    brands = list({s["brand"] for s in samples}) if samples else []
    target = _store["config"]["target"] if _store.get("config") else None

    try:
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
    """Current per-brand feature vectors."""
    if not _store["features"]:
        raise HTTPException(status_code=400, detail="No data. Run /collect first.")
    return {"features": _store["features"]}


@router.get("/importance")
async def get_importance():
    """Feature importance from the trained model."""
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


@router.get("/recommendations")
async def get_recommendations(brand: str):
    """Ranked GEO recommendations for a brand."""
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

        # Features whose value should go DOWN for improvement
        improves_up = feat not in (
            "avg_position", "negative_rate", "model_spread", "brands_ahead",
            "readability_grade", "freshness_days",
        )
        if improves_up and current >= target_val:
            continue
        if not improves_up and current <= target_val:
            continue

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

    recommendations.sort(key=lambda r: abs(r.predicted_lift), reverse=True)

    return {"brand": brand, "recommendations": recommendations}
