# Build Task 3.3: Cost Calculator — Complete

## What Was Built

An interactive cost estimation tool that lets users configure LLM brand monitoring parameters and see real-time monthly/annual cost projections. Deployed at two locations: a dedicated `/calculator` page and embedded within the `/research/economics` page.

## Pages Implemented

| Route | Content | Interactive |
|-------|---------|-------------|
| `/calculator` | Full cost calculator with explanation sections, optimization strategies, pricing assumptions, and sources | Yes — client component with sliders, checkboxes, presets |
| `/research/economics` | Existing economics page now includes embedded interactive calculator between Monthly Cost Modeling and Cost Optimization Strategies sections | Yes — compact variant of the same calculator |

## Calculator Features

### Input Controls
- **Brands to monitor**: Slider, 1–500 (default: 10)
- **Queries per brand**: Slider, 1–30 (default: 5)
- **Samples per query**: Slider, 1–30 (default: 3)
- **Polls per day**: Slider, 1–50 (default: 1)
- **Model selection**: Checkboxes for 11 models across 4 providers (OpenAI, Anthropic, Google, Perplexity)
- **Batch API toggle**: 50% discount on OpenAI/Anthropic/Google models
- **Tiered strategy toggle**: 90% budget / 9% mid / 1% flagship model split

### Quick Presets
| Preset | Configuration |
|--------|---------------|
| Startup MVP (5 brands) | 5 brands, 3 queries, 3 samples, 1x/day |
| Small Business (10 brands) | 10 brands, 5 queries, 3 samples, 1x/day |
| Agency (50 brands) | 50 brands, 8 queries, 3 samples, 1x/day |
| Enterprise (100 brands) | 100 brands, 10 queries, 5 samples, 1x/day |
| Tryscope-Style (50 polls/day) | 10 brands, 5 queries, 1 sample, 1x/day |

### Output Display
- **Summary cards**: Queries/month, queries/day, monthly cost, annual cost
- **Tiered strategy estimate**: Shows savings percentage when tiered strategy is enabled
- **Average cost per query**: Calculated across all selected models
- **Per-model breakdown table**: Queries, token cost, request fees, total cost per model
- **Dynamic recommendation**: Context-aware advice based on spend level (under $20, $20-200, $200-1000, over $1000)
- **SaaS comparison**: Shows what the same query volume would cost on Rankscale, Otterly.AI, AthenaHQ, and Profound at their per-prompt rates

### Model Data (11 models, all from Research 2.3)

| Model | Provider | Tier | Cost/Query | Request Fee |
|-------|----------|------|-----------|-------------|
| GPT-4.1-nano | OpenAI | Budget | $0.0002 | — |
| GPT-4o-mini | OpenAI | Budget | $0.0003 | — |
| Gemini 2.5 Flash-Lite | Google | Budget | $0.0002 | — |
| Gemini 2.5 Flash | Google | Mid | $0.0013 | — |
| Claude Haiku 4.5 | Anthropic | Mid | $0.0026 | — |
| GPT-4o | OpenAI | Flagship | $0.0053 | — |
| GPT-4.1 | OpenAI | Flagship | $0.0042 | — |
| Claude Sonnet 4.6 | Anthropic | Flagship | $0.0078 | — |
| Gemini 2.5 Pro | Google | Flagship | $0.0051 | — |
| Perplexity Sonar | Perplexity | Mid | $0.0006 | $0.008/req |
| Perplexity Sonar Pro | Perplexity | Flagship | $0.0078 | $0.014/req |

All costs assume ~100 input tokens + ~500 output tokens per query, matching the Research 2.3 methodology.

## Component Architecture

| Component | Location | Purpose |
|-----------|----------|---------|
| `CostCalculator` | `src/components/CostCalculator.tsx` | Client component (`"use client"`) with all calculator logic |
| Calculator page | `src/app/calculator/page.tsx` | Server page wrapping CostCalculator with explanatory content |
| Economics page (updated) | `src/app/research/economics/page.tsx` | Now imports CostCalculator with `compact` prop |
| Navigation (updated) | `src/components/Navigation.tsx` | Added "Calculator" link |

