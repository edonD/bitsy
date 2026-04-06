"""
Daily automated pipeline: collect data, train model, cache for predictions
"""

import os
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from core.database import SessionLocal, init_db
from data.llm_collector import collect_mentions_daily, BRANDS_TO_TRACK
from data.signal_scraper import SignalScraper
from data.assembler import assemble_training_data
from models.trainer import train_daily
from core.cache import model_cache


async def run_daily_pipeline():
    """
    Run complete daily pipeline:
    6am:  Collect mention data + brand signals
    7am:  Assemble training data + train model + cache
    """

    print("\n" + "=" * 80)
    print("BITSY DAILY PIPELINE")
    print("=" * 80)
    print(f"Started at {datetime.now()}")

    # Database setup
    init_db()
    db = SessionLocal()

    try:
        # ====================================================================
        # 6am: DATA COLLECTION
        # ====================================================================
        print("\n[6am] PHASE 1: DATA COLLECTION")
        print("-" * 80)

        # Collect mention data
        api_keys = {
            "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
            "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
            "GOOGLE_API_KEY": os.getenv("GOOGLE_API_KEY"),
            "GROQ_API_KEY": os.getenv("GROQ_API_KEY"),
        }

        print("\n[6am] Collecting mention data from LLMs...")
        await collect_mentions_daily(db, api_keys)

        # Collect brand signals
        print("\n[6am] Scraping brand signals...")
        scraper = SignalScraper()

        brand_domains = {
            "Zapier": "zapier.com",
            "Airtable": "airtable.com",
            "Notion": "notion.com",
            "Make": "make.com",
            "n8n": "n8n.io",
        }

        competitors = [
            "Make", "n8n", "Integromat", "Zapier", "Airtable"
        ]

        await scraper.collect_all_brands(
            db,
            BRANDS_TO_TRACK,
            brand_domains,
            competitors,
        )

        # ====================================================================
        # 7am: MODEL TRAINING
        # ====================================================================
        print("\n[7am] PHASE 2: MODEL TRAINING")
        print("-" * 80)

        # Assemble training data
        print("\n[7am] Assembling training data...")
        X, y = assemble_training_data(db, days_back=90)

        if len(X) == 0:
            print("ERROR: No training data assembled!")
            return

        # Train model
        print("\n[7am] Training XGBoost model...")
        trainer = train_daily(db, X, y)

        # Cache model for predictions
        model_cache.set(trainer)

        print("\n" + "=" * 80)
        print("DAILY PIPELINE COMPLETE")
        print("=" * 80)
        print(f"Finished at {datetime.now()}")
        print(f"Model ready for predictions: {model_cache.is_loaded()}")

    except Exception as e:
        print(f"\nERROR in daily pipeline: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


def schedule_pipeline():
    """
    Schedule pipeline to run at 6am and 7am daily
    """
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    scheduler = BackgroundScheduler()

    # 6am: Data collection
    scheduler.add_job(
        lambda: asyncio.run(run_daily_pipeline()),
        CronTrigger(hour=6, minute=0),
        id="bitsy_pipeline_6am",
        name="Bitsy Pipeline - Data Collection (6am)",
        replace_existing=True,
    )

    scheduler.start()
    print("✓ Daily pipeline scheduled for 6am")

    return scheduler


if __name__ == "__main__":
    # Run pipeline immediately for testing
    print("Running daily pipeline (for testing)...\n")
    asyncio.run(run_daily_pipeline())
