"""
Step 4: Run the same question 5 times — measure variance.

Research says even at temperature=0, LLMs show up to 15% accuracy
variation across runs. Let's measure the real variance.

Usage:
    python pipeline/step4_variance.py
"""

import os
import sys
import json
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
from openai import OpenAI

env_path = Path(__file__).resolve().parent.parent.parent / "site" / ".env.local"
load_dotenv(env_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Inputs ──────────────────────────────────────────────────────────────────

QUERY = "What is the best online fashion store in Europe?"
BRANDS = ["Zalando", "ASOS", "H&M", "About You", "Shein", "Zara"]
N_SAMPLES = 5

EXTRACTION_PROMPT = f"""Answer this question naturally: "{QUERY}"

After your answer, return a JSON block:

```json
{{
  "brands_mentioned": [
    {{"brand": "Name", "position": 1, "sentiment": "positive|neutral|negative"}}
  ]
}}
```

Check each of these brands: {', '.join(BRANDS)}"""


def parse_json(text):
    start = text.find("```json")
    if start != -1:
        end = text.find("```", start + 7)
        return json.loads(text[start + 7:end].strip())
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        return json.loads(text[start:end])
    return None


# ── Run N samples ───────────────────────────────────────────────────────────

print("=" * 70)
print("STEP 4: Variance measurement")
print("=" * 70)
print(f"\nQuery:   {QUERY}")
print(f"Model:   gpt-4o-mini  |  temp=0  |  {N_SAMPLES} samples")
print()

samples = []
total_cost = 0

for i in range(N_SAMPLES):
    print(f"  Sample {i+1}/{N_SAMPLES}...", end=" ", flush=True)
    r = client.chat.completions.create(
        model="gpt-4o-mini", temperature=0,
        messages=[{"role": "user", "content": EXTRACTION_PROMPT}],
    )
    raw = r.choices[0].message.content
    cost = (r.usage.prompt_tokens * 0.15 + r.usage.completion_tokens * 0.60) / 1_000_000
    total_cost += cost

    data = parse_json(raw)
    if data:
        mentioned = {m["brand"]: m for m in data.get("brands_mentioned", [])}
        samples.append(mentioned)
        brands_listed = [m["brand"] for m in sorted(data["brands_mentioned"], key=lambda x: x["position"])]
        print(f"OK  =>  {', '.join(brands_listed)}")
    else:
        samples.append({})
        print("PARSE ERROR")

# ── Analyze variance ────────────────────────────────────────────────────────

print()
print("=" * 70)
print("VARIANCE ANALYSIS")
print("=" * 70)
print()

# Mention rate per brand
print("Brand mention rate across samples:")
print(f"  {'Brand':15s}  {'Rate':>6s}  {'Positions':20s}  {'Sentiments'}")
print("  " + "-" * 60)

for brand in BRANDS:
    appearances = []
    positions = []
    sentiments = []

    for sample in samples:
        if brand in sample:
            appearances.append(1)
            positions.append(sample[brand].get("position", "?"))
            sentiments.append(sample[brand].get("sentiment", "?"))
        else:
            appearances.append(0)

    rate = sum(appearances) / len(appearances)
    pos_str = ", ".join(f"#{p}" for p in positions) if positions else "---"
    sent_str = ", ".join(sentiments) if sentiments else "---"

    print(f"  {brand:15s}  {rate:5.0%}  {pos_str:20s}  {sent_str}")

# Position stability
print()
print("Position stability (standard deviation):")
for brand in BRANDS:
    positions = []
    for sample in samples:
        if brand in sample:
            pos = sample[brand].get("position")
            if isinstance(pos, (int, float)):
                positions.append(pos)

    if len(positions) >= 2:
        mean = sum(positions) / len(positions)
        variance = sum((p - mean) ** 2 for p in positions) / len(positions)
        std = variance ** 0.5
        print(f"  {brand:15s}  avg=#{mean:.1f}  std={std:.2f}  {'STABLE' if std < 0.5 else 'UNSTABLE'}")
    elif len(positions) == 1:
        print(f"  {brand:15s}  avg=#{positions[0]:.1f}  (only 1 appearance)")
    else:
        print(f"  {brand:15s}  never mentioned")

# Order stability
print()
print("Ranking order per sample:")
for i, sample in enumerate(samples):
    ranked = sorted(sample.items(), key=lambda x: x[1].get("position", 99))
    order = " > ".join(f"{b}" for b, _ in ranked)
    print(f"  Sample {i+1}: {order}")

# Check if all samples produced identical rankings
rankings = []
for sample in samples:
    r = tuple(b for b, _ in sorted(sample.items(), key=lambda x: x[1].get("position", 99)))
    rankings.append(r)

unique_rankings = set(rankings)
print(f"\n  Unique rankings: {len(unique_rankings)} out of {N_SAMPLES} samples")
if len(unique_rankings) == 1:
    print("  FULLY DETERMINISTIC at temperature=0")
else:
    print(f"  NON-DETERMINISTIC: {len(unique_rankings)} different orderings despite temp=0")

print(f"\n  Total cost: ${total_cost:.6f}")
