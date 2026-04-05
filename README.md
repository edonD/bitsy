# Bitsy — Status

> Last updated: 2026-04-05 00:18 UTC

## What is Bitsy?

An autonomous research-and-build loop for understanding how companies get discovered inside LLMs (Generative Engine Optimization / GEO). See [program.md](program.md) for full details.

## Progress

| Task | Description | Status | Rounds | Last Score |
|------|-------------|--------|--------|------------|
| 2.1 | How LLMs Decide What to Mention | PASSED | 1 | 10/10 |
| 2.2 | How GEO Tools Work Under the Hood | PENDING | — | — |
| 2.3 | The Economics | PENDING | — | — |
| 2.4 | The Competitive Landscape | PENDING | — | — |
| 2.5 | The Science | PENDING | — | — |
| 3.1 | Build Research Hub Pages | PENDING | — | — |
| 3.2 | Build Simulation Tool | PENDING | — | — |
| 3.3 | Build Cost Calculator | PENDING | — | — |

## Completed Research
- [How LLMs Decide What to Mention](research/2.1.md) — passed round 1

## Latest Expert Feedback (Task 2.1 — Round 1)

```
VERDICT: PASS

---
verdict: PASS
score: 10/10
round: 1
---

### 1. Source Quality: 2/2

36 sources cited, all with URLs. 7 academic papers from top venues (KDD 2024, ICLR 2025, ACL 2025, SIGIR 2024, SIGIR 2025, EMNLP 2023, CMU/CAIS). Primary sources include NVIDIA's Nemotron-CC developer blog, HuggingFace's RLHF documentation, CommonCrawl's own blog, and Wikimedia Foundation. Secondary sources include substantive data-driven analyses (Digital Bloom's 177M-source report, Search Atlas's 5.5M-response analysis, Onely's December 2025 study). a16z's "GEO Over SEO" piece is cited with direct quotes. No source is a listicle or content farm. The mix of academic, technical, industry data, and market analysis is exactly what this topic demands.

### 2. Completeness: 2/2

Checking every sub-question from the task spec:

- **How do training data pipelines work? (CommonCrawl, licensed datasets, RLHF)** — ANSWERED. Section 1 covers the CCNet pipeline in 5 stages with specific numbers (8.7 TiB, ~70% dedup removal), NVIDIA's Nemotron-CC with 28 heuristic filters and 6.3T tokens, RLHF's 3-stage process, and licensed data deals (Reddit $60M/year Google, ~$70M/year OpenAI). Thorough.

- **What makes a company "stick" in an LLM's weights vs. get forgotten?** — ANSWERED. Section 2 covers parametric vs. RAG dual system (79%/21% split), academic evidence on frequency-driven memorization (Wang et al. ICLR 2025, Christoph et al. ACL 2025), the "substitution effect," and Onely's signal weighting (41% authoritative lists, 18% awards, 16% reviews, ~0% traditional SEO). Substantive.

- **Role of recency — how often are models retrained? What's the data cutoff lag?** — ANSWERED. Section 3 provides a current knowledge cutoff table for 9 models, quantified recency bias from SIGIR 2025 (up to 4.78 years shift, 25.23% reversal rate), Seer Interactive's content age breakdown (65% <1 year), model-specific citation year distributions, and Perplexity's real-time architecture. The 3x boost for 14-day freshness is a concrete, actionable finding.

- **Role of frequency — does appearing on 1,000 pages matter more than appearing on 10 authoritative ones?** — ANSWERED. Section 4 provides a direct answer with specific thresholds: <50 high-trust mentions = 72% failure rate, "Best of" lists = 400% boost, 85% of mentions from third-party pages, correlation data (brand search volume 0.334, domain rank 0.25, backlinks weak). The "Patagonia Effect" and cross-platform fragmentation (62% disagreement) add depth.

- **Role of structured data — do schema.org, JSON-LD, FAQ pages help?** — ANSWERED. Section 5 provides a nuanced resolution of contradictory evidence: Search Atlas (748K queries, no frequency effect) vs. GetAISO (controlled experiment, 30% quality improvement). Correctly resolves: schema improves accuracy but not frequency. Includes the Slowik caveat about zero peer-reviewed studies on JSON-LD processing. This is the kind of honest, evidence-weighed answer the task demands.

- **Find and cite: Academic papers (GEO paper), a16z blog, Search Engine Land, industry reports** — ANSWERED. GEO paper (Section 6) with full methodology and all 9 strategies tested. a16z (Section 8) with direct quotes. Search Engine Land (Sources Index). Industry reports from Digital Bloom, Onely, Seer Interactive, Search Atlas, MetricsRule, INSEAD, and Metricus.

No sub-question is hand-waved. Each has multiple paragraphs with specific data points.
```

## How to Run

```bash
./controller.sh
```

See [program.md](program.md) for full architecture details.
