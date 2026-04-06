# Bitsy Implementation Checklist & Development Guide

## Phase 1: Foundation (Week 1-2)

### Infrastructure Setup
- [ ] Create AWS/GCP project
- [ ] Set up PostgreSQL database
- [ ] Create S3 bucket for model storage
- [ ] Set up Python environment (Poetry/venv)
- [ ] Create git repository structure

### Database & Schema
- [ ] Create PostgreSQL schema (see `technical_implementation_guide.md`)
- [ ] Create tables: brands, collection_results, daily_aggregates, engineered_features, models_meta
- [ ] Create indexes for fast queries
- [ ] Set up initial migration system (Alembic)

**File to create**: `bitsy/migrations/001_initial_schema.sql`

### API Client Layer
- [ ] Create `bitsy/services/llm_api_client.py`
  - [ ] OpenAI client (GPT-4 Turbo)
  - [ ] Anthropic client (Claude 3.5)
  - [ ] Google Generative AI client (Gemini 2)
  - [ ] Perplexity API client
  - [ ] Response parsing (extract brands, citations, confidence)
  - [ ] Unit tests for each provider

**Validation**: Can call each API, get structured response with:
```python
{
    "mentioned_brands": ["Zapier", "Slack"],
    "source_urls": [{"url": "...", "authority_score": 0.8}],
    "response_length": 450,
    "sources_count": 3
}
```

### Feature Engineering Foundation
- [ ] Create `bitsy/pipelines/feature_engineer.py`
- [ ] Implement time-series features (mention_rate_day1, 7day_avg, etc.)
- [ ] Implement competitor features
- [ ] Implement content quality features (stub: schema_score)
- [ ] Implement query features (hardcoded for MVP)
- [ ] Implement mechanism features
- [ ] Implement seasonality features

**Validation**: Given 90 days of daily_aggregates, can output dict with 30-40 features, no NaNs

---

## Phase 2: Data Collection & Storage (Week 2-3)

### Collection Scheduler
- [ ] Create `bitsy/services/collection_scheduler.py`
- [ ] Implement `collect_for_brand()` method
  - [ ] Generate query variations
  - [ ] Query each model
  - [ ] Parametric vs RAG detection (web search on/off)
  - [ ] Store results in database
- [ ] Unit tests

**Validation**: 
- Running on 1 brand, 5 queries, 4 models, 3 samples = 60 calls
- All results stored in collection_results table
- Cost: ~$0.30

### Database Utilities
- [ ] Create `bitsy/db/database.py` (ORM layer)
  - [ ] `insert_collection_result()`
  - [ ] `get_daily_aggregates()`
  - [ ] `insert_engineered_features()`
  - [ ] Query helpers with proper indexing

**Validation**: Can round-trip data through database without corruption

### Daily Aggregation
- [ ] Create aggregation function
  - [ ] Group collection_results by brand/day
  - [ ] Compute mention_rate, parametric_rate, rag_rate
  - [ ] Compute source freshness, authority counts
  - [ ] Store in daily_aggregates table

**Validation**: 60 collection results → 1 daily_aggregate row with correct calculations

---

## Phase 3: Model Training (Week 3-4)

### Feature Pipeline
- [ ] Implement full feature engineering pipeline
- [ ] Create function: `compute_features_for_brand(date)` → Dict[str, float]
- [ ] Handle missing data (defaults, fallbacks)
- [ ] Unit tests

**Validation**: Can compute 40-60 features for any brand/date without errors

### Model Training
- [ ] Create `bitsy/models/surrogate_model_trainer.py`
- [ ] Implement `train_model_for_brand()` 
  - [ ] Gather 90 days of features + labels
  - [ ] Train/val split (80/10/10 walk-forward)
  - [ ] Train XGBoost with specified hyperparameters
  - [ ] Evaluate RMSE, R², MAE
  - [ ] Compute SHAP feature importance
  - [ ] Serialize model to bytes
  - [ ] Store model metadata in database

**Hyperparameters**:
```python
{
    "n_estimators": 100,
    "max_depth": 4,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8
}
```

**Validation**:
- Model trains in <5 minutes
- Validation R² > 0.85
- RMSE < 4% (±4 percentage points)
- Feature importance sums to ~1.0

### Model Validation & Deployment
- [ ] Create `bitsy/models/model_validator.py`
- [ ] Implement model comparison logic
- [ ] Only deploy if: R² improves OR new model within 0.5% of previous (freshness)
- [ ] Deactivate old model before activating new one

**Validation**: Can train new model, compare to old, deploy if better

---

## Phase 4: Drift Detection (Week 4-5)

### Drift Detector
- [ ] Create `bitsy/monitoring/drift_detector.py`
- [ ] Implement data drift detection
  - [ ] Z-score calculation for each feature
  - [ ] Flag if |z-score| > 2.0
