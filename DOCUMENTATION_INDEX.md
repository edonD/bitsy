# Bitsy Documentation Index

## Quick Links

### Getting Started
1. **[SIMULATION_ENGINE_OVERVIEW.md](SIMULATION_ENGINE_OVERVIEW.md)** - Start here! Complete product overview, why it works, what we're building
2. **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Week-by-week implementation plan with validation metrics

### Deep Dives
3. **[Memory: Simulation Engine Architecture](../../../.claude/projects/C--Users-DD-OneDrive-Programming-bitsy/memory/simulation_engine_architecture.md)** - Complete 4-layer architecture, retraining workflow, drift detection
4. **[Memory: Technical Implementation Guide](../../../.claude/projects/C--Users-DD-OneDrive-Programming-bitsy/memory/technical_implementation_guide.md)** - Code-level details, database schema, API design, MLOps

### Research Foundation
5. **[research/2.1.md](research/2.1.md)** - LLM training, visibility signals, schema effects, validation baselines
6. **[research/2.2.md](research/2.2.md)** - Citation patterns, competitor effects
7. **[research/2.3.md](research/2.3.md)** - API costs, sampling strategies, temperature effects
8. **[research/2.4.md](research/2.4.md)** - Real-world validation data (Seer, MetricsRule, GetAISO)
9. **[research/2.5.md](research/2.5.md)** - Market dynamics and competitive positioning

---

## What We've Documented

### Product Architecture
- **4-layer digital twin**: Device (real LLMs) → Communication (monitoring) → Proxy (surrogate model) → Application (UI)
- **Collection workflow**: Collection runs add samples → Features (40-60) → XGBoost refit → Deployment
- **What-if engine**: Modify features → predict → explain with feature-importance attribution → sensitivity analysis
- **Cost model**: ~$0.30/brand/day API costs, 95% gross margin at $199/mo SaaS pricing

### Technical Implementation
- **Data collection**: OpenAI, Anthropic, Google, Perplexity clients with structured response parsing
- **Feature engineering**: 40-60 features spanning time-series, competitors, content quality, mechanisms
- **Model**: XGBoost trained on 90 days of history, validated with walk-forward CV
- **Interpretability**: XGBoost feature importance and importance-weighted attribution today; SHAP is planned, not currently active
- **Drift detection**: Data drift (z-score > 2) + concept drift (feature importance changes)
- **Validation**: Daily ground truth checks, weekly sensitivity checks, monthly aggregation

### Key Decisions
1. **Surrogate model over real API** - 1000x faster, enables instant what-if
2. **temperature=0** - Reproducibility, need fewer samples (3 vs 30)
3. **Parametric vs RAG detection** - Test with/without web search
4. **XGBoost over neural networks** - Fast training (5 min), interpretable, time-series friendly
5. **Walk-forward validation** - Time-series specific, prevents lookahead bias
6. **Feature-importance attribution now, TreeSHAP later** - Honest current explanations with a planned stronger method

### Database Schema
- **collection_results**: Raw API call results (200 rows/brand/day)
- **daily_aggregates**: Daily summaries (mention rate, sources, freshness)
- **engineered_features**: 40-60 computed features per brand/day
- **models_meta**: Trained model + feature importance
- **drift_alerts**: Detected anomalies with explanations
- **simulations**: User-created what-if scenarios with outcomes

### Validation Strategy
- **Ground truth**: Compare predicted mention rates to actual next-day data (target: ±3pp error)
- **Sensitivity**: Predict lift, user takes action, track actual vs predicted (validation metric)
- **Drift**: Model flags "X became important", next day market event confirms (precision check)
- **Academic baselines**: Integrate MetricsRule data, GetAISO experiments, Seer Interactive patterns

---

## Implementation Timeline

```
Week 1-2:  Foundation (DB, API clients, feature engineering)
Week 3-4:  Model training & validation
Week 5:    Drift detection
Week 6:    What-if simulator + feature-importance attribution
Week 7:    FastAPI + frontend MVP
Week 8:    Daily orchestration + tests

Total: 8 weeks to MVP
```

---

## Success Metrics

| Metric | Target | Validation |
|--------|--------|-----------|
| Model Accuracy | RMSE < 4% | Validation set |
| Simulation Speed | <100ms | API latency |
| Daily Training | <5 min/brand | Job logs |
| API Cost | <$0.50/brand/day | Cost tracking |
| Drift Precision | >80% | Manual review |
| Uptime | >99% | Monitoring |

---

## How to Use These Docs

**First time here?**
1. Read SIMULATION_ENGINE_OVERVIEW.md (30 min)
2. Skim IMPLEMENTATION_CHECKLIST.md (20 min)
3. Check your research files for validation data

**Starting implementation?**
1. Follow IMPLEMENTATION_CHECKLIST.md week by week
2. Reference technical_implementation_guide.md for code patterns
3. Use simulation_engine_architecture.md for debugging/design questions

**Adding a new feature?**
1. Check simulation_engine_architecture.md for how it fits into the system
2. Reference technical_implementation_guide.md for implementation patterns
3. Add validation metrics to IMPLEMENTATION_CHECKLIST.md

**Explaining to others?**
1. Show SIMULATION_ENGINE_OVERVIEW.md for product overview
2. Show architecture diagram + cost model
3. Walk through a what-if example from your research

---

## What's NOT Documented

- **Specific UI/UX design** - Use SIMULATION_ENGINE_OVERVIEW.md dashboard mockup as starting point
- **Business model details** - See SIMULATION_ENGINE_OVERVIEW.md "Next Steps" section
- **Specific LLM API credentials** - Use environment variables (not in docs for security)
- **Marketing strategy** - Out of scope for this phase

---

## Key Insights Summary

**Why Tryscope's approach works:**
- LLM responses are stochastic (same input → different output)
- Need 50+ samples to detect signal from noise (justified by CMU research)
- Surrogate model is 1000x faster than real API
- Can train daily with statistical sampling + lightweight model
- Explainability uses feature-importance attribution today; SHAP-style methods are future work

**Why margins are possible:**
- $0.30/day API costs (statistical sampling)
- XGBoost model at $0.50/month infrastructure
- 99% gross margin at $199/mo pricing
- One model per brand enables economies of scale

**Why our research is solid:**
- 9 academic papers with reproducible results
- Real-world data: Seer Interactive (5000+ URLs), MetricsRule (1000+ queries), GetAISO (A/B test)
- Validation baselines to measure against
- Your bitsy research already contains the signals we'll monitor

---

## Questions?

See SIMULATION_ENGINE_OVERVIEW.md "Questions to Clarify" section for strategic decisions.
See IMPLEMENTATION_CHECKLIST.md "Debugging Checklist" for technical issues.

Good luck building! 🚀
