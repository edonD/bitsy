"""
Step 3: Same question across 3 models — see how they disagree.

Research says brands disagree 62% of the time across platforms.
Let's verify with real data.

Usage:
    python pipeline/step3_multimodel.py
"""

import os
import sys
import json
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent / "site" / ".env.local"
load_dotenv(env_path)

# ── Inputs ──────────────────────────────────────────────────────────────────

QUERY = "What is the best online fashion store in Europe?"
BRANDS = ["Zalando", "ASOS", "H&M", "About You", "Shein", "Zara"]

# ── Extraction prompt (same for all models) ─────────────────────────────────

EXTRACTION_PROMPT = f"""Answer this question naturally: "{QUERY}"

After your answer, return a JSON block with EXACTLY this format:

```json
{{
  "brands_mentioned": [
    {{"brand": "Name", "position": 1, "sentiment": "positive|neutral|negative", "reason": "one sentence"}}
  ],
  "brands_not_mentioned": ["Name1"]
}}
```

Check each of these brands: {', '.join(BRANDS)}
Report every one as either mentioned or not mentioned."""

# ── Model callers ───────────────────────────────────────────────────────────

def call_openai():
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    r = client.chat.completions.create(
        model="gpt-4o-mini", temperature=0,
        messages=[{"role": "user", "content": EXTRACTION_PROMPT}],
    )
    return r.choices[0].message.content, r.usage.prompt_tokens + r.usage.completion_tokens

def call_anthropic():
    from anthropic import Anthropic
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    r = client.messages.create(
        model="claude-sonnet-4-20250514", max_tokens=1024, temperature=0,
        messages=[{"role": "user", "content": EXTRACTION_PROMPT}],
    )
    return r.content[0].text, r.usage.input_tokens + r.usage.output_tokens

def call_google():
    from google import genai
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    r = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=EXTRACTION_PROMPT,
        config={"temperature": 0},
    )
    tokens = 0
    if r.usage_metadata:
        tokens = (r.usage_metadata.prompt_token_count or 0) + (r.usage_metadata.candidates_token_count or 0)
    return r.text, tokens

# ── Parse JSON from response ───────────────────────────────────────────────

def parse_json(text):
    start = text.find("```json")
    if start != -1:
        end = text.find("```", start + 7)
        return json.loads(text[start + 7:end].strip())
    # Fallback: find first { ... last }
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        return json.loads(text[start:end])
    return None

# ── Run all 3 ───────────────────────────────────────────────────────────────

MODELS = [
    ("ChatGPT (gpt-4o-mini)", call_openai),
    ("Claude (sonnet-4)", call_anthropic),
    ("Gemini (2.0-flash)", call_google),
]

print("=" * 70)
print("STEP 3: Multi-model comparison")
print("=" * 70)
print(f"\nQuery: {QUERY}")
print(f"Tracking: {', '.join(BRANDS)}")
print()

results = {}

for model_name, caller in MODELS:
    print(f"  Calling {model_name}...", end=" ", flush=True)
    try:
        raw, tokens = caller()
        data = parse_json(raw)
        if data:
            mentioned = {m["brand"]: m for m in data.get("brands_mentioned", [])}
            results[model_name] = mentioned
            print(f"OK ({len(mentioned)} brands mentioned, {tokens} tokens)")
        else:
            print("FAILED to parse JSON")
            results[model_name] = {}
    except Exception as e:
        print(f"ERROR: {e}")
        results[model_name] = {}

# ── Comparison table ────────────────────────────────────────────────────────

print()
print("=" * 70)
print("COMPARISON TABLE")
print("=" * 70)
print()

# Header
header = f"{'Brand':15s}"
for model_name in results:
    short = model_name.split("(")[0].strip()
    header += f" | {short:14s}"
print(header)
print("-" * len(header))

# Each brand
for brand in BRANDS:
    row = f"{brand:15s}"
    for model_name, mentioned in results.items():
        if brand in mentioned:
            m = mentioned[brand]
            pos = m.get("position", "?")
            sent = {"positive": "+", "neutral": "~", "negative": "-"}.get(m.get("sentiment", ""), "?")
            row += f" | #{pos} [{sent}]       "
        else:
            row += f" |  ---           "
    print(row)

# ── Agreement analysis ──────────────────────────────────────────────────────

print()
print("=" * 70)
print("AGREEMENT ANALYSIS")
print("=" * 70)
print()

model_names = list(results.keys())
for brand in BRANDS:
    mentioned_by = [m for m in model_names if brand in results[m]]
    pct = len(mentioned_by) / len(model_names) * 100
    if len(mentioned_by) == len(model_names):
        status = "ALL AGREE (mentioned)"
    elif len(mentioned_by) == 0:
        status = "ALL AGREE (absent)"
    else:
        status = f"DISAGREE — only in: {', '.join(m.split('(')[0].strip() for m in mentioned_by)}"
    print(f"  {brand:15s}  {pct:5.0f}%  {status}")

# Overall
all_brand_sets = [set(results[m].keys()) for m in model_names]
if len(all_brand_sets) >= 2:
    union = set.union(*all_brand_sets)
    intersection = set.intersection(*all_brand_sets)
    jaccard = len(intersection) / len(union) * 100 if union else 0
    print(f"\n  Overlap (Jaccard): {jaccard:.0f}%  — {len(intersection)} brands in ALL models, {len(union)} total unique")