- [ ] Implement concept drift detection
  - [ ] Compute new SHAP-based feature importance
  - [ ] Compare to previous day's importance
  - [ ] Flag if importance doubled/halved
- [ ] Generate human-readable explanations

**Validation**:
- Can detect when input distribution shifts
- Can detect when model behavior changes
- Generates actionable alerts

### Drift Storage & Alerts
- [ ] Store drift alerts in drift_alerts table
- [ ] Implement alert generation with explanations
- [ ] Unit tests

**Validation**: Drift detected → Alert in database with explanation

---

## Phase 5: What-If Simulator (Week 5-6)

### Simulation Engine
- [ ] Create `bitsy/simulation/scenario_simulator.py`
- [ ] Implement `simulate_scenario()`
  - [ ] Take baseline + scenario modifications
  - [ ] Load active model
  - [ ] Create feature vectors
  - [ ] Predict base and scenario
  - [ ] Compute lift
  - [ ] Generate SHAP explanation
  - [ ] Add uncertainty bounds (±1.96 * RMSE)

**Validation**: 
- Can run 1000s of scenarios per second
- Predictions within ±3pp of validation RMSE
- SHAP values sum to predicted lift

### Sensitivity Analysis
- [ ] Implement `sensitivity_analysis()`
  - [ ] For each sensitive feature, vary by 0.5x to 1.5x
  - [ ] Collect predictions
  - [ ] Return sensitivity curves

**Validation**: Sensitivity curves are smooth, make intuitive sense

---

## Phase 6: API & Dashboard (Week 6-7)

### FastAPI Service
- [ ] Create `bitsy/api/main.py`
- [ ] Implement endpoints:
  - [ ] `POST /api/simulate` (what-if scenarios)
  - [ ] `GET /api/brand/{brand_id}/status` (current mention rate)
  - [ ] `GET /api/brand/{brand_id}/drift-alerts` (recent alerts)
  - [ ] `GET /api/brand/{brand_id}/30day-trend` (historical data)
  - [ ] `POST /api/brand/{brand_id}/simulate` (save simulation)
- [ ] Add request/response validation (Pydantic models)
- [ ] Error handling
- [ ] Authentication (basic JWT for MVP)

**Validation**: All endpoints return correct JSON structure

### Frontend Dashboard
- [ ] Current status card (mention rate, parametric %, trend)
- [ ] What-if builder (UI for modifying features)
- [ ] Results display (lift, confidence, SHAP breakdown)
- [ ] Drift alerts (showing recent anomalies)
- [ ] 30-day trend chart
- [ ] Sensitivity analysis visualizations

**Validation**: Can navigate UI, run simulations, see results

---

## Phase 7: Orchestration & Daily Workflow (Week 7-8)

### Daily Batch Job
- [ ] Create `bitsy/jobs/daily_workflow.py`
- [ ] Implement `run_daily_cycle()`
  - [ ] Collect data for all brands
  - [ ] Compute features
  - [ ] Detect drift
  - [ ] Retrain models
  - [ ] Validate & deploy
  - [ ] Generate reports

**Scheduling**:
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
scheduler.add_job(
    daily_workflow.run_daily_cycle,
    "cron",
    hour=23,  # 11 PM UTC
    minute=0
)
scheduler.start()
```

### Error Handling & Logging
- [ ] Structured logging (JSON logs)
- [ ] Error alerts to Slack/email
- [ ] Metrics tracking (API latency, model training time)
- [ ] Retry logic for failed collections

**Validation**: Daily job runs successfully, logs captured, models trained

---

## Phase 8: Validation & Testing (Week 8)

### Unit Tests
- [ ] API client tests (mock LLMs)
- [ ] Feature engineering tests
- [ ] Model training tests
- [ ] Drift detection tests
- [ ] Simulation tests
- [ ] Target: >80% code coverage

### Integration Tests
- [ ] End-to-end collection → training → simulation
- [ ] Database transactions
- [ ] Model persistence & loading

### Performance Tests
- [ ] Simulation latency (<100ms per scenario)
- [ ] Model training time (<5 min)
- [ ] API response times (<200ms)

### Accuracy Validation (Using Your Research Data)
- [ ] Compare predictions to MetricsRule validation baseline
- [ ] Test on GetAISO controlled experiment (synthetic brands)
- [ ] Validate Seer Interactive patterns (content freshness effects)

---

## Deployment Checklist

### Pre-Production
- [ ] All unit tests passing
- [ ] Database migrations tested
- [ ] API load tested (1000 req/s)
- [ ] Model training times measured
- [ ] Secrets management (API keys in env vars, not code)

### Staging
- [ ] Deploy full stack to staging environment
- [ ] Run daily workflow on staging data
- [ ] Monitor logs, metrics
- [ ] Performance benchmarks

### Production
- [ ] Blue-green deployment setup
- [ ] Database backups configured
- [ ] Monitoring & alerting (model accuracy, API latency, costs)
- [ ] Customer onboarding (first 3 brands)

---

## Validation Metrics (MVP Success Criteria)

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| **Model Accuracy** | RMSE < 4% | Val set after retraining |
| **Simulation Speed** | <100ms per scenario | Latency measurements |
| **Daily Job Duration** | <30 min for 100 brands | Log duration |
| **API Costs** | <$0.50/brand/day | Track API calls |
| **Model Training** | <5 min for 1 brand | Log training time |
| **Drift Detection Precision** | >80% correct alerts | Manual review of alerts |
| **Uptime** | >99% | Monitor HTTP status |

---

## Key Code Patterns

### Feature Computation
```python
# Input: List[DailyAggregate] for last 90 days
# Output: Dict[str, float] with 40-60 features

