# Bitsy Simulation Engine: Complete Product & Technical Overview

**Status**: Research complete. Architecture & implementation guide documented.
**Last Updated**: April 5, 2026

---

## TL;DR: What We're Building

A **digital twin simulation engine** that:
1. **Monitors** real LLM citation behavior (50 samples/day across 4 models)
2. **Trains** lightweight surrogate model (XGBoost, daily, 5 minutes)
3. **Simulates** instant what-if scenarios without expensive API calls
4. **Explains** why predictions changed using SHAP + drift detection
5. **Validates** predictions against ground truth daily

**Core insight**: Use statistical sampling + cheap proxy model to give users instant, explainable AI search visibility insights at 95% gross margin.

---

## Quick Architecture

```
Real LLMs (ChatGPT, Claude, Gemini, Perplexity)
    ↓ [50 samples/day]
Collection Pipeline
    ↓ [Feature Engineering]
40-60 Engineered Features
    ↓ [Daily Training, 5 min]
XGBoost Surrogate Model (10 MB)
    ↓
What-If Simulations (instant)
    ↓ [SHAP Decomposition]
User Dashboard
    ├─ Current mention rate
    ├─ What-if scenarios
    ├─ Drift alerts
    └─ 30-day trends
```

---

## Core Components

### 1. Data Collection (Cost: ~$0.30/brand/day)
- Query 4 LLMs with 5 query variations, 3x each
- temperature=0 for reproducibility
- Detect parametric vs RAG by testing with/without web search
- Store: ~200 rows/brand/day

### 2. Feature Engineering (40-60 features)
| Category | Examples |
|----------|----------|
| **Time-series** | mention_rate_day1, 7day_avg, 30day_avg, volatility, trend |
| **Competitors** | top3_competitor_avg, our_vs_best, are_competitors_gaining |
| **Content** | avg_source_freshness, high_authority_count, schema_score |
| **Query** | query_type_distribution, length_avg, semantic_diversity |
| **Mechanism** | parametric_mentions_pct, rag_mentions_pct, training_cutoff |
| **Seasonality** | day_of_week, is_weekend, seasonal_index |

### 3. Model Training (XGBoost, ~5 min/day)
- Input: 40-60 features
- Output: mention_rate prediction (0-100%)
- Training: 90 days of history, walk-forward validation
- Performance: R² > 0.85, RMSE < ±4%
- Stored as: 10 MB serialized model + SHAP feature importance

### 4. Drift Detection
- **Data drift**: Input distributions change (z-score > 2)
- **Concept drift**: Feature importance changes (doubling/halving)
- **Automatic alerts**: "High-authority sources became 2.7x more important"
- **Root cause hypotheses**: Model update? Competitor action? Gartner released?

### 5. What-If Simulator
User: "What if we publish a comprehensive guide?"

System:
```
Baseline features: avg_source_freshness = 8.3 months
Modified features: avg_source_freshness = 0.1 months

Baseline prediction: 39% mention rate
Modified prediction: 48% mention rate
Predicted lift: +9pp (confidence: 95% interval [45%-51%])

Why +9pp?
  ├─ Fresh content signal: +4.2pp
  ├─ Better query coverage: +2.1pp
  ├─ Authority boost: +1.8pp
  └─ Other factors: +0.9pp

Sensitivity analysis:
  ├─ If only 1 source picks it up: 45% (+6pp)
  ├─ If ages to 3 months: 46% (+7pp)
  └─ If competitors copy: 42% (+3pp)
```

### 6. Validation
- **Daily**: Compare predicted mention rates to actual next-day data
- **Weekly**: Track simulation accuracy vs actual outcomes when users take action
- **Monthly**: Aggregate error metrics, decide if retraining improved model

---

## Why This Works Financially

| Approach | Cost/Brand/Mo | Accuracy | Speed |
|----------|--------------|----------|-------|
| **Naive**: Query real API for every what-if | $50-100 | ~100% | Slow (5-10s per scenario) |
| **Tryscope/Bitsy**: Surrogate + sampling | $0.50 | ~85-90% | Fast (1ms per scenario) |

**Margin**: At $199/mo SaaS pricing with $0.50 API costs = 99.2% gross margin

**Why affordable**:
1. Surrogate model = **1000x faster** than real API (1ms vs 1s)
2. Inference cost ≈ **zero** (already trained)
3. Statistical sampling = **sufficient** (50 samples ≠ 1000s)
4. Batch retraining = **economies of scale** (one model per brand)

---

## What We Know From Research

### The Data (Your bitsy research 2.1-2.5.md)
- **Citation mechanisms**: ChatGPT uses parametric knowledge 79% of time, RAG 21%
- **Recency bias**: 65% of AI hits cite content <1 year old
- **Authority matters**: Brands in "Best of" lists are 400% more likely cited
- **Quality weighted**: 10,000 mentions in low-authority blogs < 200 in peer-reviewed publications
- **Frequency minimum**: <50 mentions in high-trust sources → 72% AI recognition failure

