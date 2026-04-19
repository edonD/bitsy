"""GET /logs — recent raw LLM-call logs (prompt + response + parsed brands)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from pipeline import convex_client as cx
from ._store import _store, _api_log_lock


router = APIRouter()


@router.get("/logs")
async def get_api_logs(limit: int = 50):
    """
    Recent LLM-call logs. Prefers the in-memory ring buffer (populated
    live during /collect runs), falls back to Convex-persisted logs.
    """
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
