"""/benchmark/run + /benchmark/status — daily panel across the benchmark brands."""

from __future__ import annotations

from fastapi import APIRouter

from pipeline import convex_client as cx
from ._store import _load_from_convex


router = APIRouter()


@router.post("/benchmark/run")
def run_benchmark(verticals: list[str] | None = None):
    """Run the benchmark panel now (admin-only). Reloads the surrogate afterwards."""
    from pipeline.benchmark import run_daily_benchmark

    result = run_daily_benchmark(
        verticals=verticals,
        on_progress=lambda msg: print(f"  benchmark: {msg}"),
    )
    _load_from_convex()
    return result


@router.get("/benchmark/status")
async def benchmark_status():
    """Benchmark corpus info + latest run metadata."""
    from pipeline.benchmark import (
        BENCHMARK_VERTICALS,
        get_all_brands,
        get_all_queries,
        PROMPT_VERSION,
    )

    latest_run = cx.get_latest_training_run()

    return {
        "verticals": len(BENCHMARK_VERTICALS),
        "brands": len(get_all_brands()),
        "queries": len(get_all_queries()),
        "prompt_version": PROMPT_VERSION,
        "latest_run": latest_run,
        "vertical_names": list(BENCHMARK_VERTICALS.keys()),
    }
