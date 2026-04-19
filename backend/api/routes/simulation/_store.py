"""
Shared in-memory state + Convex bootstrap for the simulation routes.

All sub-route modules import _store (a single mutable dict) from here so
they share the trained model, current feature vectors, and the live API
log ring buffer. Never reassign _store; only mutate it in place.
"""

from __future__ import annotations

import threading
import time

from pipeline.engine import (
    SurrogateModel,
    FEATURE_NAMES,
    CONTENT_FEATURE_NAMES,
)
from pipeline import convex_client as cx


_store: dict = {
    "features": [],
    "model": None,
    "config": None,
    "api_logs": [],
    "per_model_metrics": {},
}

_api_log_lock = threading.Lock()


# ── Live API log ring buffer ────────────────────────────────────────────────

def _remember_api_log(log: dict) -> None:
    """Push one LLM call log into the in-memory ring buffer (max 500)."""
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


# ── Training-row helpers ────────────────────────────────────────────────────

def _clean_training_rows(samples: list[dict]) -> list[dict]:
    """Project Convex-stored samples to just the columns the model consumes."""
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
    """Keep the newest row per brand (sorted by date)."""
    latest: dict[str, dict] = {}
    for sample in sorted(samples, key=lambda s: (s.get("date", ""), s.get("brand", ""))):
        brand = sample.get("brand")
        if brand:
            latest[brand] = sample
    return list(latest.values())


def _content_metrics(analysis) -> dict[str, float | int | None]:
    """Extract the 7 GEO content features from a ContentAnalysis."""
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


# ── Startup: rehydrate the surrogate from Convex ────────────────────────────

def _load_from_convex():
    """Pull accumulated training samples and train the surrogate on them."""
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
