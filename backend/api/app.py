"""
FastAPI application — wired to the real pipeline engine.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load API keys
env_path = Path(__file__).resolve().parent.parent.parent / "site" / ".env.local"
load_dotenv(env_path)

from api.routes import health, simulation


def create_app() -> FastAPI:
    app = FastAPI(
        title="Bitsy API",
        description="AI search visibility simulation engine",
        version="0.2.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3099"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(simulation.router, prefix="/api/simulations", tags=["simulations"])

    return app


app = create_app()
