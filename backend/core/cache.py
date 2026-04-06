"""
In-memory cache for trained model
"""

import threading
from typing import Optional
from models.trainer import ModelTrainer


class ModelCache:
    """Thread-safe cache for trained model"""

    def __init__(self):
        self._model: Optional[ModelTrainer] = None
        self._lock = threading.RLock()

    def set(self, model: ModelTrainer):
        """Store model in cache"""
        with self._lock:
            self._model = model
            print(f"Model cached: R²={model.r2_score:.3f}, RMSE={model.rmse:.2f}pp")

    def get(self) -> Optional[ModelTrainer]:
        """Retrieve model from cache"""
        with self._lock:
            return self._model

    def clear(self):
        """Clear cache"""
        with self._lock:
            self._model = None
            print("Model cache cleared")

    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        with self._lock:
            return self._model is not None


# Global cache instance
model_cache = ModelCache()
