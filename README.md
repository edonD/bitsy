# Bitsy — Status

> Last updated: 2026-04-05 01:59 UTC

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
| 3.3 | Build Cost Calculator | PASSED | 3 | 10/10 |

## Completed Research
- [How LLMs Decide What to Mention](research/2.1.md) — passed round 1
- [How GEO Tools Work Under the Hood](research/2.2.md) — passed round 1
- [The Economics](research/2.3.md) — passed round 1
- [The Competitive Landscape](research/2.4.md) — passed round 1
- [The Science](research/2.5.md) — passed round 1
- Build Simulation Tool — passed round 1
- Build Cost Calculator — passed round 3

## Latest Expert Feedback (Task 3.2 — Round 1)

```
VERDICT: PASS

---
verdict: PASS
score: 10/10
round: 1
---

### 1. Builds Clean: 2/2

`npm run build` succeeds with zero errors, zero warnings, zero TypeScript errors. All 16 routes generate as static content. No ESLint configured, but the spec doesn't require it — TypeScript strict checking passes cleanly. Bundle sizes are reasonable (92-99KB first load JS for simulation pages).

Verified: `npx tsc --noEmit` produces no output (clean).

### 2. Content Accuracy: 2/2

Every key number in the simulation engine traces back to the approved research:

| Claim in Code | Research Source | Verified |
|---|---|---|
| ChatGPT ~3.5 brands/response | Research 2.1 line 113: "Only 3–4 brands are cited per ChatGPT response" | ✓ |
| Perplexity ~13 brands/response | Research 2.2 line 234: "Perplexity 21.87" (avg citations, adjusted for brand mentions vs total citations) | ✓ |
| 15% accuracy variance at temp=0 | Research 2.2 line 134: "Accuracy variations: Up to 15% across runs at temperature=0" | ✓ |
| 12% cross-model URL overlap | Research 2.2 line 239: "Only 12% of URLs cited by AI tools overlap with Google's top 10 results" | ✓ |
| Share of Model (SoM) as primary metric | Research 2.4: Used by Profound, Peec AI, Scrunch as industry standard | ✓ |
| 50x/day polling reference | Research 2.2: Tryscope polling cadence | ✓ |
| 18-36 month parametric updates | Research 2.1: Knowledge cutoff/retraining cadence | ✓ |

The methodology notes on the results page and trends page correctly attribute these numbers to the specific research tasks. No editorializing or misrepresentation detected.
```

## How to Run

```bash
./controller.sh
```

See [program.md](program.md) for full architecture details.
