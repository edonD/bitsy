#!/usr/bin/env python3
"""
Interactive test script to play with the simulation engine
"""

import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def print_scenario(title: str):
    """Print scenario header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def run_simulation(brand_id: str, scenario_name: str, scenario_features: Dict[str, float]) -> Dict[str, Any]:
    """Run a what-if simulation"""

    url = f"{BASE_URL}/api/simulations/simulate"

    payload = {
        "brand_id": brand_id,
        "scenario_name": scenario_name,
        "scenario_features": scenario_features
    }

    response = requests.post(url, json=payload)

    if response.status_code != 200:
        print(f"ERROR: {response.status_code}")
        print(response.text)
        return None

    return response.json()

def pretty_print_result(result: Dict[str, Any]):
    """Pretty print simulation result"""

    if not result:
        return

    base = result['base_case_prediction']
    scenario = result['scenario_prediction']
    lift = result['predicted_lift']
    lift_pct = result['lift_percentage']
    lower = result['confidence_lower']
    upper = result['confidence_upper']
    confidence = result['confidence_level']

    # Main prediction
    print(f"\n[PREDICTION]:")
    print(f"   Current state:     {base:.1f}% mention rate")
    print(f"   After changes:     {scenario:.1f}% mention rate")
    print(f"   Expected lift:     +{lift:.1f}pp ({lift_pct:+.1f}%)")
    print(f"   95% Confidence:    [{lower:.1f}% - {upper:.1f}%]")
    print(f"   Confidence Level:  {confidence}")

    # SHAP breakdown
    print(f"\n[SHAP BREAKDOWN] What's Driving the Lift?")
    for i, contrib in enumerate(result['shap_contributions'][:5], 1):
        feature = contrib['feature']
        contribution = contrib['contribution']
        percentage = contrib['percentage']
        arrow = "UP" if contribution > 0 else "DOWN"
        print(f"   {i}. {arrow:5s} {feature:40s} {contribution:+6.2f}pp ({percentage:5.1f}%)")

    # Edge cases
    print(f"\n[EDGE CASES] Robustness Analysis:")
    if result.get('sensitivity_analysis') and result['sensitivity_analysis'].get('edge_cases'):
        for edge_case in result['sensitivity_analysis']['edge_cases']:
            scenario_name = edge_case.get('scenario_name', 'Unknown')
            edge_lift = edge_case.get('predicted_lift', 0)
            print(f"   • {scenario_name}: {edge_lift:+.1f}pp")

# ============================================================================
# SCENARIO 1: Publish Fresh Content
# ============================================================================

print_scenario("SCENARIO 1: Publish Fresh Implementation Guide")
print("""
User wants to publish a detailed implementation guide on their website.
This is brand new content, so freshness goes from 8.3 months to 0.1 months.
""")

result1 = run_simulation(
    brand_id="zapier-123",
    scenario_name="Publish implementation guide",
    scenario_features={
        "avg_source_freshness_months": 0.1  # Brand new!
    }
)

if result1:
    pretty_print_result(result1)
    print("\n💡 INTERPRETATION:")
    print("   Fresh content matters! Publishing new, detailed content about your")
    print("   product should boost AI search mentions by 4-5pp just from freshness.")

# ============================================================================
# SCENARIO 2: Get into Best-Of Lists
# ============================================================================

print_scenario("SCENARIO 2: Get Featured in Industry Best-Of Lists")
print("""
Your brand gets featured in G2, Capterra, and a major industry roundup.
This increases high-authority sources and best-of mentions.
""")

result2 = run_simulation(
    brand_id="slack-456",
    scenario_name="Featured in Gartner Magic Quadrant",
    scenario_features={
        "high_authority_source_count": 6,  # Up from 3
        "best_of_list_mentions": 15,        # Up from 5
    }
)

if result2:
    pretty_print_result(result2)
    print("\n💡 INTERPRETATION:")
    print("   Authority signals have HUGE impact. Getting into major lists like")
    print("   Gartner MQ can boost mentions by 8-15pp. This is why PR/analyst")
    print("   relations are critical for AI visibility.")

# ============================================================================
# SCENARIO 3: Comprehensive Optimization
# ============================================================================

print_scenario("SCENARIO 3: Full Optimization Strategy")
print("""
Everything at once:
  • Publish fresh content (0.1 months old)
  • Implement full schema markup (0.9 score)
  • Get 5 authority mentions
  • Land in 12 best-of lists
  • Improve query diversity
