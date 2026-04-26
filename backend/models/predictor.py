"""
Make predictions using trained model
"""

from dataclasses import dataclass
from typing import List, Dict


@dataclass
class FeatureContribution:
    """Feature contribution to predicted lift"""
    feature: str
    contribution: float  # pp contribution
    percentage: float  # % of total lift


class SimulationPredictor:
    """Make what-if predictions for users"""

    def __init__(self, trainer):
        """
        Initialize predictor with trained model

        Args:
            trainer: Trained ModelTrainer instance
        """
        self.trainer = trainer

    def simulate(
        self,
        baseline_features: Dict[str, float],
        scenario_features: Dict[str, float],
    ) -> Dict:
        """
        Run a what-if simulation

        Args:
            baseline_features: Current state features
            scenario_features: Modified features (only changed ones)

        Returns:
            dict with predictions, lift, confidence, and feature contributions
        """

        # Merge scenario into baseline
        scenario_combined = {**baseline_features, **scenario_features}

        # Make predictions
        baseline_pred = self.trainer.predict(baseline_features)
        scenario_pred = self.trainer.predict(scenario_combined)

        # Calculate lift
        lift = scenario_pred - baseline_pred
        lift_pct = (lift / baseline_pred * 100) if baseline_pred > 0 else 0

        # Calculate confidence bounds
        ci_lower, ci_upper = self.trainer.get_confidence_bounds(scenario_pred)
        confidence_level = self.trainer.get_confidence_level()

        # Calculate feature contributions to lift
        contributions = self._calculate_contributions(
            baseline_features, scenario_combined, lift
        )

        return {
            "base_case_prediction": float(baseline_pred),
            "scenario_prediction": float(scenario_pred),
            "predicted_lift": float(lift),
            "lift_percentage": float(lift_pct),
            "confidence_lower": float(ci_lower),
            "confidence_upper": float(ci_upper),
            "confidence_level": confidence_level,
            "contribution_method": "importance_weighted_feature_delta",
            # Legacy field name retained for compatibility; these are not SHAP values.
            "shap_contributions": contributions,
        }

    def _calculate_contributions(
        self,
        baseline_features: Dict[str, float],
        scenario_features: Dict[str, float],
        total_lift: float,
    ) -> List[FeatureContribution]:
        """
        Calculate feature contributions to lift using importance weights

        Simple approach:
        - Get feature importance from model
        - Weight by magnitude of feature change
        - Normalize to sum to total lift
        """

        feature_importance = self.trainer.feature_importance

        contributions = {}

        # For each feature that changed
        for feature in baseline_features:
            if feature not in scenario_features:
                contributions[feature] = 0.0
                continue

            baseline_val = baseline_features[feature]
            scenario_val = scenario_features[feature]

            if baseline_val == scenario_val:
                # Feature didn't change
                contributions[feature] = 0.0
            else:
                # Feature changed
                importance = feature_importance.get(feature, 0.0)

                # Magnitude of change (normalized)
                # Some features range 0-100, others 0-1, others 0-365
                # Normalize by typical range
                change_magnitude = abs(scenario_val - baseline_val)

                # Weight by importance
                contribution = importance * change_magnitude * 0.1

                contributions[feature] = contribution

        # Normalize contributions to sum to total lift
        total_contribution = sum(abs(c) for c in contributions.values())

        if total_contribution > 0:
            # Scale so contributions add up to actual lift
            scale_factor = total_lift / total_contribution
            for feature in contributions:
                contributions[feature] *= scale_factor

        # Convert to FeatureContribution objects, sorted by magnitude
        result = []

        for feature in sorted(
            contributions.items(),
            key=lambda x: abs(x[1]),
            reverse=True,
        ):
            feature_name, contribution = feature

            if abs(contribution) < 0.001:
                # Skip tiny contributions
                continue

            percentage = (
                abs(contribution) / abs(total_lift) * 100
                if total_lift != 0
                else 0
            )

            result.append(
                FeatureContribution(
                    feature=feature_name,
                    contribution=float(contribution),
                    percentage=float(percentage),
                )
            )

        return result[:10]  # Top 10 features


if __name__ == "__main__":
    print("Predictor module - used by API to make predictions")
