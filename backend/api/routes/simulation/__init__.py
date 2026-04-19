"""
Simulation routes package.

Each sub-module owns a thematic slice of the API and exposes its own
APIRouter. This __init__ aggregates them into a single `router` that
api/app.py mounts at /api/simulations.

Layout:
  _store.py          shared in-memory state + Convex bootstrap + helpers
  feature_actions.py FEATURE_ACTIONS catalog for /recommendations
  collect.py         POST /collect              (LLM panel + persistence + training)
  surrogate.py       /train, /whatif, /status, /features, /importance,
                     /model-diagnostics, /recommendations
  logs.py            GET  /logs
  content.py         POST /analyze-content
  benchmark.py       /benchmark/run, /benchmark/status
  competitors.py     POST /analyze-competitors
  analytics.py       /query-breakdown, /cited-sources, /trends
  crawl.py           POST /crawl-domain (crawler playground)
  gap.py             POST /gap-analysis (punch list of content gaps)
"""

from fastapi import APIRouter

from ._store import _load_from_convex
from . import (
    collect,
    surrogate,
    logs,
    content,
    benchmark,
    competitors,
    analytics,
    crawl,
    gap,
    execute,
)


router = APIRouter()
router.include_router(collect.router)
router.include_router(surrogate.router)
router.include_router(logs.router)
router.include_router(content.router)
router.include_router(benchmark.router)
router.include_router(competitors.router)
router.include_router(analytics.router)
router.include_router(crawl.router)
router.include_router(gap.router)
router.include_router(execute.router)


# Rehydrate the surrogate from Convex on module import (matches previous
# behavior — a fresh backend boot starts with the latest trained model).
print("Loading from Convex...")
_load_from_convex()
