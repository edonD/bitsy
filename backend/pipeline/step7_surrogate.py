"""
Step 7: Train the surrogate model on real features.

We have 162 observations from step 5. We compute features for EVERY
brand (6 brands = 6 rows), which gives us training data.

Then we train XGBoost to predict mention_rate from the other features.
With only 6 rows, this is a toy model — but it shows the real pipeline.
In production you'd have 6 brands x 30 days = 180 rows.

Usage:
    python pipeline/step7_surrogate.py
"""

import sys
import json
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_squared_error, r2_score

# ── Load collected data ─────────────────────────────────────────────────────

data_path = Path(__file__).resolve().parent / "step5_data.json"
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

observations = data["observations"]
config = data["config"]
target = config["target"]
all_brands = [target] + config["competitors"]
models = config["models"]
queries = config["queries"]

print("=" * 70)
print("STEP 7: Train surrogate model")
print("=" * 70)

# ═══════════════════════════════════════════════════════════════════════════
# Part A: Compute features for EVERY brand (not just target)
# This gives us 6 training rows from 1 collection run.
# ═══════════════════════════════════════════════════════════════════════════

print("\n--- Part A: Feature extraction for all brands ---\n")

def compute_features(brand, observations, all_brands, models, queries):
    """Extract feature vector for one brand from observations."""
    brand_obs = [o for o in observations if o["brand"] == brand]
    others = [b for b in all_brands if b != brand]

    total = len(brand_obs)
    mentioned = [o for o in brand_obs if o["mentioned"]]
    rate = len(mentioned) / total if total > 0 else 0

    # Positions
    positions = [o["position"] for o in mentioned if o["position"] is not None]
    avg_pos = sum(positions) / len(positions) if positions else 10
    top1 = sum(1 for p in positions if p == 1) / len(positions) if positions else 0
    top3 = sum(1 for p in positions if p <= 3) / len(positions) if positions else 0
    pos_std = (sum((p - avg_pos)**2 for p in positions) / len(positions)) ** 0.5 if len(positions) >= 2 else 0

    # Sentiment
    sents = [o["sentiment"] for o in mentioned if o["sentiment"]]
    n_sent = len(sents)
    pos_rate = sents.count("positive") / n_sent if n_sent > 0 else 0
    neg_rate = sents.count("negative") / n_sent if n_sent > 0 else 0
    net_sent = (sents.count("positive") - sents.count("negative")) / n_sent if n_sent > 0 else 0

    # Competitor rates
    comp_rates = []
    for other in others:
        other_obs = [o for o in observations if o["brand"] == other]
        other_mentioned = sum(1 for o in other_obs if o["mentioned"])
        comp_rates.append(other_mentioned / len(other_obs) if other_obs else 0)

    comp_avg = sum(comp_rates) / len(comp_rates) if comp_rates else 0
    best_comp = max(comp_rates) if comp_rates else 0
    brands_ahead = sum(1 for r in comp_rates if r > rate)

    # Per-model rates
    model_rates = []
    for model in models:
        model_obs = [o for o in brand_obs if o["model"] == model]
        model_mentioned = sum(1 for o in model_obs if o["mentioned"])
        model_rates.append(model_mentioned / len(model_obs) if model_obs else 0)

    model_min = min(model_rates) if model_rates else 0
    model_max = max(model_rates) if model_rates else 0
    model_agreement = model_min / model_max if model_max > 0 else 0
    model_spread = model_max - model_min

    # Query coverage
    query_rates = []
    for query in queries:
        q_obs = [o for o in brand_obs if o["query"] == query]
        q_mentioned = sum(1 for o in q_obs if o["mentioned"])
        query_rates.append(q_mentioned / len(q_obs) if q_obs else 0)
    query_coverage = sum(1 for r in query_rates if r > 0) / len(queries)

    # Share of mentions
    total_all_mentions = sum(1 for o in observations if o["mentioned"])
    brand_mentions = len(mentioned)
    share = brand_mentions / total_all_mentions if total_all_mentions > 0 else 0

    return {
        "mention_rate": round(rate * 100, 2),  # THIS IS THE TARGET VARIABLE
        # Position
        "avg_position": round(avg_pos, 2),
        "top1_rate": round(top1 * 100, 2),
        "top3_rate": round(top3 * 100, 2),
        "position_std": round(pos_std, 3),
        # Sentiment
        "positive_rate": round(pos_rate * 100, 2),
        "negative_rate": round(neg_rate * 100, 2),
        "net_sentiment": round(net_sent * 100, 2),
        # Competition
        "competitor_avg_rate": round(comp_avg * 100, 2),
        "vs_best_competitor": round(rate / best_comp, 3) if best_comp > 0 else 1.0,
        "brands_ahead": brands_ahead,
        "share_of_mentions": round(share * 100, 2),
        # Model signals
        "model_agreement": round(model_agreement * 100, 2),
        "model_spread": round(model_spread * 100, 2),
        # Query signals
        "query_coverage": round(query_coverage * 100, 2),
    }


rows = []
for brand in all_brands:
    feats = compute_features(brand, observations, all_brands, models, queries)
    feats["brand"] = brand
    rows.append(feats)
    is_target = " [TARGET]" if brand == target else ""
    print(f"  {brand}{is_target}: mention_rate={feats['mention_rate']}%  avg_pos=#{feats['avg_position']}  net_sent={feats['net_sentiment']}")

