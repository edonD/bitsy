# Build Task 3.3: Cost Calculator — Round 3

## What Was Built

An interactive cost estimation tool that lets users configure LLM brand monitoring parameters and see real-time monthly/annual cost projections. Deployed at two locations: a dedicated `/calculator` page and embedded within the `/research/economics` page.

## Round 3 Changes (Bug Fixes)

### Bug 1 Fix (CRITICAL): Tiered strategy batch discount now respects per-model batchDiscount

**Problem**: The tiered strategy path applied a blanket `batchMult = 0.5` to all tiers when Batch API was enabled, ignoring per-model `batchDiscount` values. Perplexity models have `batchDiscount: 1` (no batch discount available), but the tiered path would incorrectly halve their costs.

**Fix** (CostCalculator.tsx lines 250-273): Refactored the tiered calculation to:
1. Find the cheapest **model object** (not just cost number) in each tier via `getCheapestModel()` helper
2. Compute effective cost per model using `effectiveCost()` which checks `model.batchDiscount < 1` before applying the discount — the same guard used in the non-tiered path (line 219)
3. This ensures Perplexity Sonar (`batchDiscount: 1`) and Perplexity Sonar Pro (`batchDiscount: 1`) are never given a batch discount in the tiered path

**Verification**: If a user selects only Perplexity Sonar as mid-tier and enables Batch API + Tiered Strategy, the tiered calculation now correctly applies no batch discount to the Perplexity tier, matching the non-tiered behavior.

### Bug 2 Fix (MAJOR): Tryscope preset frequency corrected

**Problem**: The Tryscope-Style preset label said "50 polls/day" but set `frequency: 1`, producing costs 50x lower than actual Tryscope usage.

**Fix** (CostCalculator.tsx line 160): Changed `frequency: 1` to `frequency: 50` to match:
- The preset label "50 polls/day"
- Research 2.2 which describes Tryscope as polling "50x/day"
- The program.md starting point description: "polling 50x/day across ChatGPT, Claude, Gemini, and Perplexity"

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
1. **Total queries**: `brands * queriesPerBrand * modelCount * samplesPerQuery * pollingFrequency * 30`
2. **Per-model cost**: `costPerQuery * perModelQueries + requestFee * perModelQueries`
3. **Batch discount**: Applied as `model.batchDiscount` multiplier only when `batchDiscount < 1` (excludes Perplexity)
4. **Tiered strategy**: Finds cheapest model object per tier, computes `effectiveCost()` with per-model batch discount awareness

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
