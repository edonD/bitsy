"""
Step 6: Engineer features from collected observations.

This takes the raw step5_data.json and computes the feature vector
that the surrogate model will train on.

In production, you'd have multiple days of data. Here we show what
features get extracted from a single collection run, and simulate
a few days of history to demonstrate the time-series features.

Usage:
    python pipeline/step6_features.py
"""

import os
import sys
import json
import math
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

# ── Load collected data ─────────────────────────────────────────────────────

data_path = Path(__file__).resolve().parent / "step5_data.json"
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

observations = data["observations"]
config = data["config"]
target = config["target"]
competitors = config["competitors"]
all_brands = [target] + competitors
models = config["models"]

print("=" * 70)
print("STEP 6: Feature engineering")
print("=" * 70)
print(f"\n  Loaded {len(observations)} observations from step 5")
print(f"  Target: {target}")
print()

# ═══════════════════════════════════════════════════════════════════════════
# Feature Category 1: MENTION RATES
# The core signal — how often does each brand get mentioned?
# ═══════════════════════════════════════════════════════════════════════════

print("─" * 70)
print("CATEGORY 1: Mention rates")
print("─" * 70)

brand_rates = {}
for brand in all_brands:
    brand_obs = [o for o in observations if o["brand"] == brand]
    mentioned = sum(1 for o in brand_obs if o["mentioned"])
    rate = mentioned / len(brand_obs) if brand_obs else 0
    brand_rates[brand] = rate

target_rate = brand_rates[target]
comp_rates = [brand_rates[b] for b in competitors]

features = {}

# f1: Target mention rate (the thing we're trying to predict/improve)
features["mention_rate"] = round(target_rate * 100, 2)
print(f"\n  mention_rate = {features['mention_rate']}%")
print(f"    -> {target} was mentioned in {features['mention_rate']}% of all responses")

# f2: Competitor average
features["competitor_avg_rate"] = round(sum(comp_rates) / len(comp_rates) * 100, 2)
print(f"\n  competitor_avg_rate = {features['competitor_avg_rate']}%")
print(f"    -> Average mention rate across {len(competitors)} competitors")

# f3: vs best competitor ratio
best_comp = max(comp_rates)
features["vs_best_competitor"] = round(target_rate / best_comp, 3) if best_comp > 0 else 999
print(f"\n  vs_best_competitor = {features['vs_best_competitor']}")
print(f"    -> {target} rate / best competitor rate ({max(competitors, key=lambda b: brand_rates[b])} at {best_comp*100:.1f}%)")

# f4: Market share of mentions (what % of all mentions go to target)
total_mentions = sum(1 for o in observations if o["mentioned"])
target_mentions = sum(1 for o in observations if o["brand"] == target and o["mentioned"])
features["share_of_mentions"] = round(target_mentions / total_mentions * 100, 2) if total_mentions > 0 else 0
print(f"\n  share_of_mentions = {features['share_of_mentions']}%")
print(f"    -> {target_mentions} of {total_mentions} total mentions across all brands")

# ═══════════════════════════════════════════════════════════════════════════
# Feature Category 2: POSITION SIGNALS
# Where in the response does the brand appear?
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 70)
print("CATEGORY 2: Position signals")
print("─" * 70)

target_positions = [
    o["position"] for o in observations
    if o["brand"] == target and o["mentioned"] and o["position"] is not None
]

# f5: Average position (lower is better)
features["avg_position"] = round(sum(target_positions) / len(target_positions), 2) if target_positions else None
print(f"\n  avg_position = #{features['avg_position']}")
print(f"    -> Average rank when mentioned (1 = first)")

# f6: Position #1 rate (how often is target THE top recommendation?)
top1_count = sum(1 for p in target_positions if p == 1)
features["top1_rate"] = round(top1_count / len(target_positions) * 100, 2) if target_positions else 0
print(f"\n  top1_rate = {features['top1_rate']}%")
print(f"    -> Mentioned first in {top1_count} of {len(target_positions)} appearances")

# f7: Top 3 rate (how often in top-3)
top3_count = sum(1 for p in target_positions if p <= 3)
features["top3_rate"] = round(top3_count / len(target_positions) * 100, 2) if target_positions else 0
print(f"\n  top3_rate = {features['top3_rate']}%")
print(f"    -> In top-3 in {top3_count} of {len(target_positions)} appearances")

