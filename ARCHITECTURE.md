# Bitsy Architecture - Complete Block Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BITSY SIMULATION ENGINE                             │
│                                                                               │
│  Real Data → Model Training → User Predictions → Actionable Insights        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Data Collection (Daily)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ DAILY AUTOMATED PIPELINE (Every morning at 6am)                              │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────┐
    │   LLM API Calls         │
    │                         │
    │ For EACH brand (500):    │
    │   FOR EACH query (50):   │
    │     FOR EACH model (4):  │
    │       - Call LLM        │
    │       - Extract mention │
    │       - Store result    │
    │                         │
    │ Daily: 100k API calls   │
    │ Cost: $30-50/day        │
    └─────────────┬───────────┘
                  │
                  ▼
    ┌─────────────────────────┐
    │  Mention Rate Database  │
    │                         │
    │ {                       │
    │   date,                 │
    │   brand,                │
    │   model,                │
    │   query_id,             │
    │   mentioned: bool,      │
    │   mention_rate: 0.52    │
    │ }                       │
    │                         │
    │ Storage: 500B × 90 days │
    │ = 45,000 records        │
    └──────────┬──────────────┘
               │
               └────────────────────────┐
                                        │
    ┌─────────────────────────┐        │
    │  Brand Signal Scraper   │        │
    │                         │        │
    │ For EACH brand (500):    │        │
    │   - Freshness (Google)  │        │
    │   - Authority (G2, etc) │        │
    │   - Content (DA, links) │        │
    │   - Competitors         │        │
    │   - Query diversity     │        │
    │                         │        │
    │ Daily snapshots         │        │
    │ Cost: ~$500/month       │        │
    └──────────┬──────────────┘        │
               │                        │
               ▼                        │
    ┌─────────────────────────┐        │
    │  Brand Signals DB       │        │
    │                         │        │
    │ {                       │        │
    │   date,                 │        │
    │   brand,                │        │
    │   freshness_days: 45,   │        │
    │   authority_count: 2,   │        │
    │   domain_authority: 72, │        │
    │   num_queries: 125,     │        │
    │   market_share: 0.15    │        │
    │ }                       │        │
    │                         │        │
    │ 90 days × 500 brands    │        │
    │ = 45,000 records        │        │
    └──────────┬──────────────┘        │
               │                        │
               └────────────┬───────────┘
                            │
                            ▼
    ┌──────────────────────────────────┐
    │  Training Data Assembly          │
    │                                  │
    │ JOIN:                            │
    │   Mention rates (actual)         │
    │   × Brand signals (features)     │
    │                                  │
    │ Output: DataFrame                │
    │   X = [signals]  (45k × 8 cols)  │
    │   y = [mention%] (45k × 1 col)   │
    │                                  │
    │ Time range: 90 days (now - 90d)  │
    └──────────────────────────────────┘
```

---

## Layer 2: Model Training (Daily)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ DAILY MODEL RETRAINING (Every morning at 7am, after data collection)         │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────┐
    │  Training Data (from Layer 1)     │
    │                                  │
    │  X = 45,000 samples × 8 features │
    │  y = 45,000 mention rates        │
    │                                  │
    │  Features:                       │
    │  - freshness_days                │
    │  - authority_count               │
    │  - domain_authority              │
    │  - num_queries                   │
    │  - market_share                  │
    │  - content_age_days              │
    │  - competitor_rank               │
    │  - schema_markup_score           │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Train/Test Split                │
    │                                  │
    │  Train: First 60 days (30k)      │
    │  Test:  Last 30 days (15k)       │
    │                                  │
    │  Reason: Walk-forward validation │
    │  (no lookahead bias)             │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Train XGBoost Model             │
    │                                  │
    │  model.fit(X_train, y_train)     │
    │                                  │
    │  Config:                         │
    │  - estimators: 100               │
    │  - max_depth: 4                  │
    │  - learning_rate: 0.1            │
    │  - subsample: 0.8                │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Validate on Test Set            │
    │                                  │
    │  predictions = model.predict(X_test)
    │  actuals = y_test                │
    │                                  │
    │  Compute:                        │
    │  - R² score                      │
    │  - RMSE                          │
    │  - MAE                           │
    │                                  │
    │  Example result:                 │
    │  - R² = 0.87 (good!)             │
    │  - RMSE = 2.1pp                  │
    │  - MAE = 1.6pp                   │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Extract Feature Importance      │
    │                                  │
    │  importance = model.feature_     │
    │               importances_       │
    │                                  │
    │  Output:                         │
    │  - freshness_days: 0.34          │
    │  - authority_count: 0.28         │
    │  - domain_authority: 0.18        │
    │  - num_queries: 0.12             │
    │  - (rest): 0.08                  │
    │                                  │
    │  This shows: Freshness matters   │
    │  most for LLM mentions           │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Save Model + Metrics            │
    │                                  │
    │  Store:                          │
    │  - Trained model (pickle)        │
    │  - Validation metrics            │
    │  - Feature importance            │
    │  - Training date                 │
    │                                  │
    │  Location: In-memory cache       │
    │  + persistent storage (optional) │
    └──────────────────────────────────┘
```

