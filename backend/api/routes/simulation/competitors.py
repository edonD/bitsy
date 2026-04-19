"""POST /analyze-competitors — crawl target + competitors and compute gap analysis."""

from __future__ import annotations

from dataclasses import asdict
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class CompetitorBrand(BaseModel):
    brand: str
    url: Optional[str] = None


class AnalyzeCompetitorsRequest(BaseModel):
    target: CompetitorBrand
    competitors: list[CompetitorBrand]


@router.post("/analyze-competitors")
def analyze_competitors(req: AnalyzeCompetitorsRequest):
    """Crawl target + competitors and return gaps + recommendations + per-model guidance."""
    from pipeline.competitor_analyzer import (
        crawl_all,
        compute_gaps,
        build_specific_recommendations,
        MODEL_GUIDANCE,
    )

    all_brands = [{"brand": req.target.brand, "url": req.target.url}] + [
        {"brand": c.brand, "url": c.url} for c in req.competitors
    ]

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
