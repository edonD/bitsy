"""
PostgreSQL database connection and management
"""

from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/bitsy"
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ============================================================================
# Models
# ============================================================================

class MentionRecord(Base):
    """Daily mention data from LLM API calls"""
    __tablename__ = "mention_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True)  # YYYY-MM-DD
    brand = Column(String, index=True)
    model = Column(String)  # claude-3.5-sonnet, gpt-4, etc
    query_id = Column(String)  # unique query identifier
    mentioned = Column(Boolean)  # Was brand mentioned?
    mention_rate = Column(Float)  # Computed daily rate
    created_at = Column(DateTime, default=datetime.utcnow)


class BrandSignal(Base):
    """Daily brand feature snapshot"""
    __tablename__ = "brand_signals"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True)  # YYYY-MM-DD
    brand = Column(String, index=True)

    # Core signals
    freshness_days = Column(Float)  # Days since last mention
    authority_count = Column(Integer)  # G2, Gartner, etc
    domain_authority = Column(Float)  # Moz DA score
    num_queries = Column(Integer)  # Query diversity count
    market_share = Column(Float)  # Relative to competitors
    content_age_days = Column(Float)  # Avg blog post age
    competitor_rank = Column(Integer)  # Rank vs competitors
    schema_markup_score = Column(Float)  # 0-1 implementation quality

    created_at = Column(DateTime, default=datetime.utcnow)


class TrainingRun(Base):
    """Metadata for model training"""
    __tablename__ = "training_runs"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, unique=True, index=True)  # YYYY-MM-DD of training
    r2_score = Column(Float)  # Validation R²
    rmse = Column(Float)  # Validation RMSE
    mae = Column(Float)  # Mean absolute error
    num_samples = Column(Integer)  # Training samples used
    model_version = Column(Integer)  # Model version number
    created_at = Column(DateTime, default=datetime.utcnow)


# Create tables on startup
def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
