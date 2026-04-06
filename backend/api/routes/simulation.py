"""
Simulation endpoints (the core what-if engine)
"""

from fastapi import APIRouter, HTTPException
from api.models import SimulationRequest, SimulationResponse, SensitivityRequest, SensitivityResponse
from simulation.simulator import ScenarioSimulator
from models.surrogate import SurrogateModel
from data.mock_data import MockDataGenerator

router = APIRouter()

# Global simulator (initialized once at startup)
_simulator = None
_mock_data_gen = MockDataGenerator()


def get_simulator() -> ScenarioSimulator:
    """Get or create global simulator"""
    global _simulator

    if _simulator is None:
        # Train on mock data
        feature_names = _mock_data_gen.get_feature_names()
        surrogate = SurrogateModel(feature_names)

        X, y = _mock_data_gen.generate_training_data(num_brands=5, days_per_brand=90)
        surrogate.train(X, y, verbose=True)

        _simulator = ScenarioSimulator(surrogate)

    return _simulator


@router.post("/simulate", response_model=SimulationResponse)
async def simulate_scenario(request: SimulationRequest):
    """
    Run a what-if simulation for a brand.

    Example request:
    {
        "brand_id": "zapier-123",
        "scenario_name": "Publish implementation guide",
        "scenario_features": {
            "avg_source_freshness_months": 0.1,
            "high_authority_source_count": 4
        }
    }
    """

    try:
        simulator = get_simulator()

        # Get baseline features for this brand
        # In production, load from database
        # For now, use mock baseline
        base_features = _mock_data_gen.get_baseline_features()

        # Run simulation
        result = simulator.simulate(
            base_features=base_features,
            scenario_features=request.scenario_features,
            scenario_name=request.scenario_name,
        )

        # Run edge case scenarios (disabled for now due to serialization issues)
        edge_cases = []
        # edge_cases = simulator.edge_case_scenarios(
        #     base_features=base_features,
        #     scenario_name=request.scenario_name,
        # )

        # Ensure all values are properly serialized
        return SimulationResponse(
            brand_id=str(request.brand_id),
            base_case_prediction=float(result["base_case_prediction"]),
            scenario_prediction=float(result["scenario_prediction"]),
            predicted_lift=float(result["predicted_lift"]),
            lift_percentage=float(result["lift_percentage"]),
            confidence_lower=float(result["confidence_lower"]),
            confidence_upper=float(result["confidence_upper"]),
            confidence_level=str(result["confidence_level"]),
            shap_contributions=result["shap_contributions"],
            sensitivity_analysis={"edge_cases": edge_cases} if edge_cases else None,
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sensitivity")
async def sensitivity_analysis(request: SensitivityRequest):
    """
    Run sensitivity analysis on a scenario.

    Shows how predictions change if we vary key features.
    """

    try:
        simulator = get_simulator()

        results = simulator.sensitivity_analysis(
            base_features=request.base_scenario,
            sensitive_features=request.sensitive_features,
            perturbations=request.perturbations,
        )

        # Format response
        sensitivity_list = [
            {
                "feature": feature,
                "perturbations": data["perturbations"],
                "predictions": data["predictions"],
            }
            for feature, data in results.items()
        ]

        return {
            "brand_id": request.brand_id,
            "sensitivity_results": sensitivity_list,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{brand_id}/simulation-status")
async def get_simulation_status(brand_id: str):
    """Get status of simulation engine for a brand"""

    simulator = get_simulator()

    return {
        "brand_id": brand_id,
        "model_trained": simulator.model.model is not None,
        "model_r2": simulator.model.validation_r2,
        "model_rmse": simulator.model.validation_rmse,
        "uncertainty": simulator.uncertainty,
        "feature_importance": simulator.model.feature_importance,
        "ready_for_simulation": simulator.model.model is not None,
    }
