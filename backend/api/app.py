"""
FastAPI application factory for the prototype backend.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import brands, health, simulation


def create_app() -> FastAPI:
    app = FastAPI(
        title="Bitsy Prototype API",
        description="Prototype what-if simulation API while the final prediction engine is in design.",
        version="0.1.0-prototype",
    )

    allowed_origins = os.getenv(
        "BITSY_ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:3001",
    ).split(",")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(brands.router, prefix="/api/brands", tags=["brands"])
    app.include_router(simulation.router, prefix="/api/simulations", tags=["simulations"])

    return app


app = create_app()
