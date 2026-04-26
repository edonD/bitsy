"""
Simulation endpoint: /api/simulate
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from api.models import SimulationRequest, SimulationResponse, FeatureContributionResponse
from models.predictor import SimulationPredictor
from data.assembler import get_latest_signals, get_baseline_mention_rate
from core.database import get_db
from core.cache import model_cache
import time

router = APIRouter()


@router.post("/simulate", response_model=SimulationResponse)
async def simulate_scenario(request: SimulationRequest, db: Session = Depends(get_db)):
    """
    Run a what-if simulation for a brand

    Example:
    {
        "brand_id": "zapier-123",
        "scenario_features": {
            "freshness_days": 10,
            "authority_count": 5,
            "best_of_list_mentions": 15
        }
    }

    Response:
    {
        "brand_id": "zapier-123",
        "base_case_prediction": 32.8,
        "scenario_prediction": 41.2,
        "predicted_lift": 8.4,
        "lift_percentage": 25.6,
        "confidence_lower": 37.1,
        "confidence_upper": 45.3,
        "confidence_level": "HIGH",
        "shap_contributions": [...]  # legacy name; not SHAP
    }
    """

    start_time = time.time()

    try:
        # Get cached model
        trainer = model_cache.get()

        if trainer is None:
            raise HTTPException(
                status_code=503,
                detail="Model not loaded. Check backend logs."
            )

        # Get current brand state
        baseline_features = get_latest_signals(db, request.brand_id)

        if not baseline_features:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for brand {request.brand_id}"
            )

        # Create predictor
        predictor = SimulationPredictor(trainer)

        # Run simulation
        result = predictor.simulate(baseline_features, request.scenario_features)

        # Convert importance-weighted feature contributions to response format.
        # The response field keeps its legacy name for compatibility.
        contributions = [
            FeatureContributionResponse(
                feature=c.feature,
                contribution=c.contribution,
                percentage=c.percentage,
            )
            for c in result["shap_contributions"]
        ]

        # Build response
        response = SimulationResponse(
            brand_id=request.brand_id,
            base_case_prediction=result["base_case_prediction"],
            scenario_prediction=result["scenario_prediction"],
            predicted_lift=result["predicted_lift"],
            lift_percentage=result["lift_percentage"],
            confidence_lower=result["confidence_lower"],
            confidence_upper=result["confidence_upper"],
            confidence_level=result["confidence_level"],
            shap_contributions=contributions,
        )

        elapsed = time.time() - start_time
        print(f"Simulation completed in {elapsed*1000:.1f}ms")

        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands/{brand_id}/signals")
async def get_brand_signals(brand_id: str, db: Session = Depends(get_db)):
    """
    Get current signals for a brand
    """
    signals = get_latest_signals(db, brand_id)
    mention_rate = get_baseline_mention_rate(db, brand_id)

    if not signals:
        raise HTTPException(status_code=404, detail=f"Brand {brand_id} not found")

    return {
        "brand_id": brand_id,
        "current_mention_rate": mention_rate,
        "signals": signals,
    }


if __name__ == "__main__":
    print("Simulation routes module")
