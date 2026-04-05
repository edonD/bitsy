# Bitsy — Status

> Last updated: 2026-04-05 01:06 UTC

## What is Bitsy?

An autonomous research-and-build loop for understanding how companies get discovered inside LLMs (Generative Engine Optimization / GEO). See [program.md](program.md) for full details.

## Progress

| Task | Description | Status | Rounds | Last Score |
|------|-------------|--------|--------|------------|
| 2.1 | How LLMs Decide What to Mention | PASSED | 1 | 10/10 |
| 2.2 | How GEO Tools Work Under the Hood | PASSED | 1 | 10/10 |
| 2.3 | The Economics | PASSED | 1 | 10/10 |
| 2.4 | The Competitive Landscape | PASSED | 1 | 10/10 |
| 2.5 | The Science | PENDING | — | — |
| 3.1 | Build Research Hub Pages | PENDING | — | — |
| 3.2 | Build Simulation Tool | PENDING | — | — |
| 3.3 | Build Cost Calculator | PENDING | — | — |

## Completed Research
- [How LLMs Decide What to Mention](research/2.1.md) — passed round 1
- [How GEO Tools Work Under the Hood](research/2.2.md) — passed round 1
- [The Economics](research/2.3.md) — passed round 1
- [The Competitive Landscape](research/2.4.md) — passed round 1

## Latest Expert Feedback (Task 2.4 — Round 1)

```
VERDICT: PASS

---
verdict: PASS
score: 10/10
round: 1
---

### 1. Source Quality: 2/2

72 sources cited in a dedicated Source Index. The mix is excellent:
- **Primary sources**: Fortune, TechCrunch, AdExchanger, PR Newswire, GlobeNewsWire for funding/company data. Official pricing pages for every tool (Evertune, Peec AI, Otterly, Scrunch, AthenaHQ, etc.). GitHub repositories with star counts.
- **Secondary sources**: G2 reviews, Capterra, Rankability reviews, industry analysis blogs.
- **Academic/research repos**: GEO-optim/GEO (Princeton), AutoGEO (CMU/ICLR 2026), Awesome-GEO.
- **Revenue data**: GetLatka for Otterly ($770K), AthenaHQ ($990K), Goodie AI ($1.2M).

No source is a content farm listicle used as a primary authority. Review aggregator sites (G2, Capterra) are used appropriately for user complaint data, not as substitutes for primary research.

### 2. Completeness: 2/2

Every sub-question from the task spec is answered substantively:

- **"Map every GEO/LLMO tool: name, pricing, features, funding, team size"** — ANSWERED. 40+ tools mapped across 8 tiers with structured tables for each. Pricing is specific to the dollar/euro. Funding amounts include round details and lead investors. Team sizes provided where available. Client names included (Target, Figma, Walmart, Chanel, ElevenLabs, etc.).
- **"What's missing in the market? Where are the gaps?"** — ANSWERED. Section 14.1 identifies 7 specific gaps: pre-publish simulation, revenue attribution, real-time alerting, e-commerce GEO, multi-language depth, open standards, statistical rigor.
- **"What do users complain about in existing tools?"** — ANSWERED. Section 14.2 identifies 5 structural complaints with specific examples, direct quotes ("Don't just tell me I'm not showing up — tell me what to fix"), and tool-specific complaints (Profound's $499/50 prompts, Ahrefs' inconsistent accuracy, BrightEdge's $50K+ contracts).
- **"Open-source alternatives — does anything exist on GitHub?"** — ANSWERED. Section 14.3 covers 15 open-source projects across 4 categories: dedicated GEO monitors (AICW, geo-aeo-tracker, AiCMO, GetCito, Citatra), multi-LLM libraries (LiteLLM, ChainForge, LLM Council, prompto), academic repos (GEO-optim, AutoGEO, Awesome-GEO), and content linters (geo-lint, GEO Optimizer Skill, GEO Analyzer).

### 3. Depth: 2/2

This goes well beyond surface-level:
```

## How to Run

```bash
./controller.sh
```

See [program.md](program.md) for full architecture details.
