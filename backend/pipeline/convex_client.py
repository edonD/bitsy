"""
Convex HTTP client for Python.

Calls Convex httpAction endpoints defined in convex/http.ts.
"""

import os
import requests
from typing import Any

# Convex site URL serves HTTP actions at the same origin.
CONVEX_SITE_URL = os.getenv(
    "CONVEX_SITE_URL",
    "https://savory-goldfish-122.convex.site",
)
INTERNAL_TOKEN = os.getenv("BITSY_INTERNAL_API_TOKEN") or os.getenv("CONVEX_PIPELINE_TOKEN")


def _strip_none(obj: Any) -> Any:
    """Recursively remove None values — Convex rejects them."""
    if isinstance(obj, dict):
        return {k: _strip_none(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, list):
        return [_strip_none(item) for item in obj]
    return obj


def _post(path: str, body: dict[str, Any] | None = None) -> Any:
    if not CONVEX_SITE_URL:
        raise RuntimeError("CONVEX_SITE_URL is not configured.")

    url = f"{CONVEX_SITE_URL}{path}"
    headers = {}
    if INTERNAL_TOKEN:
        headers["Authorization"] = f"Bearer {INTERNAL_TOKEN}"

    resp = requests.post(url, json=_strip_none(body or {}), headers=headers, timeout=30)
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


# ── Change log (Verify) ─────────────────────────────────────────────────────

def store_change_log(records: list[dict]) -> list:
    return _post("/pipeline/changeLog/store", {"records": records})["ids"]


def get_changes_by_brand(brand: str, limit: int = 50) -> list[dict]:
    return _post("/pipeline/changeLog/getByBrand", {"brand": brand, "limit": limit})["data"]


def get_all_changes(limit: int = 100) -> list[dict]:
    return _post("/pipeline/changeLog/getAll", {"limit": limit})["data"]


# ── Playbook artifacts (Execute persistence) ────────────────────────────────

def store_playbook_artifacts(records: list[dict]) -> list:
    return _post("/pipeline/playbookArtifacts/store", {"records": records})["ids"]


def get_playbook_artifacts(brand: str, limit: int = 50) -> list[dict]:
    return _post("/pipeline/playbookArtifacts/getByBrand", {"brand": brand, "limit": limit})["data"]


# ── Browser Run usage (Cloudflare budget tracker) ───────────────────────────

def record_browser_usage(date: str, seconds_delta: float) -> str:
    return _post("/pipeline/browserUsage/record", {"date": date, "seconds_delta": seconds_delta})["id"]


def get_browser_usage_for_date(date: str) -> dict | None:
    return _post("/pipeline/browserUsage/getForDate", {"date": date})["data"]


def get_browser_usage_recent(days: int = 30) -> list[dict]:
    return _post("/pipeline/browserUsage/getRecent", {"days": days})["data"]