# f8: Position variance (how stable is the ranking?)
if len(target_positions) >= 2:
    mean_pos = sum(target_positions) / len(target_positions)
    pos_var = sum((p - mean_pos) ** 2 for p in target_positions) / len(target_positions)
    features["position_std"] = round(pos_var ** 0.5, 3)
else:
    features["position_std"] = 0
print(f"\n  position_std = {features['position_std']}")
print(f"    -> Standard deviation of position (0 = perfectly stable)")

# ═══════════════════════════════════════════════════════════════════════════
# Feature Category 3: SENTIMENT
# How do the models FEEL about the brand?
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 70)
print("CATEGORY 3: Sentiment signals")
print("─" * 70)

target_sentiments = [
    o["sentiment"] for o in observations
    if o["brand"] == target and o["mentioned"] and o["sentiment"]
]

n_sent = len(target_sentiments)
pos = target_sentiments.count("positive")
neu = target_sentiments.count("neutral")
neg = target_sentiments.count("negative")

# f9: Positive sentiment rate
features["positive_rate"] = round(pos / n_sent * 100, 2) if n_sent > 0 else 0
print(f"\n  positive_rate = {features['positive_rate']}%")
print(f"    -> {pos} positive out of {n_sent} mentions")

# f10: Negative sentiment rate
features["negative_rate"] = round(neg / n_sent * 100, 2) if n_sent > 0 else 0
print(f"\n  negative_rate = {features['negative_rate']}%")
print(f"    -> {neg} negative out of {n_sent} mentions")

# f11: Net sentiment score (-100 to +100)
features["net_sentiment"] = round((pos - neg) / n_sent * 100, 2) if n_sent > 0 else 0
print(f"\n  net_sentiment = {features['net_sentiment']}")
print(f"    -> (positive - negative) / total * 100")

# ═══════════════════════════════════════════════════════════════════════════
# Feature Category 4: PER-MODEL BREAKDOWN
# Each model behaves differently — capture that
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 70)
print("CATEGORY 4: Per-model signals")
print("─" * 70)

for model in models:
    model_obs = [o for o in observations if o["brand"] == target and o["model"] == model]
    model_mentioned = [o for o in model_obs if o["mentioned"]]
    rate = len(model_mentioned) / len(model_obs) if model_obs else 0
    positions = [o["position"] for o in model_mentioned if o["position"] is not None]
    avg_pos = sum(positions) / len(positions) if positions else None

    # f12-f14: Per-model mention rate
    features[f"{model}_rate"] = round(rate * 100, 2)
    # f15-f17: Per-model avg position
    features[f"{model}_position"] = round(avg_pos, 2) if avg_pos else None

    print(f"\n  {model}_rate = {features[f'{model}_rate']}%    {model}_position = #{features[f'{model}_position']}")

# f18: Model agreement (do all models mention the target?)
model_rates = [features[f"{m}_rate"] for m in models]
features["model_agreement"] = round(min(model_rates) / max(model_rates) * 100, 2) if max(model_rates) > 0 else 0
print(f"\n  model_agreement = {features['model_agreement']}%")
print(f"    -> min_rate / max_rate — 100% means all models agree")

# f19: Model spread (range of mention rates across models)
features["model_spread"] = round(max(model_rates) - min(model_rates), 2)
print(f"\n  model_spread = {features['model_spread']} pp")
print(f"    -> Gap between best and worst model")

# ═══════════════════════════════════════════════════════════════════════════
# Feature Category 5: QUERY-LEVEL SIGNALS
# Some queries are more favorable than others
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 70)
print("CATEGORY 5: Query-level signals")
print("─" * 70)

queries = config["queries"]
query_rates = {}
for query in queries:
    query_obs = [o for o in observations if o["brand"] == target and o["query"] == query]
    mentioned = sum(1 for o in query_obs if o["mentioned"])
    query_rates[query] = mentioned / len(query_obs) if query_obs else 0

