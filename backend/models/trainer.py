"""
Train XGBoost model on assembled data
"""

from datetime import datetime
import pickle
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
from sqlalchemy.orm import Session
from core.database import TrainingRun


class ModelTrainer:
    """Train and validate XGBoost model"""

    def __init__(self, feature_names: list = None):
        """
        Initialize trainer

        Args:
            feature_names: List of feature column names
        """
        self.feature_names = feature_names or [
            "freshness_days",
            "authority_count",
            "domain_authority",
            "num_queries",
            "market_share",
            "content_age_days",
            "competitor_rank",
            "schema_markup_score",
        ]
        self.model = None
        self.r2_score = None
        self.rmse = None
        self.mae = None
        self.feature_importance = {}

    def train(self, X: pd.DataFrame, y: pd.Series, train_size: float = 0.67):
        """
        Train XGBoost model using walk-forward validation

        Args:
            X: Features DataFrame
            y: Target Series (mention rates)
            train_size: Fraction of data for training (rest for validation)

        Returns:
            dict: Training metrics
        """

        print("Training XGBoost model...")

        # Walk-forward split: train on first 60%, validate on last 40%
        # This prevents lookahead bias in time-series data
        split_point = int(len(X) * train_size)

        X_train = X.iloc[:split_point].copy()
        y_train = y.iloc[:split_point].copy()

        X_val = X.iloc[split_point:].copy()
        y_val = y.iloc[split_point:].copy()

        print(f"  Train: {len(X_train)} samples")
        print(f"  Validation: {len(X_val)} samples")

        # Train XGBoost
        self.model = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            objective="reg:squarederror",
            verbosity=0,
        )

        self.model.fit(
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        # Validate on test set
        y_pred = self.model.predict(X_val)

        # Calculate metrics
        self.r2_score = float(r2_score(y_val, y_pred))
        self.rmse = float(np.sqrt(mean_squared_error(y_val, y_pred)))
        self.mae = float(mean_absolute_error(y_val, y_pred))

        print(f"  R² Score: {self.r2_score:.4f}")
        print(f"  RMSE: {self.rmse:.2f}pp")
        print(f"  MAE: {self.mae:.2f}pp")

        # Extract feature importance
        self._compute_feature_importance()

        return {
            "r2": self.r2_score,
            "rmse": self.rmse,
            "mae": self.mae,
            "num_samples": len(X),
            "train_samples": len(X_train),
            "val_samples": len(X_val),
        }

    def _compute_feature_importance(self):
        """Extract feature importance from trained model"""
        if self.model is None:
            return

        importances = self.model.feature_importances_
        self.feature_importance = dict(zip(self.feature_names, importances))

        # Sort by importance
        self.feature_importance = dict(
            sorted(
                self.feature_importance.items(),
                key=lambda x: x[1],
                reverse=True,
            )
        )

        print("  Feature importance:")
        for feature, importance in list(self.feature_importance.items())[:5]:
            print(f"    {feature}: {importance:.4f}")

    def predict(self, features: dict) -> float:
        """
        Make a prediction for a set of features

        Args:
            features: dict with feature values

        Returns:
            Predicted mention rate (0-100%)
        """
        if self.model is None:
            raise ValueError("Model not trained yet")

        # Create feature vector in correct order
        feature_vector = np.array([
            [features.get(name, 0.0) for name in self.feature_names]
        ])

        prediction = float(self.model.predict(feature_vector)[0])

        # Clamp to valid range
        return max(0.0, min(100.0, prediction))

    def save(self, filepath: str):
        """Save trained model to disk"""
        if self.model is None:
            raise ValueError("No model to save")

        with open(filepath, "wb") as f:
            pickle.dump(self, f)
        print(f"✓ Model saved to {filepath}")

    @staticmethod
    def load(filepath: str) -> "ModelTrainer":
        """Load trained model from disk"""
        with open(filepath, "rb") as f:
            trainer = pickle.load(f)
        print(f"✓ Model loaded from {filepath}")
        return trainer

    def get_confidence_bounds(self, prediction: float) -> tuple:
        """
        Get 95% confidence interval for a prediction

        Args:
            prediction: Point prediction

        Returns:
            (lower_bound, upper_bound)
        """
        if self.rmse is None:
            return prediction - 5, prediction + 5

        z_score = 1.96  # 95% confidence
        margin = z_score * self.rmse

        lower = max(0.0, prediction - margin)
        upper = min(100.0, prediction + margin)

        return lower, upper

    def get_confidence_level(self) -> str:
        """
        Determine confidence level based on model R²

        Returns:
            "HIGH", "MEDIUM", or "LOW"
        """
        if self.r2_score is None:
            return "UNKNOWN"

        if self.r2_score > 0.85:
            return "HIGH"
        elif self.r2_score > 0.70:
            return "MEDIUM"
        else:
            return "LOW"


def train_daily(db: Session, X: pd.DataFrame, y: pd.Series):
    """
    Daily training job

    Args:
        db: Database session
        X: Training features
        y: Training target
    """
    print("\n" + "=" * 80)
    print("DAILY MODEL TRAINING")
    print("=" * 80)

    # Train model
    trainer = ModelTrainer()
    metrics = trainer.train(X, y)

    # Save to disk
    trainer.save("/tmp/bitsy_model.pkl")

    # Store metrics in database
    today = datetime.now().strftime("%Y-%m-%d")

    training_run = TrainingRun(
        date=today,
        r2_score=metrics["r2"],
        rmse=metrics["rmse"],
        mae=metrics["mae"],
        num_samples=metrics["num_samples"],
        model_version=1,
    )

    db.add(training_run)
    db.commit()

    print(f"\n✓ Training complete")
    print(f"  Confidence level: {trainer.get_confidence_level()}")
    print(f"  Model saved to disk")
    print(f"  Metrics stored in database")

    return trainer


if __name__ == "__main__":
    print("Model trainer module - called by daily pipeline")
