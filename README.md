# Bitsy — Status

> Last updated: 2026-04-05 01:48 UTC

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
| 3.2 | Build Simulation Tool | PENDING | — | — |
| 3.3 | Build Cost Calculator | PASSED | 3 | 10/10 |

## Completed Research
- [How LLMs Decide What to Mention](research/2.1.md) — passed round 1
- [How GEO Tools Work Under the Hood](research/2.2.md) — passed round 1
- [The Economics](research/2.3.md) — passed round 1
- [The Competitive Landscape](research/2.4.md) — passed round 1
- [The Science](research/2.5.md) — passed round 1
- Build Cost Calculator — passed round 3

## Latest Expert Feedback (Task 3.3 — Round 3)

```
VERDICT: PASS

---
verdict: PASS
score: 10/10
round: 3
---

### 1. Builds Clean: 2/2

`npm run build` succeeds with zero errors, zero warnings, zero TypeScript errors. 12 routes generated as static content. `/calculator` at 139B + ~98KB First Load JS. Clean.

### 2. Content Accuracy: 2/2

All pricing data verified against Research 2.3:

- GPT-4.1-nano: $0.10/$0.40 per 1M -> $0.0002/query at 100in+500out -- correct
- Claude Sonnet 4.6: $3.00/$15.00 -> $0.0078/query -- correct
- Perplexity Sonar: $1.00/$1.00 per 1M + $0.008/req -- correct
- Claude Haiku 4.5: $1.00/$5.00 -> $0.0026/query -- correct
- Gemini 2.5 Pro: $1.25/$10.00 -> $0.0051/query -- correct
- Batch discount: 50% for OpenAI/Anthropic/Google, none for Perplexity -- correct
- SaaS comparison pricing (Rankscale $0.017, Otterly ~$1.50, AthenaHQ $0.083, Profound $9.98) -- matches Research 2.3 Section 5
- Tiered strategy 90/9/1 split -- matches Research 2.3 Section 4.1

Query formula `brands x queries x models x samples x frequency x 30` is correctly implemented and matches the research methodology. Nuances preserved (Perplexity dual-cost structure, batch API 24h delay caveat, temperature/sample relationship).

### 3. Usability: 2/2

- Preset buttons for 5 common configurations -- instant access, no slider fiddling
```

## How to Run

```bash
./controller.sh
```

See [program.md](program.md) for full architecture details.
