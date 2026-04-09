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

def _make_prompt(query: str, brands: list[str]) -> str:
    return f"""Answer this question: "{query}"

Return a JSON block:

```json
{{
  "brands_mentioned": [
    {{"brand": "Name", "position": 1, "sentiment": "positive|neutral|negative"}}
  ]
}}
```

Check each: {', '.join(brands)}"""


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


# ═══════════════════════════════════════════════════════════════════════════
# collect() — call LLM APIs, return raw observations
# ═══════════════════════════════════════════════════════════════════════════

def collect(
    target: str,
    competitors: list[str],
    queries: list[str],
    models: list[str] = ["chatgpt", "claude", "gemini"],
    samples_per_query: int = 2,
    on_progress=None,
) -> list[dict]:
    """
    Run real API calls and return observations.

    Each observation: {query, model, sample, brand, mentioned, position, sentiment}
    """
    brands = [target] + competitors
    observations = []
    total = len(queries) * len(models) * samples_per_query
    done = 0

    for query in queries:
        prompt = _make_prompt(query, brands)
        for model_name in models:
            caller = CALLERS.get(model_name)
            if not caller:
                continue
            for sample_idx in range(samples_per_query):
                done += 1
                if on_progress:
                    on_progress(done, total, model_name, query)

                try:
                    raw = caller(prompt)
                    data = _parse_json(raw)
                    if data:
                        mentioned_map = {
                            m["brand"]: m
                            for m in data.get("brands_mentioned", [])
                        }
                        for brand in brands:
                            if brand in mentioned_map:
                                m = mentioned_map[brand]
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
                except Exception as e:
                    print(f"  ERROR [{model_name}]: {e}")

    return observations


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


# ═══════════════════════════════════════════════════════════════════════════
# train() — fit XGBoost on feature rows
# ═══════════════════════════════════════════════════════════════════════════

class SurrogateModel:
    """Trained XGBoost surrogate with prediction + explanation."""

    def __init__(self):
        self.model: xgb.XGBRegressor | None = None
        self.feature_cols = FEATURE_NAMES
        self.importance: dict[str, float] = {}
        self.rmse: float = 0
        self.r2: float = 0

    def train(self, rows: list[dict]) -> dict:
        """Train on feature rows (list of dicts with mention_rate + features)."""
        df = pd.DataFrame(rows)
        X = df[self.feature_cols]
        y = df["mention_rate"]

        self.model = xgb.XGBRegressor(
            n_estimators=100, max_depth=4, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, objective="reg:squarederror", verbosity=0,
        )
        self.model.fit(X, y)

        y_pred = self.model.predict(X)
        self.rmse = float(np.sqrt(mean_squared_error(y, y_pred)))
        self.r2 = float(r2_score(y, y_pred)) if len(y) > 1 else 0

        imp = self.model.feature_importances_
        self.importance = dict(sorted(
            zip(self.feature_cols, [float(x) for x in imp]),
            key=lambda x: x[1], reverse=True,
        ))

        return {"rmse": self.rmse, "r2": self.r2, "importance": self.importance}

    def predict(self, features: dict) -> float:
        """Predict mention rate for a feature dict."""
        X = pd.DataFrame([{k: features.get(k, 0) for k in self.feature_cols}])
        pred = float(self.model.predict(X)[0])
        return max(0, min(100, pred))

    def whatif(self, base_features: dict, changes: dict) -> dict:
        """Run what-if: predict base, predict scenario, compute lift + contributions."""
        base_pred = self.predict(base_features)

        scenario = {**base_features, **changes}
        scenario_pred = self.predict(scenario)

        lift = scenario_pred - base_pred
        lift_pct = (lift / base_pred * 100) if base_pred > 0 else 0

        uncertainty = 1.96 * max(self.rmse, 2.0)
        ci_lower = max(0, scenario_pred - uncertainty)
        ci_upper = min(100, scenario_pred + uncertainty)

        # Approximate per-feature contributions using importance weights
        contributions = []
        total_weighted = 0
        for feat, change_val in changes.items():
            if feat in base_features and feat in self.importance:
                delta = change_val - base_features.get(feat, 0)
                weight = self.importance.get(feat, 0)
                score = abs(delta) * weight
                total_weighted += score
                contributions.append({
                    "feature": feat,
                    "delta": delta,
                    "weight": weight,
                    "score": score,
                })

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
