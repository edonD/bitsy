"""POST /execute/playbook — the five-section, evidence-backed action plan
for closing one content-feature gap."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from pipeline.execute import build_playbook, EVIDENCE


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