mention_rates = [d.mention_rate for d in daily_data]
features = {
    "mention_rate_day1": mention_rates[-1],
    "mention_rate_7day_avg": np.mean(mention_rates[-7:]),
    "mention_volatility": np.std(mention_rates[-14:]),
    # ... 37+ more features
}
```

### Model Training
```python
# Walk-forward validation for time-series
split_point = int(len(df) * 0.8)
X_train, X_val = df.iloc[:split_point], df.iloc[split_point:]

model = xgb.XGBRegressor(...)
model.fit(X_train, y_train, eval_set=[(X_val, y_val)])

# Always use SHAP for interpretability
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_val)
```

### What-If Simulation
```python
# Modify features, predict, explain
scenario = {**baseline_features, **user_modifications}
prediction = model.predict(pd.DataFrame([scenario]))

# SHAP breakdown
shap_vals = explainer.shap_values(pd.DataFrame([scenario]))
contributions = dict(zip(feature_names, shap_vals[0]))
```

---

## File Structure (Final)

```
bitsy/
├── services/
│   ├── llm_api_client.py
│   └── collection_scheduler.py
├── pipelines/
│   └── feature_engineer.py
├── models/
│   ├── surrogate_model_trainer.py
│   └── model_validator.py
├── monitoring/
│   └── drift_detector.py
├── simulation/
│   └── scenario_simulator.py
├── api/
│   ├── main.py
│   └── models.py (Pydantic schemas)
├── jobs/
│   └── daily_workflow.py
├── db/
│   ├── database.py
│   └── models.py (ORM)
├── migrations/
│   ├── env.py (Alembic)
│   └── versions/
│       └── 001_initial_schema.py
├── tests/
│   ├── test_llm_client.py
│   ├── test_features.py
│   ├── test_model.py
│   ├── test_drift.py
│   └── test_simulation.py
├── pyproject.toml
├── main.py (entry point)
└── config.py (settings)
```

---

## Debugging Checklist

**Model not training?**
- Check: Do you have 30+ days of data?
- Check: Are labels non-null?
- Check: Do feature vectors have NaN values?

**Simulations too slow?**
- Check: Model loaded in memory?
- Check: Using batch prediction?

**Drift alerts not triggering?**
- Check: Historical features computed correctly?
- Check: Z-score threshold appropriate?

**Features don't make sense?**
- Check: Feature scaling (some are 0-1, some are 0-100)
- Check: Missing data handling (defaults)

---

## Success Milestones

1. ✓ **Week 1**: Database + API clients working
2. ✓ **Week 2**: Data collection → daily aggregates
3. ✓ **Week 3**: Feature engineering + basic model training
4. ✓ **Week 4**: Drift detection working
5. ✓ **Week 5**: What-if simulator with SHAP
6. ✓ **Week 6**: FastAPI + frontend MVP
7. ✓ **Week 7**: Daily batch job automated
8. ✓ **Week 8**: Tests passing, MVP validated

**Post-MVP**:
- Multi-model aggregation (separate surrogates for ChatGPT vs Claude)
- Competitive benchmarking
- Custom metric definitions
- Historical scenario playback

---

## Questions During Implementation

1. **What if a brand hasn't had 90 days of data yet?**
   - Use all available data, but note uncertainty in UI

2. **What if model training fails?**
   - Keep previous model active, log error, alert on Slack

3. **What if API call fails?**
   - Retry up to 3 times, then skip that sample (data loss is ok, 50+ samples remain)

4. **What's the minimum mention rate we can detect?**
   - With 60 samples/day: can detect ~5-10% changes (depends on variance)

5. **How do we handle new brands?**
   - Collect 30 days before training first model (bootstrap period)
   - Show "Coming soon" on dashboard during bootstrap

---

## Next Steps

1. Clarify requirements with stakeholders (see SIMULATION_ENGINE_OVERVIEW.md questions)
2. Set up AWS/GCP infrastructure
3. Create initial git structure
4. Begin Phase 1 (foundation)

Good luck! 🚀