---

## Layer 3: User Prediction (Real-time)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ USER SIMULATION (When user clicks "Simulate" button)                          │
│ Response time: <100ms                                                         │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────┐
    │  Frontend: User Adjusts Sliders  │
    │                                  │
    │  Scenario: "Authority Push"      │
    │  - freshness_days: 45 → 10       │
    │  - authority_count: 2 → 5        │
    │  - num_queries: 125 → 150        │
    │                                  │
    │  HTTP POST to /simulate           │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Backend: Get Current Brand      │
    │                                  │
    │  Query: Latest signals for brand │
    │  From: Brand Signals DB          │
    │                                  │
    │  current_state = {               │
    │    freshness_days: 45,           │
    │    authority_count: 2,           │
    │    domain_authority: 72,         │
    │    num_queries: 125,             │
    │    market_share: 0.15,           │
    │    ...                           │
    │  }                               │
    │                                  │
    │  actual_mention_rate = 32.4%     │
    │  (from last 7 days of API calls) │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Prediction 1: Baseline          │
    │                                  │
    │  baseline_pred = model.predict(  │
    │    current_state                 │
    │  )                               │
    │                                  │
    │  Result: 32.8%                   │
    │  (what model expects if no       │
    │   changes, close to actual 32.4%)│
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Prediction 2: Scenario          │
    │                                  │
    │  scenario_state = {              │
    │    ...current_state,             │
    │    freshness_days: 10,    ←──────┤─── User changed
    │    authority_count: 5,    ←──────┤─── User changed
    │    num_queries: 150       ←──────┤─── User changed
    │  }                               │
    │                                  │
    │  scenario_pred = model.predict(  │
    │    scenario_state                │
    │  )                               │
    │                                  │
    │  Result: 41.2%                   │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Calculate Lift                  │
    │                                  │
    │  lift = scenario_pred -          │
    │          baseline_pred           │
    │                                  │
    │  lift = 41.2% - 32.8% = +8.4pp   │
    │  lift_pct = 8.4 / 32.8 × 100     │
    │           = +25.6% relative      │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Calculate Confidence Bounds     │
    │                                  │
    │  From validation RMSE:           │
    │  RMSE = 2.1pp                    │
    │  Z-score (95%) = 1.96            │
    │  Margin = 1.96 × 2.1 = ±4.1pp    │
    │                                  │
    │  CI_lower = 41.2 - 4.1 = 37.1%   │
    │  CI_upper = 41.2 + 4.1 = 45.3%   │
    │                                  │
    │  Confidence level:               │
    │  IF R² > 0.85: "HIGH"            │
    │  IF R² > 0.70: "MEDIUM"          │
    │  ELSE: "LOW"                     │
    │                                  │
    │  Result: "HIGH" (R² = 0.87)      │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Feature Importance to Lift      │
    │                                  │
    │  For each changed feature:       │
    │    contribution = importance ×   │
    │                  (signal ratio)  │
    │                                  │
    │  Top drivers:                    │
    │  1. authority_count (2→5):       │
    │     +3.2pp (38%)                 │
    │  2. freshness_days (45→10):      │
    │     +3.8pp (45%)                 │
    │  3. num_queries (125→150):       │
    │     +1.4pp (17%)                 │
    │                                  │
    │  Total: 8.4pp ✓                  │
    └──────────────┬────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Return API Response             │
    │                                  │
    │  {                               │
    │    "brand_id": "zapier-123",     │
    │    "base_case": 32.8%,           │
    │    "scenario": 41.2%,            │
    │    "lift": 8.4pp,                │
    │    "lift_pct": 25.6%,            │
    │    "ci_lower": 37.1%,            │
    │    "ci_upper": 45.3%,            │
    │    "confidence": "HIGH",         │
    │    "features": [                 │
    │      {                           │
    │        "feature": "authority",   │
    │        "contribution": 3.2,      │
    │        "percentage": 38.0        │
    │      },                          │
    │      ...                         │
    │    ]                             │
    │  }                               │
    │                                  │
    │  Time: <100ms                    │
    └──────────────────────────────────┘
