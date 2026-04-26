"""
FastAPI application — wired to the real pipeline engine.
"""

import os
import secrets
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

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

PUBLIC_API_PATHS = {
    "/api/health",
}


def _has_internal_access(request: Request) -> bool:
    token = os.getenv("BITSY_INTERNAL_API_TOKEN")
    if not token:
        return True

    auth_header = request.headers.get("authorization", "")
    supplied = ""
    if auth_header.lower().startswith("bearer "):
        supplied = auth_header[7:].strip()
    supplied = supplied or request.headers.get("x-bitsy-internal-token", "")

    return bool(supplied) and secrets.compare_digest(supplied, token)


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

    @app.middleware("http")
    async def require_internal_token(request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if path.startswith("/api/") and path not in PUBLIC_API_PATHS:
            if not _has_internal_access(request):
                return JSONResponse(
                    {"detail": "Missing or invalid internal API token."},
                    status_code=401,
                )

        return await call_next(request)

    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(simulation.router, prefix="/api/simulations", tags=["simulations"])

    return app


app = create_app()
