"""
Collect mention data from LLM API calls
"""

import asyncio
import json
from datetime import datetime
from typing import List, Dict
import httpx
from sqlalchemy.orm import Session
from core.database import MentionRecord

# LLM configurations
MODELS = [
    {
        "name": "claude-3.5-sonnet",
        "api": "https://api.anthropic.com/v1/messages",
        "key_env": "ANTHROPIC_API_KEY",
    },
    {
        "name": "gpt-4",
        "api": "https://api.openai.com/v1/chat/completions",
        "key_env": "OPENAI_API_KEY",
    },
    {
        "name": "gemini-2.0",
        "api": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "key_env": "GOOGLE_API_KEY",
    },
    {
        "name": "llama-3.1",
        "api": "https://api.groq.com/openai/v1/chat/completions",
        "key_env": "GROQ_API_KEY",
    },
]

# Sample queries to ask LLMs
QUERIES = [
    "What are the best automation tools for workflows?",
    "Which tools integrate well with Zapier?",
    "Top workflow automation software in 2025",
    "Best alternatives to Make and Zapier",
    "Most popular no-code automation platforms",
    "AI-powered workflow automation tools",
    "Best tools for integrating multiple apps",
    "Workflow automation for small businesses",
    "Enterprise workflow automation solutions",
    "API integration and automation tools",
    # Add more queries...
]

# Brands to track
BRANDS_TO_TRACK = [
    "Zapier",
    "Airtable",
    "Notion",
    "Make",
    "n8n",
    "Integromat",
    "Automation Anywhere",
    "UiPath",
    "Power Automate",
    # Add more...
]


async def call_llm(model: Dict, query: str, api_key: str) -> str:
    """
    Call an LLM and get response
    """
    try:
        async with httpx.AsyncClient() as client:
            if model["name"] == "claude-3.5-sonnet":
                response = await client.post(
                    model["api"],
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-3-5-sonnet-20241022",
                        "max_tokens": 1024,
                        "temperature": 0,  # Deterministic
                        "messages": [
                            {
                                "role": "user",
                                "content": query,
                            }
                        ],
                    },
                    timeout=30,
                )
                data = response.json()
                return data["content"][0]["text"]

            elif model["name"] == "gpt-4":
                response = await client.post(
                    model["api"],
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4",
                        "messages": [{"role": "user", "content": query}],
                        "temperature": 0,
                        "max_tokens": 1024,
                    },
                    timeout=30,
                )
                data = response.json()
                return data["choices"][0]["message"]["content"]

            elif model["name"] == "gemini-2.0":
                response = await client.post(
                    f"{model['api']}?key={api_key}",
                    json={
                        "contents": [
                            {
                                "parts": [
                                    {"text": query}
                                ]
                            }
                        ],
                        "generationConfig": {
                            "temperature": 0,
                            "maxOutputTokens": 1024,
                        }
                    },
                    timeout=30,
                )
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]

            elif model["name"] == "llama-3.1":
                response = await client.post(
                    model["api"],
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "llama-3.1-70b-versatile",
                        "messages": [{"role": "user", "content": query}],
                        "temperature": 0,
                        "max_tokens": 1024,
                    },
                    timeout=30,
                )
                data = response.json()
                return data["choices"][0]["message"]["content"]

    except Exception as e:
        print(f"Error calling {model['name']}: {e}")
        return ""


def extract_mentions(response: str, brands: List[str]) -> List[str]:
    """
    Extract brand mentions from LLM response
    """
    mentions = []
    response_lower = response.lower()
    for brand in brands:
        if brand.lower() in response_lower:
            mentions.append(brand)
    return mentions


async def collect_mentions_daily(db: Session, api_keys: Dict[str, str]):
    """
    Run daily mention collection
    """
    today = datetime.now().strftime("%Y-%m-%d")
    print(f"Starting mention collection for {today}")

    total_calls = 0
    mention_counts = {brand: 0 for brand in BRANDS_TO_TRACK}

    # For each query
    for query_idx, query in enumerate(QUERIES):
        query_id = f"query_{query_idx:03d}"

        # For each model
        for model in MODELS:
            api_key = api_keys.get(model["key_env"])
            if not api_key:
                print(f"Skipping {model['name']}: no API key")
                continue

            # Call LLM
            response = await call_llm(model, query, api_key)
            total_calls += 1

            # Extract mentions
            mentions = extract_mentions(response, BRANDS_TO_TRACK)

            # Store each mention
            for brand in BRANDS_TO_TRACK:
                mentioned = brand in mentions
                mention_counts[brand] += 1 if mentioned else 0

                record = MentionRecord(
                    date=today,
                    brand=brand,
                    model=model["name"],
                    query_id=query_id,
                    mentioned=mentioned,
                    mention_rate=0.0,  # Will be computed later
                )
                db.add(record)

        print(f"  Processed query {query_idx + 1}/{len(QUERIES)}")

    # Compute daily mention rates
    for brand in BRANDS_TO_TRACK:
        total_mentions = mention_counts[brand]
        mention_rate = (total_mentions / total_calls) * 100
        print(f"  {brand}: {total_mentions}/{total_calls} mentions = {mention_rate:.1f}%")

        # Update mention_rate in all records for this brand today
        db.query(MentionRecord).filter(
            MentionRecord.date == today,
            MentionRecord.brand == brand,
        ).update({"mention_rate": mention_rate})

    db.commit()
    print(f"✓ Completed mention collection: {total_calls} API calls")


if __name__ == "__main__":
    # Test
    api_keys = {
        "ANTHROPIC_API_KEY": "your-key-here",
        "OPENAI_API_KEY": "your-key-here",
        "GOOGLE_API_KEY": "your-key-here",
        "GROQ_API_KEY": "your-key-here",
    }

    # This would be called by the scheduler
    print("This module is called by the daily pipeline scheduler")
