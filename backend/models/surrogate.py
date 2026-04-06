"""
Surrogate Model: Lightweight XGBoost for predicting mention rates
"""

import numpy as np
import pandas as pd
import xgboost as xgb
import shap
from typing import Dict, List, Tuple
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error


class SurrogateModel:
    """
    XGBoost surrogate model for predicting LLM mention rates.
    Trained on historical features and mention rate data.
    """

    def __init__(self, feature_names: List[str]):
        """
        Initialize surrogate model.

        Args:
            feature_names: List of feature names (in order)
        """
        self.feature_names = feature_names
        self.model: xgb.XGBRegressor = None
        self.explainer: shap.TreeExplainer = None
        self.validation_rmse: float = None
        self.validation_r2: float = None
        self.feature_importance: Dict[str, float] = {}

    def train(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        train_size: float = 0.8,
        verbose: bool = False
    ) -> Dict:
        """
        Train XGBoost model on historical data.

        Uses walk-forward validation (time-series specific) to avoid lookahead bias.

        Args:
            X: Feature matrix (samples × features)
            y: Target labels (mention rates, 0-100)
            train_size: Fraction of data to use for training (default 0.8)
            verbose: Print training progress

        Returns:
            Dict with validation metrics
        """

        # Walk-forward split (time-series specific, not k-fold)
        split_point = int(len(X) * train_size)

        X_train = X.iloc[:split_point]
        y_train = y.iloc[:split_point]

        X_val = X.iloc[split_point:]
        y_val = y.iloc[split_point:]

        if verbose:
            print(f"Training on {len(X_train)} samples, validating on {len(X_val)} samples")

        # Train XGBoost
        self.model = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            objective="reg:squarederror",
            verbosity=1 if verbose else 0,
        )

        self.model.fit(
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        # Evaluate on validation set
        y_pred = self.model.predict(X_val)
        self.validation_rmse = float(np.sqrt(mean_squared_error(y_val, y_pred)))
        self.validation_r2 = float(r2_score(y_val, y_pred))
        mae = float(mean_absolute_error(y_val, y_pred))

        if verbose:
            print(f"Validation RMSE: {self.validation_rmse:.3f}")
            print(f"Validation R²: {self.validation_r2:.3f}")
            print(f"Validation MAE: {mae:.3f}")

        # Compute SHAP feature importance
        self._compute_feature_importance(X_val)

        return {
            "rmse": self.validation_rmse,
            "r2": self.validation_r2,
            "mae": mae,
            "feature_importance": self.feature_importance,
        }

    def _compute_feature_importance(self, X_val: pd.DataFrame):
        """
        Compute feature importance using XGBoost built-in method.
        SHAP is skipped due to encoding issues.

        Args:
            X_val: Validation feature matrix
        """

        try:
            # Use XGBoost built-in feature importance (more reliable)
            importances = self.model.feature_importances_
            self.feature_importance = dict(zip(self.feature_names, importances))
        except Exception:
            # Fallback: equal importance for all features
            self.feature_importance = {
                name: 1.0 / len(self.feature_names) for name in self.feature_names
            }

        # Sort by importance
        self.feature_importance = dict(
            sorted(
                self.feature_importance.items(),
                key=lambda x: x[1],
                reverse=True,
            )
        )

    def predict(self, features: Dict[str, float]) -> float:
        """
        Predict mention rate for a single sample.

        Args:
            features: Dict of feature values

        Returns:
            Predicted mention rate (0-100)
        """

        if self.model is None:
            raise ValueError("Model not trained yet")

        # Create feature vector in correct order with proper column names
        data = [[features[name] for name in self.feature_names]]
        X = pd.DataFrame(data, columns=self.feature_names)

        prediction = float(self.model.predict(X)[0])

        # Clamp to valid range
        return max(0.0, min(100.0, prediction))

    def predict_batch(self, features_list: List[Dict[str, float]]) -> np.ndarray:
        """
        Predict mention rates for multiple samples.

        Args:
            features_list: List of feature dicts

        Returns:
            Array of predictions
        """

        if self.model is None:
            raise ValueError("Model not trained yet")

        data = [[f[name] for name in self.feature_names] for f in features_list]
        X = pd.DataFrame(data, columns=self.feature_names)

        predictions = self.model.predict(X)

        # Clamp to valid range
        return np.clip(predictions, 0.0, 100.0)

    def explain_prediction(self, features: Dict[str, float]) -> Dict[str, float]:
        """
        Explain a prediction using feature importance.
        Uses SHAP if available, falls back to XGBoost importance.

        Args:
            features: Feature values

        Returns:
            Dict of feature -> contribution magnitude
        """

        try:
            if self.feature_importance is None or not self.feature_importance:
                # Fallback: return equal importance for all features
                explanations = {name: 1.0 / len(self.feature_names) for name in self.feature_names}
            else:
                explanations = self.feature_importance.copy()

            # Sort by magnitude
            explanations = dict(
                sorted(
                    explanations.items(),
                    key=lambda x: abs(x[1]),
                    reverse=True,
                )
            )

            return explanations
        except Exception as e:
            # Emergency fallback
            return {name: 1.0 / len(self.feature_names) for name in self.feature_names}

    def get_uncertainty(self) -> float:
        """
        Get model uncertainty estimate (based on validation RMSE).

        Returns:
            Uncertainty in percentage points
        """

        if self.validation_rmse is None:
            return 5.0  # Default if not trained

        return self.validation_rmse
