# Bitsy

**Simulate how LLMs find, rank, and recommend companies — before publishing.**

Inspired by tools like [Tryscope](https://tryscope.app/), Bitsy is an open-source engine for simulating and measuring brand visibility inside LLM-generated responses. While traditional SEO asks "where do I rank on Google?", Bitsy asks **"does the AI even mention me, and what does it say?"**

---

## The Problem

The $80B+ SEO market is cracking. Users are shifting from search engines to conversational AI. ChatGPT, Perplexity, Claude, and Gemini now answer questions that used to drive clicks to websites. Companies need to understand:

1. **Am I being mentioned?** When someone asks an LLM "what's the best project management tool?", does my product appear?
2. **In what context?** Am I the top recommendation, a footnote, or absent entirely?
3. **How stable is it?** LLM outputs are probabilistic — does my brand show up 90% of the time or 10%?
4. **What influences it?** Which sources, content patterns, and entity signals drive inclusion or exclusion?
5. **Can I test changes before publishing?** If I rewrite my landing page, will the AI treat me differently?

Traditional SEO tools (Semrush, Ahrefs, Moz) don't answer these questions. A new category — **Generative Engine Optimization (GEO)** — is emerging, but most tools are post-hoc monitors. Bitsy focuses on **simulation and pre-publication testing**.

---

## Core Concepts

### GEO vs SEO

| Dimension | Traditional SEO | GEO (what Bitsy targets) |
|-----------|----------------|--------------------------|
| Goal | Rank on page 1 of search results | Be cited/mentioned in AI answers |
| Success metric | Click-through rate, position | Share of voice, mention rate, sentiment |
| Query style | ~4 keywords | ~23 words, conversational |
| Key signals | Backlinks, keywords, domain authority | Content structure, entity clarity, evidence density |
| Feedback loop | Days/weeks via crawl indexing | Probabilistic, varies per request |

### Key Metrics Bitsy Should Track

- **Share of Voice (SOV)**: How often brand X appears vs. competitors for a query set
- **Mention Position**: First recommendation vs. buried in a list vs. absent
- **Sentiment**: Positive, neutral, negative framing of the brand
- **Citation Rate**: How often the LLM links back to or names the source
- **Consistency Score**: Variance across repeated identical queries (statistical confidence)
- **Hallucination Flag**: Whether the LLM says something factually wrong about the brand

---

## Architecture

### Phase 1 — Query Engine

Build a system that takes a set of **personas** and **prompts**, runs them against multiple LLMs, and collects structured results.

```
Input:
  - Company: "Acme CRM"
  - Competitors: ["Salesforce", "HubSpot", "Pipedrive"]
  - Persona: "VP of Sales at a 200-person SaaS company"
  - Queries:
      - "What's the best CRM for mid-market SaaS?"
      - "Compare CRM tools for a growing sales team"
      - "Which CRM has the best pipeline management?"

Output (per query, per model, per run):
  - brands_mentioned: ["Salesforce", "HubSpot", "Acme CRM"]
  - position: { "Acme CRM": 3 }
  - sentiment: { "Acme CRM": "neutral" }
  - citations: { "Acme CRM": null, "Salesforce": "salesforce.com" }
  - raw_response: "..."
```

**Components:**

1. **Prompt Builder** — Takes persona + query template and produces a realistic user prompt. Supports variable injection (industry, company size, use case).
2. **LLM Runner** — Calls ChatGPT, Claude, Gemini, and Perplexity APIs. Handles rate limiting, retries, and cost tracking. Each query is run N times (default 50) for statistical significance.
3. **Response Parser** — Extracts structured data from free-text LLM responses: brand mentions, ordering, sentiment, citations, and factual claims.
4. **Storage** — Stores raw responses and parsed results in SQLite for local use, with optional Postgres for teams.

### Phase 2 — Analysis Dashboard

Turn raw polling data into actionable insights.

**Views:**

1. **Brand Scoreboard** — Side-by-side SOV comparison across models and query sets. Shows trends over time.
2. **Query Explorer** — Drill into individual queries. See every raw response, parsed mentions, and variance.
3. **Model Comparison** — How does ChatGPT's view of your brand differ from Claude's or Gemini's?
4. **Consistency Map** — Heatmap showing which queries produce stable mentions vs. volatile ones.
5. **Hallucination Report** — Flags factually incorrect claims about your company across all responses.

**Tech:** Simple web UI. React + Recharts for visualizations. API layer in Python (FastAPI).

### Phase 3 — Pre-Publication Simulator

The core differentiator. Let users test content changes before publishing.

**How it works:**

1. User provides a **content diff** — e.g., new landing page copy, updated docs, a blog post draft.
2. Bitsy injects this content into the LLM context (via system prompts or RAG-style retrieval) to simulate what would happen if the LLM had indexed it.
3. Runs the same query set against the modified context.
4. Produces a **before/after comparison**: did the content change improve or hurt visibility?

**Limitations to document clearly:**
- This is a simulation, not a guarantee. Real LLM training data pipelines are opaque.
- Injection via context window approximates but doesn't replicate actual training/indexing.
- Results are directional, not definitive.

### Phase 4 — Optimization Recommendations

Based on analysis of what content patterns correlate with higher mention rates:

- **Entity clarity**: Is your brand name unambiguous? Does your content clearly state what you do?
- **Evidence density**: Do you cite stats, benchmarks, case studies that LLMs can parrot?
- **Structured data**: Do you use schema.org markup, FAQ sections, comparison tables?
- **Source authority**: Are you cited by sources the LLMs trust?
- **Content freshness**: How recently was your content updated?

Generate actionable suggestions: "Add a comparison table to your pricing page" or "Your product description lacks quantitative claims — add benchmark data."

---

## Technical Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Language | Python 3.12+ | Ecosystem for LLM APIs, data processing |
| LLM APIs | OpenAI, Anthropic, Google AI, Perplexity | Cover the big four |
| Response Parsing | Claude as structured extractor | Best at following extraction schemas |
| Database | SQLite (local) / Postgres (team) | Simple default, scalable option |
| API | FastAPI | Async, fast, typed |
| Frontend | React + Vite + Recharts | Lightweight, good charting |
| Scheduling | APScheduler or cron | For recurring polling runs |
| Cost Tracking | Built-in token counter | LLM API costs add up fast |

---

## Data Model

```
Company
  - id, name, domain, description
  - competitors: [Company]

QuerySet
  - id, name, company_id
  - queries: [Query]

Query
  - id, text, persona, variables

Run
  - id, query_id, model, timestamp, run_number

Response
  - id, run_id, raw_text, latency_ms, token_count, cost_usd

Mention
  - id, response_id, brand, position, sentiment, citation_url, is_hallucination

Snapshot
  - id, company_id, date, model
  - sov, avg_position, mention_rate, sentiment_avg, consistency_score
```

---

## Polling Strategy

LLM responses are non-deterministic. A single query tells you almost nothing. Bitsy uses **repeated sampling** to build statistical confidence:

- Each query is run **50 times per model per day** (configurable).
- Results are aggregated into daily snapshots with confidence intervals.
- Week-over-week trends require at least 7 days of data.
- Cost estimate: 50 runs x 4 models x 20 queries = 4,000 API calls/day. At ~$0.01/call average, that's ~$40/day or ~$1,200/month for a single company tracking set.

**Cost optimization:**
- Use cheaper models (GPT-4o-mini, Haiku) for high-volume polling.
- Use flagship models (GPT-4o, Opus, Gemini Pro) for weekly deep-dive runs.
- Cache identical responses to detect when models update.

---

## CLI-First Design

Bitsy starts as a CLI tool. No UI required to get value.

```bash
# Initialize a project
bitsy init --company "Acme CRM" --competitors "Salesforce,HubSpot,Pipedrive"

# Add queries
bitsy add-query "What's the best CRM for mid-market SaaS?" --persona "VP Sales"

# Run a single sweep
bitsy run --models gpt-4o,claude-sonnet,gemini-pro --samples 50

# View results
bitsy report --format table
bitsy report --format json > results.json

# Compare over time
bitsy trend --days 30

# Pre-publish test
bitsy simulate --content ./new-landing-page.md --compare
```

---

## What Success Looks Like

A user should be able to:

1. **In 5 minutes**: Install Bitsy, configure API keys, define a company + 5 queries, and run a first sweep.
2. **In 1 hour**: Have a statistically meaningful baseline of their brand's LLM visibility across 4 models.
3. **In 1 week**: See trend data showing how their visibility changes (or stays stable) day over day.
4. **In 1 sprint**: Use the pre-publication simulator to A/B test content changes and pick the version that improves LLM mentions.

---

## Open Questions

- **Legal/ToS**: Running thousands of API calls for competitive intelligence may bump against provider ToS. Document clearly and let users bring their own keys.
- **Perplexity access**: Perplexity doesn't have a public chat completions API in the same way. May need to use their Sonar API or scrape (ToS risk).
- **Ground truth**: Without knowing what's actually in LLM training data, how do we validate that our simulations are meaningful? Need to build a calibration dataset.
- **Multi-language**: GEO varies by language. A brand might dominate English queries but be invisible in Spanish. Scope for v2.
- **Local models**: Could Bitsy run against local models (Llama, Mistral) for free baseline testing? Worth exploring.

---

## Competitive Context

| Tool | Focus | Price | Bitsy Difference |
|------|-------|-------|-----------------|
| Tryscope | Pre-publish A/B testing | Custom | Bitsy is open-source, CLI-first |
| AthenaHQ | Full-stack monitoring | $295-900/mo | Bitsy is free, self-hosted |
| Otterly AI | Brand mention tracking | From $29/mo | Bitsy adds pre-publish simulation |
| Semrush AIO | Enterprise AI visibility | Enterprise pricing | Bitsy is lightweight, focused |
| LLMClicks | Mention + hallucination tracking | From $49/mo | Bitsy is open, extensible |

Bitsy's niche: **open-source, CLI-first, simulation-focused GEO tool for developers and technical marketers.**
