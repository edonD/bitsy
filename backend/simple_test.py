#!/usr/bin/env python3
"""
Simple test of the simulation engine
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

from models.surrogate import SurrogateModel
from simulation.simulator import ScenarioSimulator
from data.mock_data import MockDataGenerator

print("="*80)
print("BITSY SIMULATION ENGINE - INTERACTIVE TEST")
print("="*80)

# Initialize
print("\n[1/4] Generating mock training data...")
mock_gen = MockDataGenerator()
feature_names = mock_gen.get_feature_names()
X, y = mock_gen.generate_training_data(num_brands=5, days_per_brand=60)
print(f"      Generated {len(X)} samples with {len(feature_names)} features")

# Train model
print("\n[2/4] Training XGBoost surrogate model...")
surrogate = SurrogateModel(feature_names)
metrics = surrogate.train(X, y, verbose=False)
print(f"      Model trained successfully!")
print(f"      Validation R2:   {metrics['r2']:.3f}")
print(f"      Validation RMSE: {metrics['rmse']:.2f}pp")

# Create simulator
print("\n[3/4] Creating scenario simulator...")
simulator = ScenarioSimulator(surrogate)
print(f"      Simulator ready!")

# Test scenarios
print("\n[4/4] Testing scenarios...\n")

baseline = mock_gen.get_baseline_features()

# ============================================================================
# Scenario 1
# ============================================================================
print("="*80)
print("SCENARIO 1: Publish Fresh Implementation Guide")
print("="*80)
print("\nCurrent state: Generic content, 8.3 months old on average")
print("Action: Publish fresh, detailed implementation guide\n")

scenario1 = {"avg_source_freshness_months": 0.1}
result1 = simulator.simulate(baseline, scenario1)

print(f"Base mention rate:     {result1['base_case_prediction']:.1f}%")
print(f"After publishing:      {result1['scenario_prediction']:.1f}%")
print(f"Predicted lift:        +{result1['predicted_lift']:.1f}pp")
print(f"Residual range:        [{result1['confidence_lower']:.1f}% - {result1['confidence_upper']:.1f}%]")
print(f"Confidence level:      {result1['confidence_level']}")

print("\nImportance-weighted feature changes (top 3):")
for i, contrib in enumerate(result1['shap_contributions'][:3], 1):
    print(f"  {i}. {contrib['feature']:45s} {contrib['contribution']:+6.2f}pp")

# ============================================================================
# Scenario 2
# ============================================================================
print("\n" + "="*80)
print("SCENARIO 2: Get Featured in Best-Of Lists")
print("="*80)
print("\nCurrent state: Mentioned in some articles")
print("Action: Get featured in G2, Capterra, major roundups\n")

scenario2 = {
    "high_authority_source_count": 6,
    "best_of_list_mentions": 15,
}
result2 = simulator.simulate(baseline, scenario2)

print(f"Base mention rate:     {result2['base_case_prediction']:.1f}%")
print(f"After lists:           {result2['scenario_prediction']:.1f}%")
print(f"Predicted lift:        +{result2['predicted_lift']:.1f}pp")
print(f"Residual range:        [{result2['confidence_lower']:.1f}% - {result2['confidence_upper']:.1f}%]")
print(f"Confidence level:      {result2['confidence_level']}")

print("\nImportance-weighted feature changes (top 3):")
for i, contrib in enumerate(result2['shap_contributions'][:3], 1):
    print(f"  {i}. {contrib['feature']:45s} {contrib['contribution']:+6.2f}pp")

# ============================================================================
# Scenario 3
# ============================================================================
print("\n" + "="*80)
print("SCENARIO 3: Everything Together")
print("="*80)
print("\nCurrent state: Base state")
print("Action: Fresh content + authority + best-of lists + better schema\n")

scenario3 = {
    "avg_source_freshness_months": 0.1,
    "schema_markup_score": 0.9,
    "high_authority_source_count": 5,
    "best_of_list_mentions": 12,
    "query_semantic_diversity": 0.95,
}
result3 = simulator.simulate(baseline, scenario3)

print(f"Base mention rate:     {result3['base_case_prediction']:.1f}%")
print(f"After full push:       {result3['scenario_prediction']:.1f}%")
print(f"Predicted lift:        +{result3['predicted_lift']:.1f}pp")
print(f"Residual range:        [{result3['confidence_lower']:.1f}% - {result3['confidence_upper']:.1f}%]")
print(f"Confidence level:      {result3['confidence_level']}")

print("\nImportance-weighted feature changes (all factors):")
for i, contrib in enumerate(result3['shap_contributions'][:8], 1):
    print(f"  {i}. {contrib['feature']:45s} {contrib['contribution']:+6.2f}pp")

# ============================================================================
# Scenario 4: Edge cases
# ============================================================================
print("\n" + "="*80)
print("SCENARIO 4: Edge Cases for Scenario 3")
print("="*80)
print("\nWhat if things don't go perfectly?\n")

edge_cases = simulator.edge_case_scenarios(baseline, "Full push")
for edge_case in edge_cases:
    scenario_name = edge_case['scenario_name']
    lift = edge_case['predicted_lift']
    print(f"  • {scenario_name:45s} Lift: {lift:+6.1f}pp")

# ============================================================================
# Summary
# ============================================================================
print("\n" + "="*80)
print("SUMMARY: What the Simulation Shows")
print("="*80)

print("""
DEMO NOTES:

1. FRESHNESS CAN MATTER
   In this synthetic demo, fresh content moves the model upward.
   Treat this as a model behavior check, not field evidence.

2. AUTHORITY IS A MODELED LEVER
   High-authority source features carry weight in the demo model.
   Real lift still needs collection history and verification.

3. COMBINED CHANGES ARE DIRECTIONAL
   Multiple changes can move the prediction together.
   The attribution is importance-weighted, not causal decomposition.

4. ROBUSTNESS NEEDS REAL VALIDATION
   Edge cases are useful smoke tests.
   They do not prove production reliability.

5. WHAT TO DO WITH THIS SCRIPT
   Use it to confirm the simulator runs end to end.
   Use collected multi-day data before presenting forecast-grade confidence.

EXAMPLE PLAYBOOK:
  Week 1: Pitch to analyst firms + major review sites
  Week 2: Start content production (guides, case studies)
  Week 3: Implement/improve schema markup
  Week 4: Publish content + track results
  Week 5: Respond to competitor moves

Expected outcome: a working local smoke test, not a customer promise.
""")

print("\n" + "="*80)
print("SIMULATION ENGINE SMOKE TEST COMPLETE")
print("="*80)