df = pd.DataFrame(rows)
print(f"\n  Training data: {len(df)} rows x {len(df.columns)-1} features")

# ═══════════════════════════════════════════════════════════════════════════
# Part B: Train XGBoost
# Predict mention_rate from the other features.
# ═══════════════════════════════════════════════════════════════════════════

print("\n--- Part B: Train XGBoost ---\n")

feature_cols = [c for c in df.columns if c not in ("brand", "mention_rate")]
X = df[feature_cols]
y = df["mention_rate"]

print(f"  Features ({len(feature_cols)}): {', '.join(feature_cols)}")
print(f"  Target: mention_rate")
print(f"  Rows: {len(X)}")
print()

# With 6 rows, we train on all and report in-sample fit.
# In production with 180+ rows, you'd use walk-forward validation.
model = xgb.XGBRegressor(
    n_estimators=50,
    max_depth=3,
    learning_rate=0.1,
    random_state=42,
    objective="reg:squarederror",
    verbosity=0,
)

model.fit(X, y)

y_pred = model.predict(X)
rmse = float(np.sqrt(mean_squared_error(y, y_pred)))
r2 = float(r2_score(y, y_pred))

print(f"  In-sample RMSE: {rmse:.2f} percentage points")
print(f"  In-sample R2:   {r2:.4f}")
print()

# Show predictions vs actual
print("  Brand predictions:")
print(f"  {'Brand':15s}  {'Actual':>8s}  {'Predicted':>10s}  {'Error':>8s}")
print("  " + "-" * 45)
for i, row in df.iterrows():
    actual = row["mention_rate"]
    pred = y_pred[i]
    error = pred - actual
    is_target = " *" if row["brand"] == target else ""
    print(f"  {row['brand']:15s}  {actual:7.1f}%  {pred:9.1f}%  {error:+7.1f}{is_target}")

# ═══════════════════════════════════════════════════════════════════════════
# Part C: Feature importance
# Which features drive mention rate the most?
# ═══════════════════════════════════════════════════════════════════════════

print("\n--- Part C: Feature importance ---\n")

importances = model.feature_importances_
importance_df = pd.DataFrame({
    "feature": feature_cols,
    "importance": importances,
}).sort_values("importance", ascending=False)

print("  Rank  Feature                        Importance")
print("  " + "-" * 50)
for rank, (_, row) in enumerate(importance_df.iterrows(), 1):
    bar = "█" * int(row["importance"] * 40)
    print(f"  {rank:4d}  {row['feature']:30s}  {row['importance']:.3f}  {bar}")

# ═══════════════════════════════════════════════════════════════════════════
# Part D: What-if simulation (the real thing!)
# "What would happen if Shein improved its sentiment?"
# ═══════════════════════════════════════════════════════════════════════════

print("\n--- Part D: What-if simulation (using real surrogate) ---\n")

# Get Shein's current features
shein_row = df[df["brand"] == "Shein"].iloc[0]
shein_features = shein_row[feature_cols].to_dict()

print(f"  Shein's current mention rate: {shein_row['mention_rate']}%")
print(f"  Shein's current sentiment: net_sentiment={shein_features['net_sentiment']}")
print()

# Scenario: What if Shein's sentiment improved from negative to neutral?
scenarios = [
    ("Current state", {}),
    ("Sentiment improves to 0 (neutral)", {"net_sentiment": 0, "negative_rate": 0, "positive_rate": 0}),
    ("Sentiment improves to +50 (mostly positive)", {"net_sentiment": 50, "negative_rate": 10, "positive_rate": 60}),
    ("Sentiment improves to +100 (all positive)", {"net_sentiment": 100, "negative_rate": 0, "positive_rate": 100}),
    ("Gets to #1 position", {"avg_position": 1.0, "top1_rate": 80, "top3_rate": 100}),
    ("All models agree (100%)", {"model_agreement": 100, "model_spread": 0}),
]

print(f"  {'Scenario':50s}  {'Predicted rate':>15s}  {'Change':>8s}")
print("  " + "-" * 75)

base_pred = None
for name, changes in scenarios:
    modified = {**shein_features, **changes}
    X_scenario = pd.DataFrame([modified])[feature_cols]
    pred = float(model.predict(X_scenario)[0])
    pred = max(0, min(100, pred))

    if base_pred is None:
        base_pred = pred
        change_str = "baseline"
    else:
        change = pred - base_pred
        change_str = f"{change:+.1f} pp"

    print(f"  {name:50s}  {pred:13.1f}%  {change_str:>8s}")

# ── Save model info ─────────────────────────────────────────────────────────

output_path = Path(__file__).resolve().parent / "step7_model.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump({
        "model_type": "XGBRegressor",
        "n_features": len(feature_cols),
        "feature_names": feature_cols,
        "training_rows": len(X),
        "in_sample_rmse": rmse,
        "in_sample_r2": r2,
        "feature_importance": dict(zip(feature_cols, [float(x) for x in importances])),
        "note": "Trained on 6 brands from 1 collection. In production: 6 brands x 30 days = 180 rows with walk-forward validation.",
    }, f, indent=2)

print(f"\n  Model info saved to: {output_path}")
