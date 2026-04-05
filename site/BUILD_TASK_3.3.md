# Build Task 3.3: Cost Calculator — Round 4

## What Was Built

An interactive cost estimation tool that lets users configure LLM brand monitoring parameters and see real-time monthly/annual cost projections. Deployed at two locations: a dedicated `/calculator` page and embedded within the `/research/economics` page.

## Round 4 Changes (Bug Fixes from Expert Round 1 Feedback)

### Previous Rounds (3): Tiered batch discount + Tryscope preset fixes (resolved)

### Bug Fix (CRITICAL): SaaS comparison now uses correct query count

**Problem**: The "Compared to GEO SaaS Tools" section multiplied `queriesPerMonth` (which includes model × sample amplification) by the SaaS per-prompt cost. But SaaS tools define a "prompt" as a single user-level query (e.g., "best CRM for small business"), NOT the total API calls across all models and samples. When Otterly says "15 prompts" in their $29/mo plan, they handle multi-model querying internally.

With default settings (10 brands, 5 queries, 4 models, 3 samples, 1 poll/day):
- Old (wrong): Used `queriesPerMonth` = 18,000 → Otterly: ~$27,000/mo
- New (correct): Uses `promptsPerMonth` = 10 × 5 × 1 × 30 = 1,500 → Otterly: ~$2,250/mo

**Fix** (CostCalculator.tsx useMemo block): Added a new computed value:
```
promptsPerMonth = brands * queriesPerBrand * pollingFrequency * 30
```
This represents the number of unique user-level queries (without model × sample amplification). The SaaS comparison section now uses `promptsPerMonth` instead of `queriesPerMonth`, and includes explanatory text clarifying the distinction between API calls and SaaS prompts.

### Bug Fix (CRITICAL): Markup claim corrected

**Problem**: The "10x to 1,000x markup" claim was inflated because the comparison base was wrong.

**Fix**: Updated the text to state the actual markup range of ~1.5x–3x for budget tools (like Rankscale at $0.017/prompt) to ~20x–50x for premium tools (like Profound at $9.98/prompt). Added context that the premium covers parsing, dashboards, competitive insights, and managed infrastructure.

## Pages Implemented

| Route | Content | Interactive |
|-------|---------|-------------|
| `/calculator` | Full cost calculator with explanation sections, optimization strategies, pricing assumptions, and sources | Yes — client component with sliders, checkboxes, presets |
| `/research/economics` | Existing economics page now includes embedded interactive calculator between Monthly Cost Modeling and Cost Optimization Strategies sections | Yes — compact variant of the same calculator |

## Calculator Features

### Input Controls
- **Brands to monitor**: Slider, 1-500 (default: 10)
- **Queries per brand**: Slider, 1-30 (default: 5)
- **Samples per query**: Slider, 1-30 (default: 3)
- **Polls per day**: Slider, 1-50 (default: 1)
- **Model selection**: Checkboxes for 11 models across 4 providers (OpenAI, Anthropic, Google, Perplexity)
- **Batch API toggle**: 50% discount on OpenAI/Anthropic/Google models (not Perplexity)
- **Tiered strategy toggle**: 90% budget / 9% mid / 1% flagship model split

### Quick Presets
| Preset | Configuration |
|--------|---------------|
| Startup MVP (5 brands) | 5 brands, 3 queries, 3 samples, 1x/day |
| Small Business (10 brands) | 10 brands, 5 queries, 3 samples, 1x/day |
| Agency (50 brands) | 50 brands, 8 queries, 3 samples, 1x/day |
| Enterprise (100 brands) | 100 brands, 10 queries, 5 samples, 1x/day |
| Tryscope-Style (50 polls/day) | 10 brands, 5 queries, 1 sample, 50x/day |

### Output Display
- **Summary cards**: Queries/month, queries/day, monthly cost, annual cost
- **Tiered strategy estimate**: Shows savings percentage when tiered strategy is enabled
- **Average cost per query**: Calculated across all selected models
- **Per-model breakdown table**: Queries, token cost, request fees, total cost per model
- **Dynamic recommendation**: Context-aware advice based on spend level
- **SaaS comparison**: Shows what the same query volume would cost on Rankscale, Otterly.AI, AthenaHQ, and Profound

### Model Data (11 models, all from Research 2.3)

| Model | Provider | Tier | Cost/Query | Batch Discount | Request Fee |
|-------|----------|------|-----------|----------------|-------------|
| GPT-4.1-nano | OpenAI | Budget | $0.0002 | 50% | - |
| GPT-4o-mini | OpenAI | Budget | $0.0003 | 50% | - |
| Gemini 2.5 Flash-Lite | Google | Budget | $0.0002 | 50% | - |
| Gemini 2.5 Flash | Google | Mid | $0.0013 | 50% | - |
| Claude Haiku 4.5 | Anthropic | Mid | $0.0026 | 50% | - |
| GPT-4o | OpenAI | Flagship | $0.0053 | 50% | - |
| GPT-4.1 | OpenAI | Flagship | $0.0042 | 50% | - |
| Claude Sonnet 4.6 | Anthropic | Flagship | $0.0078 | 50% | - |
| Gemini 2.5 Pro | Google | Flagship | $0.0051 | 50% | - |
| Perplexity Sonar | Perplexity | Mid | $0.0006 | None | $0.008/req |
| Perplexity Sonar Pro | Perplexity | Flagship | $0.0078 | None | $0.014/req |

## Component Architecture

| Component | Location | Purpose |
|-----------|----------|---------|
| `CostCalculator` | `src/components/CostCalculator.tsx` | Client component with all calculator logic |
| Calculator page | `src/app/calculator/page.tsx` | Server page wrapping CostCalculator |
| Economics page | `src/app/research/economics/page.tsx` | Imports CostCalculator with `compact` prop |
| Navigation | `src/components/Navigation.tsx` | Includes "Calculator" link |

### Calculation Logic
1. **Total API queries**: `brands * queriesPerBrand * modelCount * samplesPerQuery * pollingFrequency * 30`
2. **User-level prompts** (for SaaS comparison): `brands * queriesPerBrand * pollingFrequency * 30`
3. **Per-model cost**: `costPerQuery * perModelQueries + requestFee * perModelQueries`
4. **Batch discount**: Applied as `model.batchDiscount` multiplier only when `batchDiscount < 1` (excludes Perplexity)
5. **Tiered strategy**: Finds cheapest model object per tier, computes `effectiveCost()` with per-model batch discount awareness
6. **SaaS comparison**: Uses `promptsPerMonth` (not `queriesPerMonth`) as the base for SaaS tool cost estimates

## Build Status

```
npm run build — SUCCESS
Zero TypeScript errors
Zero warnings
12 routes generated as static content
/calculator: 139B page + ~98KB First Load JS
/research/economics: 139B page + ~98KB First Load JS
```

## Sources

All pricing data sourced from Research 2.3, which references:
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Anthropic Models & Pricing](https://platform.claude.com/docs/en/docs/about-claude/models)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Perplexity API Pricing](https://docs.perplexity.ai/guides/pricing)
- [Sellm — AI Search API Pricing Guide](https://sellm.io/post/ai-search-api-pricing-guide)
