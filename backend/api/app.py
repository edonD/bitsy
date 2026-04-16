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

LOCAL_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3099",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3099",
]


def create_app() -> FastAPI:
    app = FastAPI(
        title="Bitsy API",
        description="AI search visibility simulation engine",
        version="0.2.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=LOCAL_DEV_ORIGINS,
        allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(simulation.router, prefix="/api/simulations", tags=["simulations"])

    return app


app = create_app()
