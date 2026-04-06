"""
Mock data generator for testing the simulation engine
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from datetime import datetime, timedelta


class MockDataGenerator:
    """
    Generate synthetic training data that mimics real brand monitoring data.
    Uses realistic feature distributions based on research.
    """

    FEATURE_NAMES = [
        # Time-series features
        "mention_rate_day1",
        "mention_rate_7day_avg",
        "mention_rate_30day_avg",
        "mention_volatility",
        "trend_direction",
        # Competitor features
        "top3_competitor_avg",
        "our_vs_best_competitor",
        "competitors_gaining",
        # Content quality features
        "avg_source_freshness_months",
        "high_authority_source_count",
        "schema_markup_score",
        "best_of_list_mentions",
        # Query features
        "query_type_informational_pct",
        "query_length_avg",
        "query_semantic_diversity",
        # Mechanism features
        "parametric_mentions_pct",
        "rag_mentions_pct",
        "training_cutoff_months_ago",
        # Seasonality features
        "day_of_week",
        "is_weekend",
        "seasonal_index",
    ]

    def __init__(self):
        """Initialize mock data generator"""
        self.rng = np.random.RandomState(42)  # Fixed seed for reproducibility

    def get_feature_names(self) -> List[str]:
        """Get list of feature names"""
        return self.FEATURE_NAMES.copy()

    def get_baseline_features(self) -> Dict[str, float]:
        """
        Get baseline feature values for a brand.
        Based on realistic SaaS/tool brand characteristics.
        """

        return {
            # Today's mention rate
            "mention_rate_day1": 35.0,
            # 7-day average (relatively stable)
            "mention_rate_7day_avg": 36.5,
            # 30-day average
            "mention_rate_30day_avg": 37.0,
            # Volatility (day-to-day variation)
            "mention_volatility": 4.5,
            # Slight upward trend
            "trend_direction": 0.5,
            # Competitors doing ok
            "top3_competitor_avg": 42.0,
            # We're below best competitor
            "our_vs_best_competitor": 0.83,
            # Competitors stable (0 = not gaining, 1 = gaining)
            "competitors_gaining": 0.0,
            # Sources are ~8 months old (average)
            "avg_source_freshness_months": 8.3,
            # 3 high-authority sources mention brand
            "high_authority_source_count": 3,
            # Has basic schema (0.5 = some but not all)
            "schema_markup_score": 0.5,
            # 5 best-of list mentions in last month
            "best_of_list_mentions": 5,
            # 70% of queries are informational
            "query_type_informational_pct": 70.0,
            # Average query is 6 words
            "query_length_avg": 6.2,
            # Queries are diverse (0.82 = good diversity)
            "query_semantic_diversity": 0.82,
            # 79% from parametric (model weights)
            "parametric_mentions_pct": 79.0,
            # 21% from RAG (search)
            "rag_mentions_pct": 21.0,
            # Model trained 4 months ago
            "training_cutoff_months_ago": 4,
            # Current day is Tuesday (2)
            "day_of_week": 2.0,
            # Not weekend (0 = weekday, 1 = weekend)
            "is_weekend": 0.0,
            # Typical seasonality (spring)
            "seasonal_index": 0.95,
        }

    def generate_training_data(
        self,
        num_brands: int = 5,
        days_per_brand: int = 90,
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Generate synthetic training data for multiple brands over time.

        Each brand gets 90 days of data with realistic patterns:
        - Mention rates fluctuate around a mean
        - Freshness decays over time
        - Authority sources add positive pressure
        - Seasonality effects
        - Competitor activity

        Args:
            num_brands: Number of synthetic brands
            days_per_brand: Days of history per brand

        Returns:
            (X DataFrame with features, y Series with mention rates)
        """

        data = []
        labels = []

        for brand_idx in range(num_brands):
            # Each brand has a baseline mention rate
            baseline_mention_rate = self.rng.uniform(25, 55)
            baseline_freshness = self.rng.uniform(6, 12)

            for day in range(days_per_brand):
                # Generate features with realistic patterns
                features = self._generate_day_features(
                    day=day,
                    baseline_mention_rate=baseline_mention_rate,
                    baseline_freshness=baseline_freshness,
                )

                # Mention rate is influenced by features
                # (This is what the model will learn)
                mention_rate = self._compute_mention_rate(features)

                data.append(features)
                labels.append(mention_rate)

        X = pd.DataFrame(data, columns=self.FEATURE_NAMES)
        y = pd.Series(labels, name="mention_rate")

        return X, y

    def _generate_day_features(
        self,
        day: int,
        baseline_mention_rate: float,
        baseline_freshness: float,
    ) -> Dict[str, float]:
        """Generate features for a single day"""

        # Time-series: mention rate with trend and noise
        noise = self.rng.normal(0, 3)  # Daily variation
        trend = day * 0.05  # Slight upward trend
        mention_rate_day1 = max(5, min(95, baseline_mention_rate + noise + trend))

        # Rolling averages
        mention_rate_7day_avg = mention_rate_day1 + self.rng.normal(0, 2)
        mention_rate_30day_avg = mention_rate_day1 + self.rng.normal(0, 1.5)

        # Volatility (less volatile over time = more stable brand)
        mention_volatility = max(1, 5 - day * 0.01)

        # Trend
        trend_direction = trend / 10

        # Competitors
        top3_competitor_avg = mention_rate_day1 + self.rng.uniform(5, 15)
        our_vs_best = mention_rate_day1 / top3_competitor_avg if top3_competitor_avg > 0 else 1
        competitors_gaining = float(self.rng.random() > 0.7)  # 30% chance (0.0 or 1.0)

        # Content quality
        # Freshness decays over time
        avg_source_freshness = baseline_freshness + day * 0.01
        high_authority_source_count = int(self.rng.uniform(2, 5))
        schema_markup_score = self.rng.uniform(0.3, 0.8)
        best_of_list_mentions = int(self.rng.poisson(3))

        # Query features (mostly constant)
        query_type_informational_pct = 70.0
        query_length_avg = 6.2
        query_semantic_diversity = 0.82

        # Mechanism features
        parametric_mentions_pct = self.rng.uniform(70, 85)
        rag_mentions_pct = 100 - parametric_mentions_pct
        training_cutoff_months_ago = 4

        # Seasonality
        day_of_week = day % 7
        is_weekend = float(day_of_week >= 5)
        # Simple seasonal pattern
        seasonal_index = 0.95 + 0.1 * np.sin(2 * np.pi * day / 365)

        return {
            "mention_rate_day1": mention_rate_day1,
            "mention_rate_7day_avg": mention_rate_7day_avg,
            "mention_rate_30day_avg": mention_rate_30day_avg,
            "mention_volatility": mention_volatility,
            "trend_direction": trend_direction,
            "top3_competitor_avg": top3_competitor_avg,
            "our_vs_best_competitor": our_vs_best,
            "competitors_gaining": float(competitors_gaining),
            "avg_source_freshness_months": avg_source_freshness,
            "high_authority_source_count": float(high_authority_source_count),
            "schema_markup_score": schema_markup_score,
            "best_of_list_mentions": float(best_of_list_mentions),
            "query_type_informational_pct": query_type_informational_pct,
            "query_length_avg": query_length_avg,
            "query_semantic_diversity": query_semantic_diversity,
            "parametric_mentions_pct": parametric_mentions_pct,
            "rag_mentions_pct": rag_mentions_pct,
            "training_cutoff_months_ago": float(training_cutoff_months_ago),
            "day_of_week": float(day_of_week),
            "is_weekend": float(is_weekend),
            "seasonal_index": seasonal_index,
        }

    def _compute_mention_rate(self, features: Dict[str, float]) -> float:
        """
        Compute ground truth mention rate based on features.
        This mimics the "true" relationship model learns.

        Relationship is realistic based on research:
        - Fresh content matters (recent sources boost mentions)
        - Authority matters (high-authority sources boost mentions)
        - Competition matters (more competitors = less mentions)
        - Parametric is stable (from model weights)
        - Seasonality affects it
        """

        # Start with parametric baseline
        mention_rate = features["parametric_mentions_pct"] * 0.4

        # Fresh content (0.1 months = new) adds 10-20pp
        # 8 months = only 5-8pp
        freshness_effect = max(0, (12 - features["avg_source_freshness_months"]) * 2)
        mention_rate += freshness_effect

        # Authority sources add ~3pp each
        authority_effect = features["high_authority_source_count"] * 3
        mention_rate += authority_effect

        # Competitor pressure (if they're gaining, we lose ~5pp)
        if features["competitors_gaining"]:
            mention_rate -= 5

        # Seasonal adjustment
        mention_rate *= features["seasonal_index"]

        # Best-of list mentions add small boost
        mention_rate += features["best_of_list_mentions"] * 0.5

        # Clamp to valid range
        return max(5, min(95, mention_rate))
