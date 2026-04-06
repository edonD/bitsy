"""
Scenario simulator for the prototype backend.
"""

from typing import Dict, List, Optional

from models.surrogate import SurrogateModel


class ScenarioSimulator:
    """
    Simulate what-if scenarios using a lightweight surrogate model.

    This is still a prototype path: the simulator uses surrogate feature importance
    as an explanation proxy until the final prediction engine is chosen.
    """

    def __init__(self, surrogate_model: SurrogateModel):
        self.model = surrogate_model
        self.uncertainty = surrogate_model.get_uncertainty()

    def simulate(
        self,
        base_features: Dict[str, float],
        scenario_features: Dict[str, float],
        scenario_name: Optional[str] = None,
    ) -> Dict:
        scenario_combined = {**base_features, **scenario_features}

        base_prediction = self.model.predict(base_features)
        scenario_prediction = self.model.predict(scenario_combined)

        lift = scenario_prediction - base_prediction
        lift_percentage = (lift / base_prediction * 100) if base_prediction > 0 else 0

        z_score = 1.96
        confidence_margin = z_score * self.uncertainty
        confidence_lower = max(0.0, scenario_prediction - confidence_margin)
        confidence_upper = min(100.0, scenario_prediction + confidence_margin)

        if self.model.validation_r2 and self.model.validation_r2 > 0.85:
            confidence_level = "HIGH"
        elif self.model.validation_r2 and self.model.validation_r2 > 0.70:
            confidence_level = "MEDIUM"
        else:
            confidence_level = "LOW"

        importance = self.model.explain_prediction(scenario_combined)
        changed_features = {
            feature: scenario_combined[feature] - base_features[feature]
            for feature in scenario_features
            if feature in base_features
        }

        weighted_magnitude = sum(
            abs(delta) * abs(importance.get(feature, 0.0))
            for feature, delta in changed_features.items()
        )

        contributions: List[Dict[str, float | str]] = []
        for feature, delta in changed_features.items():
            score = abs(importance.get(feature, 0.0)) * abs(delta)
            contribution = 0.0 if weighted_magnitude == 0 else lift * (score / weighted_magnitude)
            percentage = 0.0 if lift == 0 else abs(contribution) / abs(lift) * 100
            contributions.append(
                {
                    "feature": feature,
                    "contribution": float(contribution),
                    "percentage": float(percentage),
                }
            )

        contributions.sort(key=lambda item: abs(float(item["contribution"])), reverse=True)

        return {
            "base_case_prediction": float(base_prediction),
            "scenario_prediction": float(scenario_prediction),
            "predicted_lift": float(lift),
            "lift_percentage": float(lift_percentage),
            "confidence_lower": float(confidence_lower),
            "confidence_upper": float(confidence_upper),
            "confidence_level": confidence_level,
            "shap_contributions": contributions[:10],
        }

    def sensitivity_analysis(
        self,
        base_features: Dict[str, float],
        sensitive_features: List[str],
        perturbations: Optional[List[float]] = None,
    ) -> Dict[str, Dict]:
        if perturbations is None:
            perturbations = [0.5, 0.7, 0.9, 1.0, 1.1, 1.3, 1.5]

        results = {}

        for feature in sensitive_features:
            predictions = []

            for perturbation in perturbations:
                modified = base_features.copy()

                if feature in base_features:
                    original_value = base_features[feature]
                    modified[feature] = original_value * perturbation
                    predictions.append(float(self.model.predict(modified)))

            results[feature] = {
                "perturbations": perturbations,
                "predictions": predictions,
            }

        return results

    def edge_case_scenarios(
        self,
        base_features: Dict[str, float],
        scenario_name: str,
    ) -> List[Dict]:
        edge_cases = []

        if "best_of_list_mentions" in base_features:
            result = self.simulate(
                base_features,
                {
                    "best_of_list_mentions": base_features.get("best_of_list_mentions", 0) * 0.25,
                },
                f"{scenario_name}: low authority pickup",
            )
            result["scenario_name"] = "Low authority pickup"
            edge_cases.append(result)

        if "avg_source_freshness_months" in base_features:
            result = self.simulate(
                base_features,
                {"avg_source_freshness_months": 3.0},
                f"{scenario_name}: aged content",
            )
            result["scenario_name"] = "Content ages to 3 months"
            edge_cases.append(result)

        return edge_cases
