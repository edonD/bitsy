"""POST /analyze-content — one-shot GEO content analysis for a URL or raw text."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from pipeline.content_analyzer import (
    analyze_url,
    analyze_text,
    rate_features,
    compute_overall_score,
    generate_summary,
)

from ._store import _content_metrics


router = APIRouter()


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
            url=analysis.url, title=None, features=[], metrics={},
            summary=analysis.fetch_error,
            content_length=0, word_count=0, overall_score=0,
            fetch_error=analysis.fetch_error,
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
        url=analysis.url, title=analysis.title, features=features,
        metrics=_content_metrics(analysis), summary=summary,
        content_length=analysis.content_length, word_count=analysis.word_count,
        overall_score=score, fetch_error=None,
    )
