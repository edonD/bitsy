# Bitsy — Status

> Last updated: 2026-04-05 01:17 UTC

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
| 3.1 | Build Research Hub Pages | PENDING | — | — |
| 3.2 | Build Simulation Tool | PENDING | — | — |
| 3.3 | Build Cost Calculator | PENDING | — | — |

## Completed Research
- [How LLMs Decide What to Mention](research/2.1.md) — passed round 1
- [How GEO Tools Work Under the Hood](research/2.2.md) — passed round 1
- [The Economics](research/2.3.md) — passed round 1
- [The Competitive Landscape](research/2.4.md) — passed round 1
- [The Science](research/2.5.md) — passed round 1

## Latest Expert Feedback (Task 2.5 — Round 1)

```
VERDICT: PASS

---
verdict: PASS
score: 10/10
round: 1
---

### 1. Source Quality: 2/2

25 distinct sources cited with URLs, including:
- **8 academic papers** with arXiv IDs (GEO paper [2311.09735], cognitive bias paper [2502.01349], two position bias papers, two RAG selection papers, RAG survey [2312.10997])
- **8 large-scale industry studies** from Profound (680M citations), Yext (17.2M citations), Ahrefs (17M citations), Seer Interactive (5,000+ URLs), Brandlight, SparkToro/Datos
- **3 analyst reports** from Gartner, Bain & Company, a16z
- **5 expert analysis sources** including Search Engine Land, Lily Ray, The Ad Spend
- **News sources** with primary testimony (Eddy Cue DOJ testimony via MacRumors/TechCrunch)

The source mix is excellent: primary academic papers, first-party industry data at massive scale, analyst reports, and skeptical/contrarian voices. No content farm listicles. No filler sources.

### 2. Completeness: 2/2

Checking against the task spec's required items:

- **"GEO: Generative Engine Optimization" paper**: ANSWERED — Section 1 covers this in extraordinary depth across 10 sub-sections (citation details, verbatim abstract, methodology, 9 strategies with exact percentages, visibility metrics, rank-specific results, domain-specific effectiveness, combination strategies, real-world validation, limitations).
- **Follow-up papers on LLM citation behavior**: ANSWERED — Section 5 covers 4 papers on cognitive biases, position bias (two papers), and cold-start recommendation bias, all with arXiv IDs and relevance to GEO.
- **a16z's "GEO over SEO" analysis**: ANSWERED — Section 4 covers the thesis, data points ($80B market, 10% Vercel signups from ChatGPT, query length comparison), market framing, and case study (Canada Goose).
- **Brandlight's research on traditional vs. AI search overlap**: ANSWERED — Section 2.4 covers the headline finding (90% of ChatGPT citations from outside Google's top 20), source diversity as strongest predictor, and specific examples.
- **Y Combinator's projections on search volume decline**: The specific YC source is not cited by name. However, the topic is comprehensively covered through Gartner (25% decline by 2026, 50% by 2028), Bain (60% zero-click), SparkToro (360 clicks per 1,000 searches), Ahrefs (58% CTR reduction), and Apple/Safari testimony. The Worker may have determined that no standalone YC projection exists as a citable document — the search volume decline topic is covered by stronger primary sources.
- **Papers on LLM recommendation bias, brand mention frequency, or RAG relevance**: ANSWERED — Section 5 covers recommendation bias (4 papers), Section 2 covers brand mention frequency (empirical studies at scale), and Section 7 covers RAG architecture and source selection science with 3 papers.
```

## How to Run

```bash
./controller.sh
```

See [program.md](program.md) for full architecture details.
