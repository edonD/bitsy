"""
Step 8: What-if simulation with realistic training data.

Step 7 showed the cold-start problem: 6 rows = model only learns 1 feature.
Here we simulate 30 days of collection (6 brands x 30 days = 180 rows)
with realistic daily variance, then train a proper surrogate and run
what-if scenarios.

This is what the product looks like after 1 month of data collection.

Usage:
    python pipeline/step8_whatif.py
"""

import sys
import json
import math
import random
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error

# ── Load the real day-1 data as seed ────────────────────────────────────────

data_path = Path(__file__).resolve().parent / "step5_data.json"
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

observations = data["observations"]
config = data["config"]
target = config["target"]
all_brands = [target] + config["competitors"]
models_list = config["models"]

print("=" * 70)
print("STEP 8: What-if simulation (30-day surrogate)")
print("=" * 70)

# ═══════════════════════════════════════════════════════════════════════════
# Part A: Generate 30 days of training data
#
# We use the real day-1 observations as the seed, then simulate daily
# variance to create 30 days of features. Each day, features drift
# slightly — modeling real-world changes in AI visibility.
# ═══════════════════════════════════════════════════════════════════════════

print("\n--- Part A: Generate 30-day training data from real seed ---\n")

def compute_day1_features(brand, observations, all_brands, models_list):
    """Same feature extraction as step 6/7, returns dict."""
    brand_obs = [o for o in observations if o["brand"] == brand]
    others = [b for b in all_brands if b != brand]

    total = len(brand_obs)
    mentioned = [o for o in brand_obs if o["mentioned"]]
    rate = len(mentioned) / total if total > 0 else 0

    positions = [o["position"] for o in mentioned if o["position"] is not None]
    avg_pos = sum(positions) / len(positions) if positions else 10
    top1 = sum(1 for p in positions if p == 1) / len(positions) if positions else 0
    top3 = sum(1 for p in positions if p <= 3) / len(positions) if positions else 0
    pos_std = (sum((p - avg_pos)**2 for p in positions) / len(positions)) ** 0.5 if len(positions) >= 2 else 0

    sents = [o["sentiment"] for o in mentioned if o["sentiment"]]
    n_sent = len(sents)
    pos_rate = sents.count("positive") / n_sent if n_sent > 0 else 0.5
    neg_rate = sents.count("negative") / n_sent if n_sent > 0 else 0
    net_sent = (sents.count("positive") - sents.count("negative")) / n_sent if n_sent > 0 else 0

    comp_rates = []
    for other in others:
        o_obs = [o for o in observations if o["brand"] == other]
        o_ment = sum(1 for o in o_obs if o["mentioned"])
        comp_rates.append(o_ment / len(o_obs) if o_obs else 0)
    comp_avg = sum(comp_rates) / len(comp_rates) if comp_rates else 0
    best_comp = max(comp_rates) if comp_rates else 0

    model_rates = []
    for model in models_list:
        m_obs = [o for o in brand_obs if o["model"] == model]
        m_ment = sum(1 for o in m_obs if o["mentioned"])
        model_rates.append(m_ment / len(m_obs) if m_obs else 0)
    model_min = min(model_rates) if model_rates else 0
    model_max = max(model_rates) if model_rates else 0

    total_ment = sum(1 for o in observations if o["mentioned"])
    share = len(mentioned) / total_ment if total_ment > 0 else 0

    return {
        "mention_rate": rate * 100,
        "avg_position": avg_pos,
        "top1_rate": top1 * 100,
        "top3_rate": top3 * 100,
        "position_std": pos_std,
        "positive_rate": pos_rate * 100,
        "negative_rate": neg_rate * 100,
        "net_sentiment": net_sent * 100,
        "competitor_avg_rate": comp_avg * 100,
        "vs_best_competitor": rate / best_comp if best_comp > 0 else 1.0,
        "share_of_mentions": share * 100,
        "model_agreement": (model_min / model_max * 100) if model_max > 0 else 0,
        "model_spread": (model_max - model_min) * 100,
        "query_coverage": 100.0,
    }

# Get real day-1 features for each brand
random.seed(42)
np.random.seed(42)

day1_features = {}
for brand in all_brands:
    day1_features[brand] = compute_day1_features(brand, observations, all_brands, models_list)

# Simulate 30 days with realistic daily variance
training_rows = []
N_DAYS = 30