# f20: Best query rate
features["best_query_rate"] = round(max(query_rates.values()) * 100, 2)
best_query = max(query_rates, key=query_rates.get)
print(f"\n  best_query_rate = {features['best_query_rate']}%")
print(f"    -> Best query: \"{best_query[:60]}\"")

# f21: Worst query rate
features["worst_query_rate"] = round(min(query_rates.values()) * 100, 2)
worst_query = min(query_rates, key=query_rates.get)
print(f"\n  worst_query_rate = {features['worst_query_rate']}%")
print(f"    -> Worst query: \"{worst_query[:60]}\"")

# f22: Query coverage (% of queries where target appears at all)
covered = sum(1 for r in query_rates.values() if r > 0)
features["query_coverage"] = round(covered / len(queries) * 100, 2)
print(f"\n  query_coverage = {features['query_coverage']}%")
print(f"    -> Mentioned in {covered} of {len(queries)} queries")

# f23: Average query length (longer queries = more specific = different behavior)
features["avg_query_length"] = round(sum(len(q.split()) for q in queries) / len(queries), 1)
print(f"\n  avg_query_length = {features['avg_query_length']} words")

# ═══════════════════════════════════════════════════════════════════════════
# Feature Category 6: COMPETITIVE DYNAMICS
# How does the target compare to each competitor?
# ═══════════════════════════════════════════════════════════════════════════

print()
print("─" * 70)
print("CATEGORY 6: Competitive dynamics")
print("─" * 70)

# f24: Number of competitors with higher mention rate
features["brands_ahead"] = sum(1 for b in competitors if brand_rates[b] > brand_rates[target])
print(f"\n  brands_ahead = {features['brands_ahead']}")
print(f"    -> Competitors with higher mention rate than {target}")

# f25: Competitive gap to #1 (if not #1)
sorted_brands = sorted(all_brands, key=lambda b: brand_rates[b], reverse=True)
target_rank = sorted_brands.index(target) + 1
if target_rank > 1:
    leader_rate = brand_rates[sorted_brands[0]]
    features["gap_to_leader"] = round((leader_rate - target_rate) * 100, 2)
else:
    features["gap_to_leader"] = 0
print(f"\n  gap_to_leader = {features['gap_to_leader']} pp")
print(f"    -> {target} is rank #{target_rank} overall")

# f26: Competitive displacement score
# When target is NOT mentioned, which competitor takes its slot?
not_mentioned_queries = [
    (o["query"], o["model"], o["sample"])
    for o in observations
    if o["brand"] == target and not o["mentioned"]
]
displacement = defaultdict(int)
for q, m, s in not_mentioned_queries:
    for o in observations:
        if o["query"] == q and o["model"] == m and o["sample"] == s and o["mentioned"] and o["brand"] != target:
            if o["position"] is not None and o["position"] <= 2:
                displacement[o["brand"]] += 1

if displacement:
    top_displacer = max(displacement, key=displacement.get)
    features["top_displacer"] = top_displacer
    features["displacement_count"] = displacement[top_displacer]
    print(f"\n  top_displacer = {top_displacer} ({displacement[top_displacer]} times)")
    print(f"    -> When {target} isn't mentioned, this brand takes position 1-2")
else:
    features["top_displacer"] = "none"
    features["displacement_count"] = 0
    print(f"\n  top_displacer = none ({target} is always mentioned)")

# ═══════════════════════════════════════════════════════════════════════════
# FULL FEATURE VECTOR
# ═══════════════════════════════════════════════════════════════════════════

print()
print("=" * 70)
print("COMPLETE FEATURE VECTOR (26 features)")
print("=" * 70)
print()

numeric_features = {k: v for k, v in features.items() if isinstance(v, (int, float)) and v is not None}

for i, (name, value) in enumerate(numeric_features.items(), 1):
    print(f"  {i:2d}. {name:30s} = {value}")

print(f"\n  Total numeric features: {len(numeric_features)}")
print(f"  These are the inputs to the XGBoost surrogate model.")

# ── Save feature vector ─────────────────────────────────────────────────────

output_path = Path(__file__).resolve().parent / "step6_features.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump({
        "target": target,
        "collected_at": data["collected_at"],
        "features": features,
        "numeric_features": numeric_features,
    }, f, indent=2, ensure_ascii=False)

print(f"\n  Saved to: {output_path}")
