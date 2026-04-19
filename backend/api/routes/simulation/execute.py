"""POST /execute/playbook — the five-section, evidence-backed action plan
for closing one content-feature gap."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from datetime import date

from pipeline.execute import build_playbook, EVIDENCE
from pipeline import convex_client as cx


router = APIRouter()


class ExecutePlaybookRequest(BaseModel):
    brand: str
    feature: str  # gap-analysis feature key: citation_count, statistics_count, etc.
    user_value: float = 0.0
    leader_value: float = 0.0
    leader_brand: Optional[str] = None
    peer_brands: list[str] = Field(default_factory=list)
    query: Optional[str] = None  # the buyer query this playbook targets
    category: Optional[str] = None  # e.g. "AI search visibility tools"


@router.post("/execute/playbook")
def execute_playbook(req: ExecutePlaybookRequest):
    """
    Produce a ready-to-ship playbook for one feature gap:
      - content_patch     — paste-ready paragraph (LLM-authored, evidence-cited)
      - channels          — where to publish it
      - amplification     — authority domains to pitch (from /cited-sources data)
      - content_pairing   — other pages to build so the patch lands
      - timing            — ship-by + refresh cadence
    Every recommendation carries an evidence list pointing to the research
    or Bitsy benchmark fact that backs it.
    """
    return build_playbook(
        brand=req.brand,
        feature=req.feature,
        user_value=req.user_value,
        leader_value=req.leader_value,
        leader_brand=req.leader_brand,
        peer_brands=req.peer_brands,
        query=req.query,
        category=req.category,
    )


@router.get("/execute/evidence")
def execute_evidence():
    """The full evidence library (read-only, for the UI's citation picker)."""
    return {"evidence": EVIDENCE, "count": len(EVIDENCE)}


class SavePlaybookRequest(BaseModel):
    brand: str
    feature: str
    payload: dict  # full playbook JSON


@router.post("/execute/save-playbook")
def save_playbook(req: SavePlaybookRequest):
    """Persist a generated playbook so the user can come back to it."""
    today = date.today().isoformat()
    ids = cx.store_playbook_artifacts([{
        "date": today,
        "brand": req.brand,
        "feature": req.feature,
        "payload": req.payload,
    }])
    return {"id": ids[0] if ids else None, "brand": req.brand, "feature": req.feature}


@router.get("/execute/saved-playbooks")
def saved_playbooks(brand: str, limit: int = 50):
    """List saved playbooks for a brand, newest first."""
    rows = cx.get_playbook_artifacts(brand, limit)
    # Strip payload down for the list view — caller fetches full on click
    summaries = [
        {
            "id": r.get("_id"),
            "brand": r.get("brand"),
            "feature": r.get("feature"),
            "date": r.get("date"),
            "createdAt": r.get("createdAt"),
            "title": (r.get("payload") or {}).get("content_patch", {}).get("text", "")[:100],
        }
        for r in rows
    ]
    return {"brand": brand, "saved": summaries, "count": len(summaries)}


@router.get("/execute/saved-playbook/{playbook_id}")
def saved_playbook_detail(playbook_id: str, brand: str):
    """Fetch the full payload for a saved playbook."""
    rows = cx.get_playbook_artifacts(brand, 50)
    for r in rows:
        if r.get("_id") == playbook_id:
            return r
    return {"error": "not found"}
