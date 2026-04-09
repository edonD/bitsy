"""
Step 5: Full collection run — multiple queries, models, samples.

This is what a daily collection job looks like.
We run 3 queries x 3 models x 3 samples = 27 API calls,
then aggregate into brand-level stats.

Usage:
    python pipeline/step5_collect.py
"""

import os
import sys
import json
import math
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent / "site" / ".env.local"
load_dotenv(env_path)

# ── Inputs ──────────────────────────────────────────────────────────────────

TARGET = "Zalando"
COMPETITORS = ["ASOS", "H&M", "About You", "Shein", "Zara"]
BRANDS = [TARGET] + COMPETITORS

QUERIES = [
    "What is the best online fashion store in Europe?",
    "Where should I buy affordable designer clothes online?",
    "Best sustainable fashion marketplace in Europe?",
]

SAMPLES_PER_QUERY = 3

# ── Model callers ───────────────────────────────────────────────────────────

def make_prompt(query):
    return f"""Answer this question: "{query}"

Return a JSON block:

```json
{{
  "brands_mentioned": [
    {{"brand": "Name", "position": 1, "sentiment": "positive|neutral|negative"}}
  ]
}}
```

Check each: {', '.join(BRANDS)}"""


def call_openai(prompt):
    from openai import OpenAI
    c = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    r = c.chat.completions.create(
        model="gpt-4o-mini", temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    return r.choices[0].message.content


def call_anthropic(prompt):
    from anthropic import Anthropic
    c = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    r = c.messages.create(
        model="claude-sonnet-4-20250514", max_tokens=1024, temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    return r.content[0].text


def call_google(prompt):
    from google import genai
    c = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    r = c.models.generate_content(
        model="gemini-2.5-flash", contents=prompt,
        config={"temperature": 0},
    )
    return r.text


MODELS = {
    "chatgpt": call_openai,
    "claude": call_anthropic,
    "gemini": call_google,
}


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


# ── Collection ──────────────────────────────────────────────────────────────

total_calls = len(QUERIES) * len(MODELS) * SAMPLES_PER_QUERY

print("=" * 70)
print("STEP 5: Full collection run")
print("=" * 70)
print(f"\n  Target:      {TARGET}")
print(f"  Competitors: {', '.join(COMPETITORS)}")
print(f"  Queries:     {len(QUERIES)}")
print(f"  Models:      {len(MODELS)}")
print(f"  Samples:     {SAMPLES_PER_QUERY} per query per model")
print(f"  Total calls: {total_calls}")
print(f"  Started:     {datetime.now().strftime('%H:%M:%S')}")
print()

# Store every observation
observations = []  # list of {query, model, sample, brand, mentioned, position, sentiment}

call_num = 0

for query in QUERIES:
    for model_name, caller in MODELS.items():
        for sample_idx in range(SAMPLES_PER_QUERY):
            call_num += 1
            print(f"  [{call_num:2d}/{total_calls}] {model_name:8s} | sample {sample_idx+1} | {query[:45]}...", end=" ", flush=True)

            try:
                raw = caller(make_prompt(query))
                data = parse_json(raw)
                if data:
                    mentioned = {m["brand"]: m for m in data.get("brands_mentioned", [])}
                    for brand in BRANDS:
                        if brand in mentioned:
                            m = mentioned[brand]
                            observations.append({
                                "query": query,
                                "model": model_name,
                                "sample": sample_idx,
                                "brand": brand,
                                "mentioned": True,
                                "position": m.get("position"),
                                "sentiment": m.get("sentiment", "neutral"),
                            })
                        else:
                            observations.append({
                                "query": query,
                                "model": model_name,
                                "sample": sample_idx,
                                "brand": brand,
                                "mentioned": False,
                                "position": None,
                                "sentiment": None,
                            })
                    print("OK")
                else:
                    print("PARSE FAIL")
            except Exception as e:
                print(f"ERROR: {e}")

print(f"\n  Finished:    {datetime.now().strftime('%H:%M:%S')}")
print(f"  Observations: {len(observations)}")

# ── Aggregate: Brand Stats ──────────────────────────────────────────────────

print()
print("=" * 70)
print("AGGREGATED BRAND STATS")
print("=" * 70)
print()

for brand in BRANDS:
    brand_obs = [o for o in observations if o["brand"] == brand]
    total = len(brand_obs)
    mentioned_obs = [o for o in brand_obs if o["mentioned"]]
    mention_rate = len(mentioned_obs) / total if total > 0 else 0

    positions = [o["position"] for o in mentioned_obs if o["position"] is not None]
    avg_pos = sum(positions) / len(positions) if positions else None

    sentiments = [o["sentiment"] for o in mentioned_obs if o["sentiment"]]
    pos_sent = sentiments.count("positive")
    neu_sent = sentiments.count("neutral")
    neg_sent = sentiments.count("negative")

    is_target = " [TARGET]" if brand == TARGET else ""
    print(f"  {brand}{is_target}")
    print(f"    Mention rate:  {mention_rate:.0%} ({len(mentioned_obs)}/{total})")
    if avg_pos:
        print(f"    Avg position:  #{avg_pos:.1f}")
    print(f"    Sentiment:     +{pos_sent}  ~{neu_sent}  -{neg_sent}")

    # Per-model breakdown
    for model_name in MODELS:
        model_obs = [o for o in brand_obs if o["model"] == model_name]
        model_mentioned = [o for o in model_obs if o["mentioned"]]
        model_rate = len(model_mentioned) / len(model_obs) if model_obs else 0
        model_positions = [o["position"] for o in model_mentioned if o["position"] is not None]
        model_avg = sum(model_positions) / len(model_positions) if model_positions else None
        pos_str = f"#{model_avg:.1f}" if model_avg else "---"
        print(f"      {model_name:8s}: {model_rate:5.0%}  pos={pos_str}")
    print()

# ── Confidence intervals ────────────────────────────────────────────────────

print("=" * 70)
print("STATISTICAL CONFIDENCE")
print("=" * 70)
print()
print("  95% confidence intervals (Wilson score):")
print()

for brand in BRANDS:
    brand_obs = [o for o in observations if o["brand"] == brand]
    n = len(brand_obs)
    k = sum(1 for o in brand_obs if o["mentioned"])
    p = k / n if n > 0 else 0

    # Wilson score interval
    z = 1.96
    denom = 1 + z**2 / n
    center = (p + z**2 / (2 * n)) / denom
    margin = z * math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n) / denom
    lower = max(0, center - margin)
    upper = min(1, center + margin)

    width = upper - lower
    is_target = " *" if brand == TARGET else ""
    print(f"  {brand:15s}  {p:5.0%}  CI=[{lower:.0%}, {upper:.0%}]  width={width:.0%}{is_target}")

# ── Save raw data ───────────────────────────────────────────────────────────

output_path = Path(__file__).resolve().parent / "step5_data.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump({
        "collected_at": datetime.now().isoformat(),
        "config": {
            "target": TARGET,
            "competitors": COMPETITORS,
            "queries": QUERIES,
            "models": list(MODELS.keys()),
            "samples_per_query": SAMPLES_PER_QUERY,
        },
        "observations": observations,
    }, f, indent=2, ensure_ascii=False)

print(f"\n  Raw data saved to: {output_path}")