for day in range(N_DAYS):
    for brand in all_brands:
        base = day1_features[brand].copy()
        row = {}

        for feat, val in base.items():
            if feat == "mention_rate":
                # The target variable drifts with noise
                # Simulate: mention rates change ~2-5% per day randomly
                drift = random.gauss(0, 3)
                # Brand-specific trends: Shein is improving, Zara declining
                if brand == "Shein":
                    drift += 0.5  # slight upward trend
                elif brand == "Zara":
                    drift -= 0.3  # slight decline
                row[feat] = max(0, min(100, val + drift + random.gauss(0, 2) * (day / 30)))
            elif feat in ("avg_position", "position_std"):
                row[feat] = max(0.5, val + random.gauss(0, 0.3))
            elif feat in ("positive_rate", "negative_rate", "net_sentiment"):
                row[feat] = max(-100, min(100, val + random.gauss(0, 5)))
            elif feat in ("top1_rate", "top3_rate", "query_coverage"):
                row[feat] = max(0, min(100, val + random.gauss(0, 4)))
            elif feat in ("model_agreement",):
                row[feat] = max(0, min(100, val + random.gauss(0, 3)))
            elif feat in ("model_spread",):
                row[feat] = max(0, min(100, val + random.gauss(0, 2)))
            else:
                row[feat] = max(0, val + random.gauss(0, 2))

        row["brand"] = brand
        row["day"] = day
        training_rows.append(row)

df = pd.DataFrame(training_rows)
print(f"  Generated {len(df)} training rows ({N_DAYS} days x {len(all_brands)} brands)")
print(f"  Features: {len([c for c in df.columns if c not in ('brand', 'day', 'mention_rate')])}")
print()

# Show summary per brand
print("  Brand averages over 30 days:")
print(f"  {'Brand':15s}  {'Avg rate':>10s}  {'Std':>6s}  {'Min':>6s}  {'Max':>6s}")
print("  " + "-" * 45)
for brand in all_brands:
    brand_df = df[df["brand"] == brand]
    is_tgt = " *" if brand == target else ""
    print(f"  {brand:15s}  {brand_df['mention_rate'].mean():9.1f}%  {brand_df['mention_rate'].std():5.1f}  {brand_df['mention_rate'].min():5.1f}  {brand_df['mention_rate'].max():5.1f}{is_tgt}")

# ═══════════════════════════════════════════════════════════════════════════
# Part B: Train XGBoost with walk-forward validation
# ═══════════════════════════════════════════════════════════════════════════

print("\n--- Part B: Train XGBoost (walk-forward validation) ---\n")

feature_cols = [c for c in df.columns if c not in ("brand", "day", "mention_rate")]
X = df[feature_cols]
y = df["mention_rate"]

# Walk-forward: train on first 80%, validate on last 20%
split = int(len(df) * 0.8)
X_train, X_val = X.iloc[:split], X.iloc[split:]
y_train, y_val = y.iloc[:split], y.iloc[split:]

model = xgb.XGBRegressor(
    n_estimators=100,
    max_depth=4,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    objective="reg:squarederror",
    verbosity=0,
)

model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

y_pred_val = model.predict(X_val)
rmse = float(np.sqrt(mean_squared_error(y_val, y_pred_val)))
mae = float(mean_absolute_error(y_val, y_pred_val))
r2 = float(r2_score(y_val, y_pred_val))

print(f"  Training rows: {len(X_train)}  |  Validation rows: {len(X_val)}")
print(f"  Validation RMSE: {rmse:.2f} pp")
print(f"  Validation MAE:  {mae:.2f} pp")
print(f"  Validation R2:   {r2:.4f}")

quality = "GOOD" if r2 > 0.7 else "NEEDS MORE DATA" if r2 > 0.3 else "POOR"
print(f"  Model quality:   {quality}")

# ═══════════════════════════════════════════════════════════════════════════
# Part C: Feature importance (now with real spread)
# ═══════════════════════════════════════════════════════════════════════════

print("\n--- Part C: Feature importance ---\n")

importances = model.feature_importances_
imp_df = pd.DataFrame({
    "feature": feature_cols,
    "importance": importances,
}).sort_values("importance", ascending=False)

print("  Rank  Feature                        Importance")
print("  " + "-" * 55)
for rank, (_, row) in enumerate(imp_df.iterrows(), 1):
    bar = "█" * int(row["importance"] * 30)
    print(f"  {rank:4d}  {row['feature']:30s}  {row['importance']:.3f}  {bar}")

# ═══════════════════════════════════════════════════════════════════════════
# Part D: What-if scenarios for Zalando
# ═══════════════════════════════════════════════════════════════════════════

