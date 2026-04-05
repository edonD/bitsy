# Bitsy — Status

> Last updated: 2026-04-05 02:18 UTC

## What is Bitsy?

An autonomous research-and-build loop for understanding how companies get discovered inside LLMs (Generative Engine Optimization / GEO). See [program.md](program.md) for full details.

## Progress

| Task | Description | Status | Rounds | Last Score |
|------|-------------|--------|--------|------------|
| 2.1 | How LLMs Decide What to Mention | PASSED | 1 | 10/10 |
| 2.2 | How GEO Tools Work Under the Hood | PASSED | 1 | 10/10 |
| 2.3 | The Economics | PASSED | 1 | 10/10 |
| 2.4 | The Competitive Landscape | PASSED | 1 | 10/10 |
| 2.5 | The Science | PASSED | 1 | 10/10 |
| 3.1 | Build Research Hub Pages | IN PROGRESS | 1 | 9/10 |
| 3.2 | Build Simulation Tool | PASSED | 1 | 10/10 |
| 3.3 | Build Cost Calculator | PASSED | 2 | 10/10 |

## Completed Research
- [How LLMs Decide What to Mention](research/2.1.md) — passed round 1
- [How GEO Tools Work Under the Hood](research/2.2.md) — passed round 1
- [The Economics](research/2.3.md) — passed round 1
- [The Competitive Landscape](research/2.4.md) — passed round 1
- [The Science](research/2.5.md) — passed round 1
- Build Simulation Tool — passed round 1
- Build Cost Calculator — passed round 2

## Latest Expert Feedback (Task 3.3 — Round 2)

```
VERDICT: PASS

---
verdict: PASS
score: 10/10
round: 2
---

### Previous Round Feedback Check

Both CRITICAL issues from Round 1 have been fully addressed:

1. **SaaS comparison base fixed.** Line 286: `promptsPerMonth = brands * queriesPerBrand * pollingFrequency * 30` correctly computes user-level prompts without model x sample amplification. The SaaS comparison section (lines 619-623) uses `results.promptsPerMonth` for all four SaaS tool calculations. Verified: with default settings (10 brands, 5 queries, 4 models, 3 samples, 1x/day), `promptsPerMonth` = 1,500 and `queriesPerMonth` = 18,000 — the SaaS section correctly uses 1,500.

2. **Markup claim corrected.** Lines 626-631 now state "1.5x-3x" for budget tools (Rankscale) and "20x-50x" for premium tools (Profound), with context that the premium covers parsing, dashboards, competitive insights, and managed infrastructure. Accurate and nuanced.

Additionally, the Worker also fixed two bugs that were present in earlier iterations:

3. **Tiered strategy batch discount bug fixed.** The `effectiveCost()` function (lines 261-268) now checks `model.batchDiscount < 1` per-model before applying the discount. Perplexity models (batchDiscount: 1) are correctly excluded from batch discounts in the tiered path, matching the non-tiered path behavior.

4. **Tryscope preset frequency fixed.** Line 160: `frequency: 50` now matches the "50 polls/day" label and Tryscope's actual polling behavior per Research 2.2.

### 1. Builds Clean: 2/2

`npm run build` succeeds with zero errors, zero warnings. `npx tsc --noEmit` returns clean — zero TypeScript errors. All 16 routes generate as static content. `/calculator` is 139B page + 98.3 kB first load JS. `/research/economics` shares the same bundle via the embedded `CostCalculator compact` variant. No runtime console errors expected based on code review — no unguarded property access, no missing dependencies in the `useMemo` hook (all 7 deps listed).

### 2. Content Accuracy: 2/2

All pricing data matches Research 2.3 exactly:
- GPT-4.1-nano: $0.10/$0.40 per 1M tokens -> $0.0002/query (verified)
```

## How to Run

```bash
./controller.sh
```

See [program.md](program.md) for full architecture details.
