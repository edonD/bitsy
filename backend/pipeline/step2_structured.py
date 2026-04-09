"""
Step 2: Structured extraction — ask the LLM to return JSON.

Instead of guessing from raw text, we use OpenAI's structured output
to force the model to return exact brand mentions with position,
sentiment, and reasoning.

This is what production polling looks like.

Usage:
    python pipeline/step2_structured.py
"""

import os
import sys
import json
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
from openai import OpenAI

env_path = Path(__file__).resolve().parent.parent.parent / "site" / ".env.local"
load_dotenv(env_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Inputs ──────────────────────────────────────────────────────────────────

QUERY = "What is the best online fashion store in Europe?"
BRANDS = ["Zalando", "ASOS", "H&M", "About You", "Shein", "Zara"]

# ── The structured prompt ───────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a helpful shopping assistant. Answer the user's question naturally.

After your answer, return a JSON block with this exact format:

```json
{
  "brands_mentioned": [
    {
      "brand": "BrandName",
      "position": 1,
      "sentiment": "positive",
      "reason": "why you mentioned it"
    }
  ],
  "brands_not_mentioned": ["Brand1", "Brand2"],
  "total_brands_in_response": 5
}
```

For each brand you mention in your response:
- position: its rank in your recommendation (1 = first mentioned, 2 = second, etc.)
- sentiment: "positive", "neutral", or "negative"
- reason: one sentence explaining why you included or excluded it

You MUST check each of these brands and report whether you mentioned them: """ + ", ".join(BRANDS)

# ── Make the call ───────────────────────────────────────────────────────────

print("=" * 60)
print("STEP 2: Structured extraction")
print("=" * 60)
print(f"\nQuery:   {QUERY}")
print(f"Brands:  {', '.join(BRANDS)}")
print(f"Model:   gpt-4o-mini  |  temp=0")
print()

response = client.chat.completions.create(
    model="gpt-4o-mini",
    temperature=0,
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": QUERY},
    ],
)

raw = response.choices[0].message.content
print("--- Full response ---")
print(raw)
print()

# ── Parse the JSON block ───────────────────────────────────────────────────

# Find JSON between ```json ... ```
json_start = raw.find("```json")
json_end = raw.find("```", json_start + 7)

if json_start == -1:
    # Try finding raw JSON
    json_start = raw.find("{")
    json_end = raw.rfind("}") + 1
    json_str = raw[json_start:json_end]
else:
    json_str = raw[json_start + 7:json_end].strip()

data = json.loads(json_str)

print("=" * 60)
print("PARSED RESULTS:")
print("=" * 60)
print()
print(f"Total brands in response: {data.get('total_brands_in_response', '?')}")
print()

print("  MENTIONED:")
for m in data.get("brands_mentioned", []):
    icon = {"positive": "+", "neutral": "~", "negative": "-"}.get(m["sentiment"], "?")
    tracked = " [TRACKED]" if m["brand"] in BRANDS else ""
    print(f"    #{m['position']:2d}  [{icon}] {m['brand']}{tracked}")
    print(f"         {m['reason']}")

print()
print("  NOT MENTIONED:")
for b in data.get("brands_not_mentioned", []):
    tracked = " [TRACKED]" if b in BRANDS else ""
    print(f"    --- {b}{tracked}")

print()
print(f"Cost: ${(response.usage.prompt_tokens * 0.15 + response.usage.completion_tokens * 0.60) / 1_000_000:.6f}")
