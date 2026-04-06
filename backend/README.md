# Bitsy Backend: Prototype Simulation API

**Status**: Prototype - research-backed what-if simulator

This backend is the current prototype API for Bitsy. It runs instant what-if scenarios using a lightweight XGBoost surrogate model trained on synthetic training data while the final prediction engine and live calibration loop are still being designed.

## Architecture

```
XGBoost Surrogate Model
    ↓
Feature Input (40-60 features)
    ↓
Prediction (mention rate 0-100%)
    ↓
SHAP Explanation + Uncertainty Bounds
    ↓
Sensitivity Analysis (edge cases)
```

## Key Components

### 1. **Surrogate Model** (`models/surrogate.py`)
- Trains on 90 days of historical data
- Outputs: Mention rate predictions (0-100%)
- Validation: R² > 0.85, RMSE < 4%
- Interpretable via feature-importance proxy today; true explainability path still to be finalized

### 2. **Scenario Simulator** (`simulation/simulator.py`)
- Runs what-if scenarios instantly
- Returns:
  - Predicted lift (in percentage points)
  - Confidence interval (95%)
  - SHAP feature contributions
  - Edge case scenarios
  - Sensitivity analysis

### 3. **Mock Data** (`data/mock_data.py`)
- Generates synthetic but realistic training data
- 21 engineered features
- Models realistic brand patterns (freshness decay, authority boost, seasonality)
- Allows product and API prototyping before real data collection is connected

### 4. **FastAPI Service** (`api/`)
- `POST /api/simulations/simulate` - Run what-if scenario
- `POST /api/simulations/sensitivity` - Run sensitivity analysis
- `GET /api/simulations/{brand_id}/simulation-status` - Model status

## Quick Start

### Installation

```bash
cd backend
poetry install  # Install dependencies
```

### Run the API

```bash
python main.py
```

Server starts at `http://localhost:8000`

### Test the Simulator

**Example: What-if publish a guide?**

```bash
curl -X POST http://localhost:8000/api/simulations/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "zapier-123",
    "scenario_name": "Publish implementation guide",
    "scenario_features": {
      "avg_source_freshness_months": 0.1,
      "high_authority_source_count": 4,
      "best_of_list_mentions": 10
    }
  }'
```

**Response:**
```json
{
  "brand_id": "zapier-123",
  "base_case_prediction": 35.0,
  "scenario_prediction": 44.0,
  "predicted_lift": 9.0,
  "lift_percentage": 25.7,
  "confidence_lower": 41.2,
  "confidence_upper": 46.8,
  "confidence_level": "HIGH",
  "shap_contributions": [
    {
      "feature": "avg_source_freshness_months",
      "contribution": 4.2,
      "percentage": 46.7
    },
    {
      "feature": "high_authority_source_count",
      "contribution": 1.8,
      "percentage": 20.0
    },
    ...
  ],
  "sensitivity_analysis": {
    "edge_cases": [
      {
        "scenario_name": "Low authority pickup (1 source instead of 4)",
        "predicted_lift": 6.2,
        ...
      }
    ]
  }
}
```

## Feature Engineering (40-60 Features)

### Time-Series (5 features)
- `mention_rate_day1` - Today's mention rate
- `mention_rate_7day_avg` - 7-day rolling average
- `mention_rate_30day_avg` - 30-day rolling average
- `mention_volatility` - Standard deviation
- `trend_direction` - Is it going up/down?

### Competitors (3 features)
- `top3_competitor_avg` - Average mention rate of top 3
- `our_vs_best_competitor` - Ratio vs strongest competitor
- `competitors_gaining` - Are they growing?

### Content Quality (4 features)
- `avg_source_freshness_months` - Age of cited sources
- `high_authority_source_count` - Wikipedia, G2, Capterra mentions
- `schema_markup_score` - Schema.org implementation (0-1)
- `best_of_list_mentions` - Count of best-of lists

### Query (3 features)
- `query_type_informational_pct` - % informational vs transactional
- `query_length_avg` - Average words per query
- `query_semantic_diversity` - Variation in query phrasing

### Mechanism (3 features)
- `parametric_mentions_pct` - From model weights (durable)
- `rag_mentions_pct` - From real-time search (volatile)
- `training_cutoff_months_ago` - Model knowledge age