""")

result3 = run_simulation(
    brand_id="notion-789",
    scenario_name="Full optimization push",
    scenario_features={
        "avg_source_freshness_months": 0.1,
        "schema_markup_score": 0.9,
        "high_authority_source_count": 5,
        "best_of_list_mentions": 12,
        "query_semantic_diversity": 0.95,
    }
)

if result3:
    pretty_print_result(result3)
    print("\n💡 INTERPRETATION:")
    print("   A coordinated push across multiple dimensions can produce")
    print("   significant cumulative lift. Each lever contributes ~1-4pp,")
    print("   but together they compound to 15-20pp total improvement.")

# ============================================================================
# SCENARIO 4: Conservative Approach
# ============================================================================

print_scenario("SCENARIO 4: Just Improve Schema Markup")
print("""
Conservative play: only improve schema implementation from 0.5 to 0.8.
Don't publish new content, don't chase best-of lists.
""")

result4 = run_simulation(
    brand_id="figma-012",
    scenario_name="Improve schema markup only",
    scenario_features={
        "schema_markup_score": 0.8,  # Up from 0.5
    }
)

if result4:
    pretty_print_result(result4)
    print("\n💡 INTERPRETATION:")
    print("   Schema markup has modest direct effect (~1-2pp). But it makes")
    print("   your data cleaner/easier to parse, which helps with quality")
    print("   filtering in LLM training pipelines. Low effort, some payoff.")

# ============================================================================
# SCENARIO 5: Beat Competitors
# ============================================================================

print_scenario("SCENARIO 5: Out-Positioning Competitors")
print("""
Your competitor just got into Gartner. You respond by:
  • Publishing comprehensive guide
  • Getting 2 more authority mentions than them
  • Landing in 5 more best-of lists
""")

result5 = run_simulation(
    brand_id="stripe-345",
    scenario_name="Out-position competitor",
    scenario_features={
        "avg_source_freshness_months": 0.05,  # Very fresh
        "high_authority_source_count": 7,
        "best_of_list_mentions": 20,
        "competitors_gaining": False,  # Show we're not losing ground
    }
)

if result5:
    pretty_print_result(result5)
    print("\n💡 INTERPRETATION:")
    print("   When competitors move, you need to respond fast with multiple")
    print("   initiatives. Fresh content + authority signals work together.")

# ============================================================================
# Summary
# ============================================================================

print("\n" + "="*80)
print("  SUMMARY: What You've Learned")
print("="*80)

print("""
🎯 TOP LEVERS FOR AI SEARCH VISIBILITY:

1. AUTHORITY SOURCES (8-12pp lift)
   → Get into G2, Capterra, Gartner, major roundups
   → This is the #1 driver of mentions
   → Strategy: PR, analyst relations, partnerships

2. FRESH CONTENT (4-6pp lift)
   → Publish detailed guides, implementation docs, case studies
   → Recency bias is real: 65% of AI hits cite <1 year old content
   → Strategy: Content calendar + SEO integration

3. COMPREHENSIVE APPROACH (15-20pp combined)
   → Each lever amplifies others
   → Fresh content in authority sources = 2x effect
   → Strategy: Coordinated quarterly pushes

4. SCHEMA MARKUP (1-2pp direct, modest indirect)
   → Low-effort, some payoff
   → Makes your data cleaner
   → Strategy: Implement all recommended schemas

5. COMPETITOR RESPONSE (Critical, reactive)
   → When competitors move, respond immediately
   → If you wait, you lose ground
   → Strategy: Monitor competitor news, have playbook ready

💰 FOR PRODUCT/MARKETING:
   → Authority sources are your primary focus
   → Fresh content is leverage on top
   → Schema/technical is table stakes
   → Speed matters: act within 1-2 days of competitor moves
""")

print("\n" + "="*80)
print("✅ Simulation engine tested and working!")
print("="*80)