### The Validation Strategy
1. **Ground truth check**: Compare predictions to actual mention rates next day (target: ±3pp error)
2. **Sensitivity check**: Predict "if you publish this article", user publishes it, track actual vs predicted lift
3. **Drift check**: "Algorithm says high-authority sources matter more", next day Gartner releases, confirms drift
4. **Cross-model validation**: Aggregate across 4 models for robust signal

### The Key Insight
LLM responses are **stochastic** (same input → different output). Need 50+ samples to detect signal from noise. Tryscope's 50/day minimum is statistically justified.

---

## Implementation Roadmap

### Phase 1: MVP (2 weeks)
- [ ] Data collection: 50 API calls/day
- [ ] Feature engineering: 30 core features
- [ ] XGBoost baseline
- [ ] Dashboard: mention rate + trend

### Phase 2: Simulation Engine (2 weeks)
- [ ] What-if builder
- [ ] SHAP explanations
- [ ] Confidence intervals
- [ ] Sensitivity analysis

### Phase 3: Intelligence Layer (2 weeks)
- [ ] Drift detection (data + concept)
- [ ] Drift explanation + alerts
- [ ] Root cause analysis UI

### Phase 4: Scale (ongoing)
- [ ] Multi-model aggregation
- [ ] Competitive benchmarking
- [ ] Custom metric definitions
- [ ] Historical scenario database

---

## Technical Stack Decisions

| Component | Choice | Why |
|-----------|--------|-----|
| **Surrogate Model** | XGBoost | Fast, interpretable, handles time-series well |
| **Interpretability** | SHAP | Game-theoretic, explains why predictions changed |
| **Drift Detection** | Incremental PFI | Shows which features changed |
| **Validation** | Walk-forward CV | Time-series specific, prevents lookahead |
| **API Query** | temperature=0 | Reproducible, fewer samples needed |
| **Mechanism Detection** | test with/without web search | Parametric vs RAG split |

---

## Database Design

Four main tables:
1. **collection_results**: Raw API call results (200 rows/brand/day)
2. **daily_aggregates**: Daily summary statistics
3. **engineered_features**: 40-60 computed features
4. **models_meta**: Trained model metadata + feature importance
5. **drift_alerts**: Detected drift with explanations
6. **simulations**: User-created what-if scenarios

See `technical_implementation_guide.md` for full schema.

---

## Key Files

- **Memory/simulation_engine_architecture.md** — Complete architecture breakdown
- **Memory/technical_implementation_guide.md** — Code-level implementation details
- **This file** — Quick reference during development

---

## Research Sources

**Your research files** (should integrate during implementation):
- `research/2.1.md` — LLM training, visibility signals, schema effects, validation baselines
- `research/2.2.md` — Citation patterns, competitor effects, syntactic attacks
- `research/2.3.md` — API costs, sampling strategies, temperature/seed effects
- `research/2.4.md` — Real-world data (Seer Interactive, MetricsRule, GetAISO experiments)
- `research/2.5.md` — Industry predictions, margins, market dynamics

**Academic papers**:
- ACM SIGKDD 2024 — GEO-bench (10,000 queries, 25 domains, validated LLM visibility strategies)
- SIGIR 2025 — Recency bias in LLMs (fresh content gets 4.78-year boost in ranking)
- CMU "LLM Whisperer" — Stochastic variation in identical-intent prompts (justifies 50+ samples)

---

## What Makes This Different From Tryscope

1. **Same core idea**: Surrogate model + daily retraining
2. **Focus**: We could differentiate by:
   - Better UI/UX for non-technical users
   - Cheaper pricing (if we accept lower accuracy)
   - Vertical specialization (e.g., SaaS-only vs Tryscope's all categories)
   - Open-source components (publish SHAP analysis, feature importance research)
   - API-first design (build into marketplaces)

---

## Next Steps

1. Set up AWS/GCP infrastructure (database, compute for model training)
2. Implement data collection pipeline (start with 1 brand, 1 query)
3. Build feature engineering module (test on 30 days of sample data)
4. Train first XGBoost model (validate on hold-out data)
5. Implement SHAP explanations
6. Build what-if simulator
7. Add drift detection
8. Deploy MVP dashboard

---

## Questions to Clarify

1. **What's our vertical focus?** (e.g., SaaS, e-commerce, agencies)
2. **Pricing model?** ($99/mo, $199/mo, usage-based?)
3. **Go-to-market?** (B2B SaaS, agencies, DIY?)
4. **Competitive angle?** (cheaper, better UX, openness, speed?)
5. **Priority metrics?** (margins, user growth, accuracy, feature completeness?)

These will inform database design, API surface, and feature prioritization.