print("\n--- Part D: What-if scenarios for Zalando ---\n")

# Get Zalando's latest features (day 29)
zalando_latest = df[(df["brand"] == target) & (df["day"] == N_DAYS - 1)].iloc[0]
base_features = zalando_latest[feature_cols].to_dict()
base_pred = float(model.predict(pd.DataFrame([base_features])[feature_cols])[0])

print(f"  Zalando's current predicted rate: {base_pred:.1f}%\n")

scenarios = [
    ("Baseline (no changes)", {}),
    ("Position drops to #3", {"avg_position": 3.0, "top1_rate": 20, "top3_rate": 80}),
    ("Sentiment drops to neutral", {"net_sentiment": 0, "positive_rate": 50, "negative_rate": 0}),
    ("Lose one model (agreement drops)", {"model_agreement": 66, "model_spread": 34}),
    ("Query coverage drops to 66%", {"query_coverage": 66}),
    ("Competitor avg rises to 95%", {"competitor_avg_rate": 95, "vs_best_competitor": 0.95}),
    ("WORST CASE: all bad signals", {
        "avg_position": 4.0, "top1_rate": 10, "top3_rate": 50,
        "net_sentiment": 20, "model_agreement": 50, "model_spread": 50,
        "query_coverage": 33, "competitor_avg_rate": 95,
    }),
]

print(f"  {'Scenario':50s}  {'Predicted':>10s}  {'Change':>10s}")
print("  " + "-" * 72)

for name, changes in scenarios:
    modified = {**base_features, **changes}
    pred = float(model.predict(pd.DataFrame([modified])[feature_cols])[0])
    pred = max(0, min(100, pred))
    delta = pred - base_pred
    delta_str = f"{delta:+.1f} pp" if changes else "baseline"
    print(f"  {name:50s}  {pred:9.1f}%  {delta_str:>10s}")

# ═══════════════════════════════════════════════════════════════════════════
# Part E: What-if scenarios for Shein (the underdog)
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n--- Part E: What-if scenarios for Shein (the underdog) ---\n")

shein_latest = df[(df["brand"] == "Shein") & (df["day"] == N_DAYS - 1)].iloc[0]
shein_features = shein_latest[feature_cols].to_dict()
shein_pred = float(model.predict(pd.DataFrame([shein_features])[feature_cols])[0])

print(f"  Shein's current predicted rate: {shein_pred:.1f}%")
print(f"  Shein's current sentiment: {shein_features['net_sentiment']:.0f}\n")

shein_scenarios = [
    ("Baseline (no changes)", {}),
    ("Fix sentiment (neutral -> positive)", {"net_sentiment": 60, "positive_rate": 70, "negative_rate": 10}),
    ("Improve position to top-3", {"avg_position": 2.5, "top1_rate": 30, "top3_rate": 90}),
    ("Get all models to agree", {"model_agreement": 100, "model_spread": 0}),
    ("ALL improvements combined", {
        "net_sentiment": 60, "positive_rate": 70, "negative_rate": 10,
        "avg_position": 2.0, "top1_rate": 40, "top3_rate": 95,
        "model_agreement": 100, "model_spread": 0,
    }),
]

print(f"  {'Scenario':50s}  {'Predicted':>10s}  {'Change':>10s}")
print("  " + "-" * 72)

for name, changes in shein_scenarios:
    modified = {**shein_features, **changes}
    pred = float(model.predict(pd.DataFrame([modified])[feature_cols])[0])
    pred = max(0, min(100, pred))
    delta = pred - shein_pred
    delta_str = f"{delta:+.1f} pp" if changes else "baseline"
    print(f"  {name:50s}  {pred:9.1f}%  {delta_str:>10s}")

# ═══════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 70)
print("PIPELINE COMPLETE")
print("=" * 70)
print(f"""
  Step 1: Raw API call            -> See what an LLM actually says
  Step 2: Structured extraction   -> Parse mentions, position, sentiment
  Step 3: Multi-model comparison  -> See how models disagree
  Step 4: Variance measurement    -> Quantify non-determinism
  Step 5: Full collection         -> 27 real API calls, 162 observations
  Step 6: Feature engineering     -> 26 features from real data
  Step 7: Train surrogate         -> XGBoost on real features (cold-start)
  Step 8: What-if simulation      -> Predict impact of changes

  This is the REAL product. Each step is an independent function.
  Chain them: collect -> features -> train -> predict.
""")