### Seasonality (3 features)
- `day_of_week` - 0-6 (Monday-Sunday)
- `is_weekend` - Boolean
- `seasonal_index` - Seasonal multiplier (0.8-1.2)

## Prototype Validation

The current surrogate prototype is assessed by:

1. **Ground truth**: Comparing predicted mention rates to actual next-day data
   - Target: RMSE < 4% (±4 percentage points)
   - Target: R² > 0.85

2. **Sensitivity**: When users take action, tracking actual vs predicted lift
   - Example: "Predicted +9pp lift" vs actual "+8pp" = validated

3. **Feature importance proxy**: Using XGBoost feature importance as a temporary explanation layer
   - Good enough for sandbox iteration
   - Will be replaced or hardened when the final engine is selected

## Development Roadmap

### Phase 1 (This week) ✅
- [x] Surrogate model training
- [x] SHAP explanations
- [x] Scenario simulator
- [x] Mock data generation
- [x] FastAPI endpoints
- [ ] Unit tests
- [ ] Docker containerization

### Phase 2 (Next week)
- [ ] Connect to real data collection pipeline
- [ ] Replace mock data with actual API results
- [ ] Daily model retraining orchestration
- [ ] Database storage (Supabase)
- [ ] Drift detection alerts

### Phase 3 (Week 3)
- [ ] Multi-model support (separate models for each LLM)
- [ ] Competitive benchmarking
- [ ] Custom metric definitions
- [ ] Historical scenario playback

## API Endpoints

### Core Simulation
- `POST /api/simulations/simulate` - Run what-if scenario
- `POST /api/simulations/sensitivity` - Sensitivity analysis
- `GET /api/simulations/{brand_id}/simulation-status` - Check if ready

### Brands (Demo)
- `POST /api/brands/` - Create brand
- `GET /api/brands/{brand_id}` - Get brand details

### Health
- `GET /api/health` - Health check

## Configuration

Default settings (edit in code):

```python
# Surrogate model training
n_estimators = 100        # XGBoost trees
max_depth = 4             # Shallow, interpretable
learning_rate = 0.1       # Conservative learning

# Validation
train_size = 0.8          # 80/20 split
test_size = 0.2

# Simulation
confidence_level = 0.95   # 95% confidence interval
z_score = 1.96            # From normal distribution
```

## Testing

```bash
# Run unit tests
pytest tests/

# Run specific test
pytest tests/test_simulator.py::test_simulation

# Coverage
pytest --cov=. tests/
```

## Known Limitations

1. **Using synthetic data**: Real data collection is not yet integrated
2. **Single model**: One XGBoost per brand (will add per-model surrogates)
3. **No database**: Storing in-memory only (will add Supabase)
4. **No drift detection**: Can't alert to behavior changes yet
5. **No authentication**: No user/team support yet

## Next Steps

1. **Choose the real prediction engine** - settle the modeling approach and data contract
2. **Integrate data collection** - Connect to LLM APIs
3. **Add database** - persist features, observations, and calibration data
4. **Implement drift detection** - Alert when behavior changes
5. **Harden the frontend** - connect the product flow to the chosen engine
6. **Deploy** - production API and monitoring

## Files

```
backend/
├── main.py                 # Entry point
├── pyproject.toml         # Dependencies
├── api/
│   ├── app.py            # FastAPI factory
│   ├── models.py         # Pydantic schemas
│   └── routes/
│       ├── health.py     # Health check
│       ├── brands.py     # Brand CRUD
│       └── simulation.py # What-if scenarios
├── models/
│   └── surrogate.py      # XGBoost model
├── simulation/
│   └── simulator.py      # Scenario runner
├── data/
│   └── mock_data.py      # Synthetic training data
└── tests/
    ├── test_model.py
    ├── test_simulator.py
    └── test_api.py
```

## Performance Benchmarks

- **Model training**: ~5 minutes (on mock data)
- **Single prediction**: <1ms
- **Sensitivity analysis**: <100ms (for 7 features)
- **API response**: <200ms end-to-end

## Support

See main repository README for architecture overview and pricing details.
