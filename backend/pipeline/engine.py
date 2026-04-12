"""
Pipeline engine — the step scripts as importable functions.

Each function matches one step:
  collect()       -> raw observations     (steps 1-5)
  extract()       -> feature vectors      (step 6)
  train()         -> fitted XGBoost model (step 7)
  predict()       -> what-if prediction   (step 8)
"""

import os
import json
import math
import random
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_squared_error, r2_score

# ── LLM callers ─────────────────────────────────────────────────────────────

def _call_openai(prompt: str) -> str:
    from openai import OpenAI
    c = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    r = c.chat.completions.create(
        model="gpt-4o-mini", temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    return r.choices[0].message.content


def _call_anthropic(prompt: str) -> str:
    from anthropic import Anthropic
    c = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    r = c.messages.create(
        model="claude-sonnet-4-20250514", max_tokens=1024, temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    return r.content[0].text


def _call_google(prompt: str) -> str:
    from google import genai
    c = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    r = c.models.generate_content(
        model="gemini-2.5-flash", contents=prompt,
        config={"temperature": 0},
    )
    return r.text


CALLERS = {
    "chatgpt": _call_openai,
    "claude": _call_anthropic,
    "gemini": _call_google,
}


def _parse_json(text: str) -> dict | None:
    start = text.find("```json")
    if start != -1:
        end = text.find("```", start + 7)
        return json.loads(text[start + 7:end].strip())
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        return json.loads(text[start:end])
    return None


# ── Dedup helper ─────────────────────────────────────────────────────────────

def _dedup_queries(queries: list[str], threshold: float = 0.85) -> list[str]:
    """Remove near-duplicate queries using SequenceMatcher similarity."""
    from difflib import SequenceMatcher
    accepted = []
    for q in queries:
        q = q.strip()
        if not q:
            continue
        is_dup = False
        for existing in accepted:
            ratio = SequenceMatcher(None, q.lower(), existing.lower()).ratio()
            if ratio > threshold:
                is_dup = True
                break
        if not is_dup:
            accepted.append(q)
    return accepted


# ── Improvement 1: Multi-Generator Paraphrases ──────────────────────────────

PARAPHRASE_PROMPT = """Generate 2 paraphrased versions of each question below.
Return ONLY a JSON array of strings, no explanation.

Questions:
{questions}

Return format:
```json
["paraphrase 1", "paraphrase 2", ...]
```"""


def fan_out_queries(
    base_queries: list[str],
    model_caller=None,
    multi_generator: bool = False,
    callers: dict | None = None,
) -> list[str]:
    """
    Generate paraphrased query variations for broader coverage.

    multi_generator=False: use a single model (old behavior)
    multi_generator=True:  use ALL models, pool results, dedupe
    """
    if callers is None:
        callers = CALLERS

    all_queries = list(base_queries)
    prompt = PARAPHRASE_PROMPT.format(questions=json.dumps(base_queries))

    if multi_generator:
        # Use every available model, pool results
        for name, caller in callers.items():
            try:
                raw = caller(prompt)
                data = _parse_json(raw)
                if data and isinstance(data, list):
                    for q in data:
                        if isinstance(q, str) and q.strip():
                            all_queries.append(q.strip())
            except Exception:
                pass
    else:
        # Single model (default: chatgpt)
        caller = model_caller or callers.get("chatgpt")
        if not caller:
            return base_queries
        try:
            raw = caller(prompt)
            data = _parse_json(raw)
            if data and isinstance(data, list):
                for q in data:
                    if isinstance(q, str) and q.strip():
                        all_queries.append(q.strip())
        except Exception:
            pass

    return _dedup_queries(all_queries)


# ── Improvement 2: Intent Fan-Out ───────────────────────────────────────────

INTENT_PROMPT = """Given this buyer question, generate diverse intent variations.
Each variation should test a DIFFERENT buying intent, not just synonym swaps.

Base question: "{query}"

Generate one query for EACH intent type:
1. Comparison: "alternatives to [known brand]" or "[brand] vs [brand]"
2. Use-case: narrow to a specific industry, team size, or workflow
3. Objection: address a concern (price, compliance, security, integrations)
4. Persona: reframe for a specific buyer role (CTO, researcher, procurement)
5. Budget: focus on cost/value dimension

Return ONLY a JSON array of 5 strings:
```json
["comparison query", "use-case query", "objection query", "persona query", "budget query"]
```"""


def intent_fan_out(
    base_queries: list[str],
    model_caller=None,
) -> list[str]:
    """
    Expand queries by intent type, not just paraphrase.
    Each base query generates 5 intent-diverse variants.
    """
    caller = model_caller or CALLERS.get("chatgpt")
    if not caller:
        return []

    intent_queries = []

    for query in base_queries:
        try:
            raw = caller(INTENT_PROMPT.format(query=query))
            data = _parse_json(raw)
            if data and isinstance(data, list):
                for q in data:
                    if isinstance(q, str) and q.strip():
                        intent_queries.append(q.strip())
        except Exception:
            pass

    return intent_queries


# ── Improvement 3: Independent Extraction ───────────────────────────────────

INDEPENDENT_EXTRACT_PROMPT = """Read this AI response and list every company, brand, or product that is explicitly recommended or discussed.
Do NOT add brands that aren't actually there. Only extract what's genuinely mentioned.

Response to analyze:
---
{response_text}
---

Return a JSON block:
```json
{{
  "brands_found": [
    {{"brand": "ExactName", "position": 1, "sentiment": "positive|neutral|negative"}}
  ]
}}
```

Position 1 = first/most prominent. Include ALL brands mentioned."""

# Rotation: use a different model to verify extraction
_VERIFIER_ROTATION = {
    "chatgpt": "claude",
    "claude": "gemini",
    "gemini": "chatgpt",
}


def independent_extract(
    response_text: str,
    primary_model: str,
) -> tuple[dict | None, str]:
    """
    Send response to a DIFFERENT model for independent brand extraction.
    Returns (parsed_data, verifier_model_name).
    """
    verifier_name = _VERIFIER_ROTATION.get(primary_model, "claude")
    verifier = CALLERS.get(verifier_name)
    if not verifier:
        return None, verifier_name

    try:
        prompt = INDEPENDENT_EXTRACT_PROMPT.format(
            response_text=response_text[:3000]
        )
        raw = verifier(prompt)
        data = _parse_json(raw)
        return data, verifier_name
    except Exception:
        return None, verifier_name


def _compare_extractions(
    primary_brands: dict[str, dict],
    independent_brands: dict[str, dict],
    tracked_brands: list[str],
) -> tuple[set[str], set[str], bool]:
    """
    Compare primary vs independent extraction for tracked brands.
    Returns (agreed_brands, disagreed_brands, has_disagreement).
    """
    agreed = set()
    disagreed = set()

    for brand in tracked_brands:
        bl = brand.lower()
        in_primary = bl in primary_brands
        in_independent = bl in independent_brands

        if in_primary and in_independent:
            agreed.add(brand)
        elif in_primary or in_independent:
            disagreed.add(brand)
        # both absent = agreement (not mentioned)

    return agreed, disagreed, len(disagreed) > 0


# ── Two-pass organic collection ─────────────────────────────────────────────
#
# Pass 1 (ORGANIC): Ask the buyer question naturally. No brand names.
# Pass 2 (EXTRACT): Check for tracked brands in the response.
# Pass 3 (VERIFY):  Optionally cross-validate with a different model.
# ═══════════════════════════════════════════════════════════════════════════

ORGANIC_PROMPT = """Answer this question as a knowledgeable advisor. Recommend specific products, companies, or brands by name. Be concrete — don't say "there are many options", actually name them.

Question: {query}

After your answer, return a JSON block listing every company/brand/product you mentioned:

```json
{{
  "brands_mentioned": [
    {{"brand": "ExactName", "position": 1, "sentiment": "positive|neutral|negative"}}
  ]
}}
```

Position 1 = first mentioned/most recommended. Include ALL brands you named."""


def collect(
    target: str,
    competitors: list[str],
    queries: list[str],
    models: list[str] = ["chatgpt", "claude", "gemini"],
    samples_per_query: int = 2,
    fan_out: bool = True,
    on_progress=None,
    # Improvement toggles
    multi_generator_fanout: bool = False,
    intent_fanout: bool = False,
    cross_validate_extraction: bool = False,
    cross_validate_rate: float = 0.5,
) -> tuple[list[dict], list[dict]]:
    """
    Organic collection with optional improvements:

    - multi_generator_fanout: use all 3 models for paraphrases (not just ChatGPT)
    - intent_fanout: generate intent-diverse queries (comparison, use-case, budget, etc.)
    - cross_validate_extraction: verify brand extraction with a second model

    Returns (observations, api_logs).
    """
    brands = [target] + competitors

    # Build query set
    all_queries = list(queries)

    # Intent fan-out (on base queries only, before paraphrasing)
    if intent_fanout:
        intent_qs = intent_fan_out(queries)
        all_queries = _dedup_queries(all_queries + intent_qs)
        if on_progress:
            on_progress(0, 0, "system", f"Intent fan-out: {len(queries)} → {len(all_queries)} queries")

    # Paraphrase fan-out
    if fan_out and len(all_queries) < 15:
        all_queries = fan_out_queries(
            all_queries,
            multi_generator=multi_generator_fanout,
        )
        if on_progress:
            on_progress(0, 0, "system", f"Paraphrase fan-out: → {len(all_queries)} total queries")

    observations = []
    api_logs = []
    total = len(all_queries) * len(models) * samples_per_query
    done = 0

    for query in all_queries:
        # ORGANIC prompt — no brand names
        prompt = ORGANIC_PROMPT.format(query=query)

        for model_name in models:
            caller = CALLERS.get(model_name)
            if not caller:
                continue

            for sample_idx in range(samples_per_query):
                done += 1
                if on_progress:
                    on_progress(done, total, model_name, query)

                log_entry = {
                    "query": query,
                    "model": model_name,
                    "sample": sample_idx,
                    "prompt_sent": prompt,
                    "raw_response": None,
                    "parsed": None,
                    "status": "pending",
                    "error": None,
                }

                try:
                    raw = caller(prompt)
                    log_entry["raw_response"] = raw
                    data = _parse_json(raw)
                    log_entry["parsed"] = data
                    log_entry["status"] = "success" if data else "parse_error"

                    # --- Pass 2: check for tracked brands ---
                    # First check the structured JSON output
                    mentioned_in_json = {}
                    if data and "brands_mentioned" in data:
                        for m in data["brands_mentioned"]:
                            name = m.get("brand", "")
                            mentioned_in_json[name.lower()] = m

                    # Then also do case-insensitive string matching on raw text
                    raw_lower = (raw or "").lower()

                    # --- Pass 3 (optional): cross-validate with a different model ---
                    independent_brands = {}
                    did_cross_validate = False
                    has_disagreement = False

                    if cross_validate_extraction and raw:
                        # Verify at the configured rate (e.g., 50% of calls)
                        import hashlib
                        call_hash = int(hashlib.md5(f"{query}{model_name}{sample_idx}".encode()).hexdigest()[:8], 16)
                        should_verify = (call_hash % 100) < (cross_validate_rate * 100)

                        if should_verify:
                            ind_data, verifier = independent_extract(raw, model_name)
                            did_cross_validate = True
                            log_entry["verifier_model"] = verifier

                            if ind_data and "brands_found" in ind_data:
                                for m in ind_data["brands_found"]:
                                    name = m.get("brand", "")
                                    independent_brands[name.lower()] = m

                    # --- Build observations for tracked brands ---
                    for brand in brands:
                        brand_lower = brand.lower()

                        found_in_json = brand_lower in mentioned_in_json
                        found_in_text = brand_lower in raw_lower

                        # If cross-validated, only count as mentioned if BOTH agree
                        if did_cross_validate:
                            found_in_independent = brand_lower in independent_brands
                            if found_in_json and not found_in_independent:
                                has_disagreement = True
                                # Primary says yes, verifier says no → don't count (conservative)
                                found_in_json = False
                            elif not found_in_json and found_in_independent:
                                has_disagreement = True
                                # Primary missed it, verifier found it → count it
                                found_in_json = True
                                mentioned_in_json[brand_lower] = independent_brands[brand_lower]

                        if found_in_json:
                            m = mentioned_in_json[brand_lower]
                            observations.append({
                                "query": query,
                                "model": model_name,
                                "sample": sample_idx,
                                "brand": brand,
                                "mentioned": True,
                                "organic": True,
                                "position": m.get("position"),
                                "sentiment": m.get("sentiment", "neutral"),
                                "cross_validated": did_cross_validate,
                                "extraction_disagreement": has_disagreement,
                            })
                        elif found_in_text:
                            pos = raw_lower.index(brand_lower)
                            total_len = len(raw_lower) or 1
                            estimated_position = max(1, round((pos / total_len) * 10))
                            observations.append({
                                "query": query,
                                "model": model_name,
                                "sample": sample_idx,
                                "brand": brand,
                                "mentioned": True,
                                "organic": True,
                                "position": estimated_position,
                                "sentiment": "neutral",
                                "cross_validated": did_cross_validate,
                                "extraction_disagreement": has_disagreement,
                            })
                        else:
                            observations.append({
                                "query": query,
                                "model": model_name,
                                "sample": sample_idx,
                                "brand": brand,
                                "mentioned": False,
                                "organic": True,
                                "position": None,
                                "sentiment": None,
                                "cross_validated": did_cross_validate,
                                "extraction_disagreement": has_disagreement,
                            })

                    if has_disagreement:
                        log_entry["status"] = "extraction_conflict"

                except Exception as e:
                    log_entry["status"] = "error"
                    log_entry["error"] = str(e)
                    print(f"  ERROR [{model_name}]: {e}")

                api_logs.append(log_entry)

    return observations, api_logs


# ═══════════════════════════════════════════════════════════════════════════
# extract() — compute features for one brand from observations
# ═══════════════════════════════════════════════════════════════════════════

FEATURE_NAMES = [
    "avg_position", "top1_rate", "top3_rate", "position_std",
    "positive_rate", "negative_rate", "net_sentiment",
    "competitor_avg_rate", "vs_best_competitor", "brands_ahead",
    "share_of_mentions", "model_agreement", "model_spread",
    "query_coverage",
]


def extract(
    brand: str,
    observations: list[dict],
    all_brands: list[str],
    models: list[str],
    queries: list[str],
) -> dict:
    """Compute feature vector for one brand. Returns dict with mention_rate + features."""
    brand_obs = [o for o in observations if o["brand"] == brand]
    others = [b for b in all_brands if b != brand]

    total = len(brand_obs)
    mentioned = [o for o in brand_obs if o["mentioned"]]
    rate = len(mentioned) / total if total > 0 else 0

    positions = [o["position"] for o in mentioned if o["position"] is not None]
    avg_pos = sum(positions) / len(positions) if positions else 10
    top1 = sum(1 for p in positions if p == 1) / len(positions) if positions else 0
    top3 = sum(1 for p in positions if p <= 3) / len(positions) if positions else 0
    pos_std = (sum((p - avg_pos) ** 2 for p in positions) / len(positions)) ** 0.5 if len(positions) >= 2 else 0

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
    for model in models:
        m_obs = [o for o in brand_obs if o["model"] == model]
        m_ment = sum(1 for o in m_obs if o["mentioned"])
        model_rates.append(m_ment / len(m_obs) if m_obs else 0)
    model_min = min(model_rates) if model_rates else 0
    model_max = max(model_rates) if model_rates else 0

    total_ment = sum(1 for o in observations if o["mentioned"])
    share = len(mentioned) / total_ment if total_ment > 0 else 0

    q_coverage = 0
    for q in queries:
        q_obs = [o for o in brand_obs if o["query"] == q]
        if any(o["mentioned"] for o in q_obs):
            q_coverage += 1
    q_coverage = q_coverage / len(queries) if queries else 0

    return {
        "mention_rate": round(rate * 100, 2),
        "avg_position": round(avg_pos, 2),
        "top1_rate": round(top1 * 100, 2),
        "top3_rate": round(top3 * 100, 2),
        "position_std": round(pos_std, 3),
        "positive_rate": round(pos_rate * 100, 2),
        "negative_rate": round(neg_rate * 100, 2),
        "net_sentiment": round(net_sent * 100, 2),
        "competitor_avg_rate": round(comp_avg * 100, 2),
        "vs_best_competitor": round(rate / best_comp, 3) if best_comp > 0 else 1.0,
        "brands_ahead": sum(1 for r in comp_rates if r > rate),
        "share_of_mentions": round(share * 100, 2),
        "model_agreement": round((model_min / model_max * 100) if model_max > 0 else 0, 2),
        "model_spread": round((model_max - model_min) * 100, 2),
        "query_coverage": round(q_coverage * 100, 2),
    }


def extract_all(
    observations: list[dict],
    all_brands: list[str],
    models: list[str],
    queries: list[str],
) -> list[dict]:
    """Extract features for every brand. Returns list of dicts with 'brand' key."""
    rows = []
    for brand in all_brands:
        feats = extract(brand, observations, all_brands, models, queries)
        feats["brand"] = brand
        rows.append(feats)
    return rows


# ── Per-model feature extraction ────────────────────────────────────────────

def extract_per_model(
    brand: str,
    model_name: str,
    observations: list[dict],
    all_brands: list[str],
    queries: list[str],
) -> dict:
    """Extract features for ONE brand on ONE model."""
    model_obs = [o for o in observations if o["model"] == model_name]
    brand_obs = [o for o in model_obs if o["brand"] == brand]
    others = [b for b in all_brands if b != brand]

    total = len(brand_obs)
    mentioned = [o for o in brand_obs if o["mentioned"]]
    rate = len(mentioned) / total if total > 0 else 0

    positions = [o["position"] for o in mentioned if o["position"] is not None]
    avg_pos = sum(positions) / len(positions) if positions else 10
    top1 = sum(1 for p in positions if p == 1) / len(positions) if positions else 0
    top3 = sum(1 for p in positions if p <= 3) / len(positions) if positions else 0
    pos_std = (sum((p - avg_pos) ** 2 for p in positions) / len(positions)) ** 0.5 if len(positions) >= 2 else 0

    sents = [o["sentiment"] for o in mentioned if o["sentiment"]]
    n_sent = len(sents)
    pos_rate = sents.count("positive") / n_sent if n_sent > 0 else 0.5
    neg_rate = sents.count("negative") / n_sent if n_sent > 0 else 0
    net_sent = (sents.count("positive") - sents.count("negative")) / n_sent if n_sent > 0 else 0

    comp_rates = []
    for other in others:
        o_obs = [o for o in model_obs if o["brand"] == other]
        o_ment = sum(1 for o in o_obs if o["mentioned"])
        comp_rates.append(o_ment / len(o_obs) if o_obs else 0)
    comp_avg = sum(comp_rates) / len(comp_rates) if comp_rates else 0
    best_comp = max(comp_rates) if comp_rates else 0

    total_ment = sum(1 for o in model_obs if o["mentioned"])
    share = len(mentioned) / total_ment if total_ment > 0 else 0

    q_coverage = 0
    for q in queries:
        q_obs = [o for o in brand_obs if o["query"] == q]
        if any(o["mentioned"] for o in q_obs):
            q_coverage += 1
    q_coverage = q_coverage / len(queries) if queries else 0

    return {
        "mention_rate": round(rate * 100, 2),
        "model": model_name,
        "avg_position": round(avg_pos, 2),
        "top1_rate": round(top1 * 100, 2),
        "top3_rate": round(top3 * 100, 2),
        "position_std": round(pos_std, 3),
        "positive_rate": round(pos_rate * 100, 2),
        "negative_rate": round(neg_rate * 100, 2),
        "net_sentiment": round(net_sent * 100, 2),
        "competitor_avg_rate": round(comp_avg * 100, 2),
        "vs_best_competitor": round(rate / best_comp, 3) if best_comp > 0 else 1.0,
        "brands_ahead": sum(1 for r in comp_rates if r > rate),
        "share_of_mentions": round(share * 100, 2),
        "model_agreement": 100.0,  # single model = always agrees with itself
        "model_spread": 0.0,
        "query_coverage": round(q_coverage * 100, 2),
    }


def extract_all_per_model(
    observations: list[dict],
    all_brands: list[str],
    models: list[str],
    queries: list[str],
) -> dict[str, list[dict]]:
    """Extract per-model features. Returns {model_name: [brand_rows]}."""
    result = {}
    for model_name in models:
        rows = []
        for brand in all_brands:
            feats = extract_per_model(brand, model_name, observations, all_brands, queries)
            feats["brand"] = brand
            rows.append(feats)
        result[model_name] = rows
    return result


# ── Content feature names (from content_analyzer, NOT from LLM polling) ────

CONTENT_FEATURE_NAMES = [
    "statistics_density",
    "quotation_count",
    "citation_count",
    "content_length",
    "readability_grade",
    "freshness_days",
    "heading_count",
]


def merge_content_features(rows: list[dict], content_analysis: dict | None) -> list[dict]:
    """Merge content analysis features into training rows."""
    if not content_analysis:
        # Fill with defaults so model can still train
        for row in rows:
            for feat in CONTENT_FEATURE_NAMES:
                row.setdefault(feat, 0)
        return rows

    for row in rows:
        row["statistics_density"] = content_analysis.get("statistics_density", 0)
        row["quotation_count"] = content_analysis.get("quotation_count", 0)
        row["citation_count"] = content_analysis.get("citation_count", 0)
        row["content_length"] = content_analysis.get("content_length", 0)
        row["readability_grade"] = content_analysis.get("readability_grade", 0)
        row["freshness_days"] = content_analysis.get("freshness_days", 0) or 0
        row["heading_count"] = (
            content_analysis.get("h1_count", 0)
            + content_analysis.get("h2_count", 0)
            + content_analysis.get("h3_count", 0)
        )

    return rows


# ═══════════════════════════════════════════════════════════════════════════
# Surrogate model — supports aggregate + per-model training
# ═══════════════════════════════════════════════════════════════════════════

class SurrogateModel:
    """XGBoost surrogate with aggregate + per-model prediction."""

    def __init__(self, use_content_features: bool = False):
        self.model: xgb.XGBRegressor | None = None
        self.per_model_models: dict[str, xgb.XGBRegressor] = {}
        self.use_content_features = use_content_features
        self.feature_cols = FEATURE_NAMES + (CONTENT_FEATURE_NAMES if use_content_features else [])
        self.importance: dict[str, float] = {}
        self.per_model_importance: dict[str, dict[str, float]] = {}
        self.rmse: float = 0
        self.r2: float = 0

    def _fit_one(self, X: pd.DataFrame, y: pd.Series) -> xgb.XGBRegressor:
        model = xgb.XGBRegressor(
            n_estimators=100, max_depth=4, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, objective="reg:squarederror", verbosity=0,
        )
        model.fit(X, y)
        return model

    def train(self, rows: list[dict]) -> dict:
        """Train aggregate model on feature rows."""
        df = pd.DataFrame(rows)

        # Only use feature columns that exist in the data
        available = [c for c in self.feature_cols if c in df.columns]
        self.feature_cols = available

        X = df[available]
        y = df["mention_rate"]

        self.model = self._fit_one(X, y)

        y_pred = self.model.predict(X)
        self.rmse = float(np.sqrt(mean_squared_error(y, y_pred)))
        self.r2 = float(r2_score(y, y_pred)) if len(y) > 1 else 0

        imp = self.model.feature_importances_
        self.importance = dict(sorted(
            zip(available, [float(x) for x in imp]),
            key=lambda x: x[1], reverse=True,
        ))

        return {"rmse": self.rmse, "r2": self.r2, "importance": self.importance}

    def train_per_model(self, per_model_rows: dict[str, list[dict]]) -> dict[str, dict]:
        """Train separate surrogates for each LLM model."""
        results = {}
        for model_name, rows in per_model_rows.items():
            if len(rows) < 2:
                continue
            df = pd.DataFrame(rows)
            available = [c for c in self.feature_cols if c in df.columns]
            X = df[available]
            y = df["mention_rate"]

            fitted = self._fit_one(X, y)
            self.per_model_models[model_name] = fitted

            y_pred = fitted.predict(X)
            rmse = float(np.sqrt(mean_squared_error(y, y_pred)))
            r2 = float(r2_score(y, y_pred)) if len(y) > 1 else 0

            imp = fitted.feature_importances_
            self.per_model_importance[model_name] = dict(sorted(
                zip(available, [float(x) for x in imp]),
                key=lambda x: x[1], reverse=True,
            ))

            results[model_name] = {"rmse": rmse, "r2": r2, "importance": self.per_model_importance[model_name]}

        return results

    def predict(self, features: dict, model_name: str | None = None) -> float:
        """Predict mention rate. If model_name given, use per-model surrogate."""
        m = self.per_model_models.get(model_name) if model_name else self.model
        if m is None:
            m = self.model
        if m is None:
            return 0

        X = pd.DataFrame([{k: features.get(k, 0) for k in self.feature_cols}])
        pred = float(m.predict(X)[0])
        return max(0, min(100, pred))

    def whatif(self, base_features: dict, changes: dict, model_name: str | None = None) -> dict:
        """Run what-if prediction. Optionally for a specific LLM model."""
        base_pred = self.predict(base_features, model_name)

        scenario = {**base_features, **changes}
        scenario_pred = self.predict(scenario, model_name)

        lift = scenario_pred - base_pred
        lift_pct = (lift / base_pred * 100) if base_pred > 0 else 0

        uncertainty = 1.96 * max(self.rmse, 2.0)
        ci_lower = max(0, scenario_pred - uncertainty)
        ci_upper = min(100, scenario_pred + uncertainty)

        # Use model-specific importance if available
        importance = self.per_model_importance.get(model_name, self.importance) if model_name else self.importance

        contributions = []
        total_weighted = 0
        for feat, change_val in changes.items():
            if feat in importance:
                delta = change_val - base_features.get(feat, 0)
                weight = importance.get(feat, 0)
                score = abs(delta) * weight
                total_weighted += score
                contributions.append({"feature": feat, "delta": delta, "weight": weight, "score": score})

        for c in contributions:
            c["contribution"] = lift * (c["score"] / total_weighted) if total_weighted > 0 else 0
            c["pct"] = abs(c["contribution"]) / abs(lift) * 100 if lift != 0 else 0

        contributions.sort(key=lambda x: abs(x.get("contribution", 0)), reverse=True)

        confidence = "high" if abs(lift) > 5 else "medium" if abs(lift) > 1 else "low"

        return {
            "base_prediction": round(base_pred, 2),
            "scenario_prediction": round(scenario_pred, 2),
            "lift": round(lift, 2),
            "lift_pct": round(lift_pct, 2),
            "ci_lower": round(ci_lower, 2),
            "ci_upper": round(ci_upper, 2),
            "confidence": confidence,
            "contributions": contributions,
        }

    def whatif_all_models(self, base_features: dict, changes: dict) -> dict:
        """Run what-if for ALL models. Returns {model_name: whatif_result}."""
        results = {}
        for model_name in self.per_model_models:
            results[model_name] = self.whatif(base_features, changes, model_name)
        return results
