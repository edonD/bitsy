# Bitsy — Status

> Last updated: 2026-04-05 00:33 UTC

## What is Bitsy?

An autonomous research-and-build loop for understanding how companies get discovered inside LLMs (Generative Engine Optimization / GEO). See [program.md](program.md) for full details.

## Progress

| Task | Description | Status | Rounds | Last Score |
|------|-------------|--------|--------|------------|
| 2.1 | How LLMs Decide What to Mention | PASSED | 1 | 10/10 |
| 2.2 | How GEO Tools Work Under the Hood | PASSED | 1 | 10/10 |
| 2.3 | The Economics | PENDING | — | — |
| 2.4 | The Competitive Landscape | PENDING | — | — |
| 2.5 | The Science | PENDING | — | — |
| 3.1 | Build Research Hub Pages | PENDING | — | — |
| 3.2 | Build Simulation Tool | PENDING | — | — |
| 3.3 | Build Cost Calculator | PENDING | — | — |

## Completed Research
- [How LLMs Decide What to Mention](research/2.1.md) — passed round 1
- [How GEO Tools Work Under the Hood](research/2.2.md) — passed round 1

## Latest Expert Feedback (Task 2.2 — Round 1)

```
VERDICT: PASS

---
verdict: PASS
score: 10/10
round: 1
---

### 1. Source Quality: 2/2

61 sources cited, all with URLs. The source mix is exceptional:
- **10 academic papers** including the original GEO paper (KDD 2024), E-GEO, C-SEO Bench (NeurIPS D&B 2025), the non-determinism study (arxiv 2408.04667), and manipulation papers.
- **6 open-source repositories** with code-level analysis (Bright Data tracker, Gego, GetCito, E-GEO, C-SEO Bench, original GEO code).
- **4 API documentation sources** (OpenAI, Anthropic, Google, Perplexity).
- **12+ commercial tool primary sources** (Tryscope, Sellm, AthenaHQ, Otterly, Profound, Scrunch, Peec, Goodie, Knowatoa, LLM Pulse).
- **Technical blogs** from Cameron Wolfe (statistics), iPullRank (architecture), Foundation Inc. (metrics), Discovered Labs (citation patterns).

No listicles. No content farm filler. Every source is either a primary source (paper, docs, API reference, code repo) or substantive secondary analysis.

### 2. Completeness: 2/2

Every sub-question from the task spec is answered substantively:

- **Polling architecture — how do tools like Tryscope, AthenaHQ, Otterly poll LLMs?** ANSWERED. Section 5 provides deep dives on all three plus 7 additional tools. Distinguishes three fundamental approaches (browser scraping, direct API, hybrid). Includes actual code from Bright Data's open-source implementation, database schemas, and scheduling logic.

- **Statistical methods — how many samples per query are needed for confidence?** ANSWERED. Section 2 covers: LLM response variance quantified (up to 15% at temperature=0), sample size requirements (353 unique prompts / 1,059 API calls for 95% CI), Bernoulli SE formula, variance decomposition, paired-difference tests, CLT failure below n=100, and Tryscope's 50x/day approach.

- **Response parsing — how do you extract brand mentions, sentiment, position from free text?** ANSWERED. Section 1 covers five distinct approaches: string matching (with code), spaCy NER (with code), LLM-as-judge (Sellm's 4-dimensional extraction, LLM Pulse's 5-point scale), position/ranking extraction (Foundation Inc.'s Generative Position metric), and native structured output (2026 best practice).

- **Multi-model comparison — how do you normalize results across GPT, Claude, Gemini, Perplexity?** ANSWERED. Section 3 quantifies citation pattern differences (Perplexity 21.87 avg citations vs ChatGPT ~7), architectural differences (index strategy, retrieval, citation style per platform), source preference divergence (ChatGPT favors Wikipedia 47.9%, Perplexity favors Reddit 46.7%), and normalization methodology (Foundation Inc.'s weighted composite + second GEO paper's Coverage@k and Jaccard index).
```

## How to Run

```bash
./controller.sh
```

See [program.md](program.md) for full architecture details.
