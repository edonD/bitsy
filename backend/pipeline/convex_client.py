"""
Convex HTTP client for Python.

Calls Convex httpAction endpoints defined in convex/http.ts.
"""

import os
import requests
from typing import Any

# Convex site URL serves HTTP actions at the same origin
CONVEX_SITE_URL = os.getenv(
    "CONVEX_SITE_URL",
    "https://savory-goldfish-122.convex.site",
)


def _strip_none(obj: Any) -> Any:
    """Recursively remove None values — Convex rejects them."""
    if isinstance(obj, dict):
        return {k: _strip_none(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, list):
        return [_strip_none(item) for item in obj]
    return obj


def _post(path: str, body: dict[str, Any] | None = None) -> Any:
    url = f"{CONVEX_SITE_URL}{path}"
    resp = requests.post(url, json=_strip_none(body or {}), timeout=30)
    resp.raise_for_status()
    return resp.json()


# ── Mentions ────────────────────────────────────────────────────────────────

def store_mentions(records: list[dict]) -> list:
    return _post("/pipeline/mentions/store", {"records": records})["ids"]


def get_mentions_by_date(date: str) -> list[dict]:
    return _post("/pipeline/mentions/getByDate", {"date": date})["data"]


# ── Signals ─────────────────────────────────────────────────────────────────

def store_signals(records: list[dict]) -> list:
    return _post("/pipeline/signals/store", {"records": records})["ids"]


def get_signals_by_date(date: str) -> list[dict]:
    return _post("/pipeline/signals/getByDate", {"date": date})["data"]


def get_signals_by_brand(brand: str, days: int = 30) -> list[dict]:
    return _post("/pipeline/signals/getByBrand", {"brand": brand, "days": days})["data"]


# ── Training ────────────────────────────────────────────────────────────────

def store_training_samples(records: list[dict]) -> list:
    return _post("/pipeline/training/storeSamples", {"records": records})["ids"]


def get_all_training_samples() -> list[dict]:
    return _post("/pipeline/training/getAll")["data"]


def store_training_run(run: dict) -> str:
    return _post("/pipeline/training/storeRun", run)["id"]


def get_latest_training_run() -> dict | None:
    return _post("/pipeline/training/getLatestRun")["data"]


# ── Logs ────────────────────────────────────────────────────────────────────

def add_log(step: str, message: str, status: str, data: Any = None) -> str:
    from datetime import datetime
    return _post("/pipeline/logs/add", {
        "timestamp": datetime.now().isoformat(),
        "step": step,
        "message": message,
        "status": status,
        "data": data,
    })["id"]


# ── API Logs ────────────────────────────────────────────────────────────────

def store_api_logs(records: list[dict]) -> list:
    return _post("/pipeline/apiLogs/store", {"records": records})["ids"]


def get_recent_api_logs(limit: int = 50) -> list[dict]:
    return _post("/pipeline/apiLogs/getRecent", {"limit": limit})["data"]
