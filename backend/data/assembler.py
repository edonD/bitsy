"""
Assemble training data: join mention rates with brand signals
"""

from datetime import datetime, timedelta
from typing import Tuple
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import MentionRecord, BrandSignal


def assemble_training_data(db: Session, days_back: int = 90) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Join mention rates with brand signals to create training dataset

    Args:
        db: Database session
        days_back: Number of days of history to include

    Returns:
        X: Features DataFrame (samples × features)
        y: Target Series (mention rates)
    """

    # Calculate date range
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days_back)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")

    print(f"Assembling training data from {start_str} to {end_str}")

    # Get all mention records in date range
    mention_records = db.query(MentionRecord).filter(
        MentionRecord.date >= start_str,
        MentionRecord.date <= end_str,
    ).all()

    if not mention_records:
        print("No mention records found!")
        return pd.DataFrame(), pd.Series(dtype=float)

    # Convert to DataFrame
    mention_df = pd.DataFrame([
        {
            "date": r.date,
            "brand": r.brand,
            "mention_rate": r.mention_rate,
        }
        for r in mention_records
    ])

    # Get unique dates and brands
    dates = sorted(mention_df["date"].unique())
    brands = sorted(mention_df["brand"].unique())

    print(f"  Found {len(dates)} dates, {len(brands)} brands")
    print(f"  Total mention records: {len(mention_records)}")

    # Get all brand signals in date range
    signal_records = db.query(BrandSignal).filter(
        BrandSignal.date >= start_str,
        BrandSignal.date <= end_str,
    ).all()

    # Convert to DataFrame
    signal_df = pd.DataFrame([
        {
            "date": r.date,
            "brand": r.brand,
            "freshness_days": r.freshness_days,
            "authority_count": r.authority_count,
            "domain_authority": r.domain_authority,
            "num_queries": r.num_queries,
            "market_share": r.market_share,
            "content_age_days": r.content_age_days,
            "competitor_rank": r.competitor_rank,
            "schema_markup_score": r.schema_markup_score,
        }
        for r in signal_records
    ])

    print(f"  Found {len(signal_df)} signal records")

    # Join mention rates with signals
    training_data = mention_df.merge(
        signal_df,
        on=["date", "brand"],
        how="inner",
    )

    if len(training_data) == 0:
        print("No matching records after join!")
        return pd.DataFrame(), pd.Series(dtype=float)

    print(f"  Assembled {len(training_data)} training samples")

    # Separate features and target
    feature_cols = [
        "freshness_days",
        "authority_count",
        "domain_authority",
        "num_queries",
        "market_share",
        "content_age_days",
        "competitor_rank",
        "schema_markup_score",
    ]

    X = training_data[feature_cols].copy()
    y = training_data["mention_rate"].copy()

    # Handle missing values
    X = X.fillna(X.mean())

    print(f"  Features shape: {X.shape}")
    print(f"  Target shape: {y.shape}")
    print(f"  Feature columns: {feature_cols}")

    return X, y


def get_latest_signals(db: Session, brand: str) -> dict:
    """
    Get the latest signals for a brand (for making predictions)
    """
    record = db.query(BrandSignal).filter(
        BrandSignal.brand == brand,
    ).order_by(BrandSignal.date.desc()).first()

    if not record:
        print(f"No signals found for {brand}")
        return {}

    return {
        "freshness_days": record.freshness_days,
        "authority_count": record.authority_count,
        "domain_authority": record.domain_authority,
        "num_queries": record.num_queries,
        "market_share": record.market_share,
        "content_age_days": record.content_age_days,
        "competitor_rank": record.competitor_rank,
        "schema_markup_score": record.schema_markup_score,
    }


def get_baseline_mention_rate(db: Session, brand: str, days_back: int = 7) -> float:
    """
    Get the baseline mention rate for a brand (last N days average)
    """
    start_date = (datetime.now().date() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    records = db.query(MentionRecord).filter(
        MentionRecord.brand == brand,
        MentionRecord.date >= start_date,
    ).all()

    if not records:
        return 0.0

    # Calculate average mention rate
    mention_rates = [r.mention_rate for r in records if r.mention_rate is not None]

    if not mention_rates:
        return 0.0

    avg_rate = sum(mention_rates) / len(mention_rates)
    return avg_rate


if __name__ == "__main__":
    print("Data assembler module - called by training pipeline")
