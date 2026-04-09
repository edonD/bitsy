"""
Step 1: Make ONE real API call and see the raw response.

This is the most basic building block.
We ask ChatGPT a buyer question and print exactly what comes back.
No parsing, no processing — just the raw truth.

Usage:
    python pipeline/step1_raw_call.py
"""

import os
import sys
from pathlib import Path

# Fix Windows console encoding
sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
from openai import OpenAI

# Load API keys from the site/.env.local file
env_path = Path(__file__).resolve().parent.parent.parent / "site" / ".env.local"
load_dotenv(env_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── The inputs ──────────────────────────────────────────────────────────────

QUERY = "What is the best online fashion store in Europe?"
BRANDS_WE_TRACK = ["Zalando", "ASOS", "H&M", "About You", "Shein", "Zara"]

# ── Make the call ───────────────────────────────────────────────────────────

print("=" * 60)
print("STEP 1: Raw API call")
print("=" * 60)
print(f"\nModel:  gpt-4o-mini")
print(f"Query:  {QUERY}")
print(f"Temp:   0 (most deterministic)")
print()

response = client.chat.completions.create(
    model="gpt-4o-mini",
    temperature=0,
    messages=[
        {"role": "user", "content": QUERY},
    ],
)

raw_text = response.choices[0].message.content

print("─" * 60)
print("RAW RESPONSE:")
print("─" * 60)
print(raw_text)
print()

# ── Simple check: which tracked brands appear? ─────────────────────────────

print("─" * 60)
print("BRAND DETECTION (simple string match):")
print("─" * 60)
text_lower = raw_text.lower()
for brand in BRANDS_WE_TRACK:
    found = brand.lower() in text_lower
    marker = "✓ MENTIONED" if found else "✗ not found"
    print(f"  {brand:15s}  {marker}")

print()
print("─" * 60)
print("API USAGE:")
print("─" * 60)
print(f"  Input tokens:   {response.usage.prompt_tokens}")
print(f"  Output tokens:  {response.usage.completion_tokens}")
print(f"  Total tokens:   {response.usage.total_tokens}")

cost_input = response.usage.prompt_tokens * 0.15 / 1_000_000
cost_output = response.usage.completion_tokens * 0.60 / 1_000_000
print(f"  Estimated cost: ${cost_input + cost_output:.6f}")
