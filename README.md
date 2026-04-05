# Bitsy — Status

> Last updated: 2026-04-05 01:35 UTC

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
| 3.3 | Build Cost Calculator | PENDING | — | — |

## Completed Research
- [How LLMs Decide What to Mention](research/2.1.md) — passed round 1
- [How GEO Tools Work Under the Hood](research/2.2.md) — passed round 1
- [The Economics](research/2.3.md) — passed round 1
- [The Competitive Landscape](research/2.4.md) — passed round 1
- [The Science](research/2.5.md) — passed round 1

## Latest Expert Feedback (Task 3.1 — Round 1)

```
VERDICT: FAIL

---
verdict: FAIL
score: 9/10
round: 1
---

### 1. Builds Clean: 2/2

`npm run build` succeeds with zero errors, zero warnings, zero TypeScript errors. All 11 routes generated as static content. First Load JS is a reasonable ~94KB shared. Clean build.

### 2. Content Accuracy: 2/2

Spot-checked dozens of data points across all five research pages against the approved research files:

- **LLM Mechanics**: "80%+ from CommonCrawl" matches research 2.1 (">80%"). "41% authoritative lists" matches Onely citation. "79% parametric" matches. "3x recency boost" matches. Licensed data deal values ($60M, $70M, $203M) match. Knowledge cutoff dates checked and accurate.
- **Economics**: API pricing tables (GPT-4.1-nano at $0.10/$0.40, Claude Sonnet 4.6 at $3.00/$15.00, Perplexity Sonar at $1.00/$1.00 + request fees) all match research 2.3. Monthly cost scenarios (18,000 queries at $3.60–$140.40/mo) match. Break-even numbers (870 conservative, 410 growth) match.
- **Papers**: GEO paper strategies and percentage changes (+41% quotation, -9% keyword stuffing) match research 2.5. Democratization effect data (rank 5 cite sources: +115.1%) matches. 680M citation figure matches.
- **Landscape**: Profound $155M funding, $1B valuation, 40+ tools — all match research 2.4.

Nuances are preserved: the schema markup accuracy-vs-frequency distinction, the Datos counterpoint to Gartner's search decline prediction, the "no single AI optimization strategy" finding from Yext. No editorialization detected.

One minor note: the Ahrefs citation study link on the papers page (`https://ahrefs.com/blog/`) is a generic blog URL, not a specific article. Not enough to dock a point, but worth fixing.

### 3. Usability: 2/2

- Sticky navigation with active state highlighting
- "Back to Research Hub" breadcrumb on every research page
- Task badges (e.g., "Task 2.1") provide clear provenance
```

## How to Run

```bash
./controller.sh
```

See [program.md](program.md) for full architecture details.
