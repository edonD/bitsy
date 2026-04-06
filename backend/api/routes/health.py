"""
Health check endpoint for the prototype API.
"""

from fastapi import APIRouter

from api.models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        version="0.1.0-prototype",
        mode="prototype",
        model_loaded=False,
        note="The live prediction engine is not wired in yet; this API serves the prototype simulator.",
    )
