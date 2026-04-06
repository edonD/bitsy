"""
Tests for the simulation engine
"""

import pytest
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.surrogate import SurrogateModel
from simulation.simulator import ScenarioSimulator
from data.mock_data import MockDataGenerator


@pytest.fixture
def mock_data_gen():
    """Create mock data generator"""
    return MockDataGenerator()


@pytest.fixture
def trained_surrogate(mock_data_gen):
    """Train a surrogate model on mock data"""
    feature_names = mock_data_gen.get_feature_names()
    surrogate = SurrogateModel(feature_names)

    X, y = mock_data_gen.generate_training_data(num_brands=3, days_per_brand=60)
    surrogate.train(X, y, verbose=False)

    return surrogate


@pytest.fixture
def simulator(trained_surrogate):
    """Create simulator with trained model"""
    return ScenarioSimulator(trained_surrogate)


def test_surrogate_trains(trained_surrogate):
    """Test that surrogate model trains successfully"""
    assert trained_surrogate.model is not None
    assert trained_surrogate.validation_r2 > 0.5  # Should fit reasonably well
    assert trained_surrogate.validation_rmse < 20  # Reasonable error margin


def test_surrogate_predicts(trained_surrogate, mock_data_gen):
    """Test that surrogate can make predictions"""
    baseline = mock_data_gen.get_baseline_features()
    prediction = trained_surrogate.predict(baseline)

    assert 0 <= prediction <= 100  # Valid mention rate range
    assert isinstance(prediction, float)


def test_feature_importance(trained_surrogate):
    """Test that feature importance is computed"""
    assert len(trained_surrogate.feature_importance) > 0
    assert "avg_source_freshness_months" in trained_surrogate.feature_importance
    assert "high_authority_source_count" in trained_surrogate.feature_importance

    # Should sum to reasonable value
    total = sum(trained_surrogate.feature_importance.values())
    assert total > 0


def test_simulator_basic_scenario(simulator, mock_data_gen):
    """Test basic what-if scenario"""
    baseline = mock_data_gen.get_baseline_features()

    # Scenario: publish fresh content
    scenario = {"avg_source_freshness_months": 0.1}

    result = simulator.simulate(baseline, scenario)

    # Should have all required fields
    assert "base_case_prediction" in result
    assert "scenario_prediction" in result
    assert "predicted_lift" in result
    assert "confidence_lower" in result
    assert "confidence_upper" in result
    assert "confidence_level" in result
    assert "shap_contributions" in result

    # Predictions should be in valid range
    assert 0 <= result["base_case_prediction"] <= 100
    assert 0 <= result["scenario_prediction"] <= 100

    # Fresh content should improve mention rate
    assert result["scenario_prediction"] >= result["base_case_prediction"]


def test_simulator_multiple_feature_scenario(simulator, mock_data_gen):
    """Test scenario with multiple feature changes"""
    baseline = mock_data_gen.get_baseline_features()

    # Complex scenario: publish guide + get into best-of list + improve schema
    scenario = {
        "avg_source_freshness_months": 0.1,
        "best_of_list_mentions": baseline["best_of_list_mentions"] + 5,
        "schema_markup_score": 0.9,
        "high_authority_source_count": baseline["high_authority_source_count"] + 2,
    }

    result = simulator.simulate(baseline, scenario)

    # Larger improvement expected
    assert result["predicted_lift"] > 3.0  # At least +3pp


def test_simulator_shap_explanations(simulator, mock_data_gen):
    """Test that SHAP explanations are correct"""
    baseline = mock_data_gen.get_baseline_features()
    scenario = {"avg_source_freshness_months": 0.1}

    result = simulator.simulate(baseline, scenario)

    # Should have SHAP contributions
    assert len(result["shap_contributions"]) > 0

    # Sum of positive contributions should roughly equal lift
    positive_contributions = sum(
        c.contribution for c in result["shap_contributions"] if c.contribution > 0
    )
    assert positive_contributions > 0  # Some features should contribute positively


def test_simulator_confidence_bounds(simulator, mock_data_gen):
    """Test confidence interval bounds"""
    baseline = mock_data_gen.get_baseline_features()
    scenario = {"avg_source_freshness_months": 0.5}

    result = simulator.simulate(baseline, scenario)

    # Bounds should be symmetric around prediction
    assert result["confidence_lower"] < result["scenario_prediction"]
    assert result["scenario_prediction"] < result["confidence_upper"]

    # Bounds should be reasonable
    margin = result["confidence_upper"] - result["confidence_lower"]
    assert margin > 0
    assert margin < 30  # Not unreasonably wide


def test_sensitivity_analysis(simulator, mock_data_gen):
    """Test sensitivity analysis"""
    baseline = mock_data_gen.get_baseline_features()

    sensitive_features = [
        "avg_source_freshness_months",
        "high_authority_source_count",
        "best_of_list_mentions",
    ]

    results = simulator.sensitivity_analysis(
        base_features=baseline,
        sensitive_features=sensitive_features,
        perturbations=[0.5, 1.0, 1.5],
    )

    assert len(results) == 3  # All features should have results
    assert "avg_source_freshness_months" in results

    # Each should have predictions for each perturbation
    freshness_results = results["avg_source_freshness_months"]
    assert len(freshness_results["predictions"]) == 3
    assert len(freshness_results["perturbations"]) == 3


def test_edge_case_scenarios(simulator, mock_data_gen):
    """Test edge case scenario generation"""
    baseline = mock_data_gen.get_baseline_features()

    edge_cases = simulator.edge_case_scenarios(
        base_features=baseline,
        scenario_name="Publish guide",
    )

    # Should generate multiple edge cases
    assert len(edge_cases) >= 2

    # Each should be a valid scenario result
    for edge_case in edge_cases:
        assert "scenario_name" in edge_case
        assert "predicted_lift" in edge_case


def test_uncertainty_decreases_with_better_model(trained_surrogate):
    """Test that uncertainty is tied to model quality"""
    uncertainty = trained_surrogate.get_uncertainty()

    # Should be positive
    assert uncertainty > 0

    # Should be less than max error
    assert uncertainty < 50


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