### CostCalculator Props
- `compact?: boolean` — When `true`, hides the SaaS comparison section (used on economics page embed). Default: `false`.

### State Management
All state is local via `useState`. Calculations are memoized with `useMemo` to avoid recalculating on every render. No external state management needed.

### Calculation Logic
1. **Total queries**: `brands * queriesPerBrand * modelCount * samplesPerQuery * pollingFrequency * 30`
2. **Per-model cost**: `costPerQuery * perModelQueries + requestFee * perModelQueries`
3. **Batch discount**: Applied as 0.5x multiplier to token costs (not request fees)
4. **Tiered strategy**: Redistributes queries as 90% to cheapest budget model, 9% to cheapest mid, 1% to cheapest flagship among selected models

## Build Status

```
npm run build — SUCCESS
Zero TypeScript errors
Zero warnings
12 routes generated as static content
/calculator: 139B page + ~98KB First Load JS (shared)
/research/economics: 139B page + ~98KB First Load JS (shared, includes calculator bundle)
```

## Content Accuracy

Every pricing number in the calculator matches Research 2.3:
- OpenAI GPT-4.1-nano: $0.10/$0.40 per 1M tokens → $0.0002/query (matches Section 2 of research)
- Claude Sonnet 4.6: $3.00/$15.00 per 1M tokens → $0.0078/query (matches)
- Perplexity Sonar: $1.00/$1.00 per 1M + $5-12/1K request fees → $0.0006 + $0.008/req (matches)
- Tiered strategy savings: 90-95% (matches Section 4.1 of research)
- Batch API discount: 50% for OpenAI, Anthropic, Google (matches Section 4.2)
- Combined optimization savings: 90-97% (matches Section 4.7)
- SaaS comparison pricing: Rankscale $0.017, Otterly ~$1.50, AthenaHQ $0.083, Profound $9.98 (matches Section 5)

## Expert Round 1 Feedback — Issues Fixed

The Round 1 expert feedback for Task 3.1 identified two issues:

1. **[CRITICAL] Missing interactive cost calculator on /research/economics** — FIXED. The economics page now includes an embedded CostCalculator component with full interactivity (sliders, checkboxes, presets, real-time cost output).

2. **[MINOR] Generic Ahrefs blog URL** — This was a Task 3.1 issue and is outside the scope of Task 3.3.

## No Placeholders

- Zero "TODO" comments in any file
- Zero "coming soon" sections
- Zero placeholder data — all numbers come from approved Research 2.3
- All source URLs are real and linkable
- All interactive elements are fully functional

## Sources

All pricing data sourced from:
- [OpenAI API Pricing](https://openai.com/api/pricing/) — GPT-4.1-nano, GPT-4o-mini, GPT-4o, GPT-4.1 pricing
- [Anthropic Models & Pricing](https://platform.claude.com/docs/en/docs/about-claude/models) — Claude Sonnet 4.6, Haiku 4.5 pricing
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) — Gemini 2.5 Pro, Flash, Flash-Lite pricing
- [Perplexity API Pricing](https://docs.perplexity.ai/guides/pricing) — Sonar, Sonar Pro token + request pricing
- [Sellm — AI Search API Pricing Guide](https://sellm.io/post/ai-search-api-pricing-guide) — SaaS per-prompt cost comparison
- [Redis — LLM Cost Optimization Guide](https://redis.io/blog/large-language-model-operations-guide/) — Semantic caching, 73% cost reduction
- [Prem AI — LLM Cost Optimization Guide](https://blog.premai.io/llm-cost-optimization-8-strategies-that-cut-api-spend-by-80-2026-guide/) — Combined optimization strategies
