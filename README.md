# Bitsy — Status

> Last updated: 2026-04-05 02:12 UTC

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
| 3.3 | Build Cost Calculator | IN PROGRESS | 1 | 9/10 |

## Completed Research
- [How LLMs Decide What to Mention](research/2.1.md) — passed round 1
- [How GEO Tools Work Under the Hood](research/2.2.md) — passed round 1
- [The Economics](research/2.3.md) — passed round 1
- [The Competitive Landscape](research/2.4.md) — passed round 1
- [The Science](research/2.5.md) — passed round 1
- Build Simulation Tool — passed round 1

## Latest Expert Feedback (Task 3.3 — Round 1)

```
VERDICT: FAIL

---
verdict: FAIL
score: 9/10
round: 1
---

### 1. Builds Clean: 2/2

`npm run build` succeeds with zero errors, zero warnings. No TypeScript errors. All routes compile and generate static pages correctly. The calculator page at `/calculator` is 139 B with 98.1 kB first load JS — reasonable size. No console errors expected at runtime based on code review.

### 2. Content Accuracy: 1/2

**Pricing data is accurate.** Every model's `costPerQuery`, `inputPer1M`, and `outputPer1M` in `CostCalculator.tsx` matches the approved Research 2.3 exactly:
- GPT-4.1-nano: $0.10/$0.40 per 1M → $0.0002/query ✓
- Claude Haiku 4.5: $1.00/$5.00 per 1M → $0.0026/query ✓
- Perplexity Sonar: $1.00/$1.00 per 1M + $0.008/request (medium context) ✓
- All other models verified ✓

The optimization strategies section accurately represents the research: tiered (90-95%), batch (50%), prompt caching (50-90%), semantic caching (30-73%).

**CRITICAL BUG: The "Compared to GEO SaaS Tools" section is mathematically wrong.** It multiplies `results.queriesPerMonth` by the SaaS per-prompt cost. But `queriesPerMonth` includes the model × sample amplification factor:

```
queriesPerMonth = brands × queriesPerBrand × modelCount × samplesPerQuery × pollingFrequency × 30
```

SaaS tools define a "prompt" as a single user-level query (e.g., "best CRM for small business"), NOT the total API calls across all models and samples. When Otterly says "15 prompts" in their $29/mo plan, that means 15 queries to their platform — they handle multi-model querying internally.
```

## How to Run

```bash
./controller.sh
```

See [program.md](program.md) for full architecture details.