```

---

## Layer 4: Frontend Display

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND: Show Results to User                                               │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────┐
    │  Brand Input                                        │
    │  ─────────────────────────────────────────────────  │
    │  Brand Name: [Zapier                            ]   │
    │  Brand ID:   [zapier-123                        ]   │
    └─────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────┐
    │  Feature Sliders (User Inputs)                      │
    │  ─────────────────────────────────────────────────  │
    │  Freshness: 45 days    [━━●━━━━━━━━] 10 days       │
    │  Authority: 2 sources  [━━●━━━━━━━━] 5 sources      │
    │  Queries:  125 types   [━━●━━━━━━━━] 150 types      │
    └─────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────┐
    │  RESULTS                                            │
    │  ─────────────────────────────────────────────────  │
    │                                                     │
    │  Current mention rate:    32.8%                     │
    │  Predicted after changes: 41.2%                     │
    │                                                     │
    │  📈 Predicted Lift: +8.4pp (model confidence shown) │
    │                                                     │
    │  Confidence Interval: [37.1% ─── 45.3%]            │
    │                         ↑              ↑            │
    │                      Lower           Upper          │
    │                    95% confident between these      │
    │                                                     │
    │  Key Drivers:                                       │
    │  1. Authority sources     +3.2pp (38%)  ████░      │
    │  2. Content freshness     +3.8pp (45%)  █████░     │
    │  3. Query diversity       +1.4pp (17%)  ██░        │
    │                                                     │
    └─────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────┐
    │  Action: [Save Scenario]  [Test Another]            │
    └─────────────────────────────────────────────────────┘
```

---

## Data Flow Summary

```
Daily Cycle (Automated):
─────────────────────
6am  → LLM API calls (100k)          → Mention rates DB
     → Brand signal scraping (500)   → Brand signals DB
                                ↓
7am  → Merge data                    → Training data
     → Train XGBoost model           → Validate metrics
     → Extract feature importance    → Cache in memory

User Cycle (Real-time):
──────────────────────
User clicks Simulate
    ↓
Request: {brand_id, scenario_features}
    ↓
Load: Current brand state + trained model
    ↓
Predict: baseline_pred, scenario_pred
    ↓
Calculate: lift, confidence_bounds, feature_importance
    ↓
Response: JSON with all predictions
    ↓
Display: Results to user (<100ms total)
```

---

## What's Included (Only What's Needed)

✓ LLM API calls (real data)
✓ Brand signal scraping (real features)
✓ Training data assembly (join signals + mentions)
✓ XGBoost model training (single model, refit on accumulated rows when collection/retrain runs)
✓ Validation metrics (R², RMSE, for confidence)
✓ Feature importance (show what matters)
✓ User prediction API (two predictions + bounds)
✓ Frontend display (results visualization)

---

## What's NOT Included (Removed)

✗ Mock data generator (no synthetic training)
✗ Multiple model types (just XGBoost, it's best)
✗ SHAP values (use XGBoost feature importance instead, simpler)
✗ Edge case scenarios (nice-to-have, not essential)
✗ Sensitivity analysis (derived from feature importance)
✗ User authentication (can add later)
✗ Scenario persistence (localStorage, not essential)
✗ Batch simulations (one prediction at a time)
✗ A/B testing framework (separate product)

---

## Tech Stack

```
Data Collection:
  - Python scheduled cron job (APScheduler)
  - Requests library for LLM APIs
  - BeautifulSoup/Selenium for web scraping
  - PostgreSQL for time-series data

Model Training:
  - XGBoost (scikit-learn wrapper)
  - Pandas for data manipulation
  - NumPy for calculations
  - Scikit-learn for validation metrics

Serving:
  - FastAPI for REST API
  - Python process with in-memory model cache
  - JSON responses

Frontend:
  - Next.js (React)
  - Tailwind CSS
  - Simple fetch() to backend API
```

---

## Cost Breakdown

```
Monthly Operating Cost:

1. LLM API Calls
   - 100k calls/day × 30 days = 3M calls/month
   - Average: $0.00001/call = $30/month
   
2. Brand Signal Scraping
   - G2 API: Free (limited)
   - Gartner: ~$300/month (data feed)
   - Google: Free (News API)
   - Custom: $100/month
   - Total: $400/month
   
3. Infrastructure
   - Server: $100/month (training + API)
   - Database: $200/month (time-series)
   - Total: $300/month
   
4. Total Monthly Cost: $730/month

Revenue at Scale:
- 100 users × $99/month = $9,900/month
- Gross margin: (9,900 - 730) / 9,900 = 92.6%
- Profit per 100 users: $9,170/month
```

This is the complete architecture. Nothing extra, nothing missing.
