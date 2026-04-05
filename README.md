# Bitsy — Status

> Last updated: 2026-04-05 00:44 UTC

## What is Bitsy?

An autonomous research-and-build loop for understanding how companies get discovered inside LLMs (Generative Engine Optimization / GEO). See [program.md](program.md) for full details.

## Progress

| Task | Description | Status | Rounds | Last Score |
|------|-------------|--------|--------|------------|
| 2.1 | How LLMs Decide What to Mention | PASSED | 1 | 10/10 |
| 2.2 | How GEO Tools Work Under the Hood | PASSED | 1 | 10/10 |
| 2.3 | The Economics | PASSED | 1 | 10/10 |
| 2.4 | The Competitive Landscape | PENDING | — | — |
| 2.5 | The Science | PENDING | — | — |
| 3.1 | Build Research Hub Pages | PENDING | — | — |
| 3.2 | Build Simulation Tool | PENDING | — | — |
| 3.3 | Build Cost Calculator | PENDING | — | — |

## Completed Research
- [How LLMs Decide What to Mention](research/2.1.md) — passed round 1
- [How GEO Tools Work Under the Hood](research/2.2.md) — passed round 1
- [The Economics](research/2.3.md) — passed round 1

## Latest Expert Feedback (Task 2.3 — Round 1)

```
VERDICT: PASS

---
verdict: PASS
score: 10/10
round: 1
---

### 1. Source Quality: 2/2

This is exceptional sourcing. The document cites 35+ distinct sources with URLs, organized into a clean source index (Section 12). The mix is exactly what I demand:

- **Primary sources**: Official API pricing pages for all four major providers (OpenAI, Anthropic, Google, Perplexity), with direct links to rate limit documentation.
- **Financial data from SEC filings**: Semrush investor relations page (NASDAQ: SEMR) for revenue, ARPU, and growth metrics — not some blogger's guess.
- **Vendor pricing pages**: Direct links to AthenaHQ, Otterly.AI, Peec AI, Rankscale, Profound, Scrunch, Sellm — first-party pricing, not secondhand summaries.
- **Industry benchmarks**: First Page Sage for GEO-specific CAC data, Dimension Market Research for market sizing, Menlo Ventures for market trends.
- **Technical references**: AWS architecture patterns, Redis LLMOps guide, inference.net batch vs. real-time analysis.

No source is a listicle or content farm. The Geoptie and ZipTie.dev tool comparisons are borderline, but they're used alongside direct vendor pricing pages, not as sole sources. Acceptable.

### 2. Completeness: 2/2

Checking every sub-question from the task spec:

- **Cost per API call across models (GPT-4o, GPT-4o-mini, Claude Sonnet, Claude Haiku, Gemini Pro, Gemini Flash, Perplexity Sonar)**: ANSWERED — Section 1 covers all specified models plus extras (GPT-4.1 series, Grok, Gemini 3.x previews). Includes input/output/batch/cached pricing. Includes rate limits by tier. Goes beyond the spec.
- **Cost modeling: X queries x Y models x Z samples/day = $/month**: ANSWERED — Section 3 provides four distinct scenarios (Small SaaS, Enterprise, Tryscope-style, Budget MVP) with explicit formulas: brands x queries x models x samples x days = queries/month, then priced across model strategies.
- **Where can you cut costs without losing signal?**: ANSWERED — Section 4 devotes 7 sub-sections to this: tiered models, batch API, prompt caching, semantic caching, low-temperature sampling, smart scheduling, and a combined impact table. Each with specific savings percentages.
- **Comparison to traditional SEO tool pricing (Semrush $130-500/mo, Ahrefs $99-999/mo)**: ANSWERED — Section 6 provides current pricing for Semrush, Ahrefs, and Moz with annual discounts and hidden costs. Includes Semrush public financial data (ARR, ARPU, AI revenue contribution). Side-by-side comparison table (Section 6.3).
- **Break-even analysis: at what price point does a GEO SaaS become viable?**: ANSWERED — Section 7 provides unit economics at three price points ($99, $199, $499), annual cost structure across 3 years, revenue projections by month, and a specific break-even point (~230 customers at $199/mo, month 22). Includes CAC benchmarks and market sizing.
```

## How to Run

```bash
./controller.sh
```

See [program.md](program.md) for full architecture details.
