#!/bin/bash

echo "==================== SCENARIO 1: Publish Fresh Content ===================="
curl -s -X POST http://localhost:8000/api/simulations/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "zapier-001",
    "scenario_name": "Publish fresh implementation guide",
    "scenario_features": {
      "avg_source_freshness_months": 0.1
    }
  }' | python -m json.tool 2>/dev/null | head -40

echo -e "\n\n==================== SCENARIO 2: Get Featured in Best-Of List ===================="
curl -s -X POST http://localhost:8000/api/simulations/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "slack-001",
    "scenario_name": "Featured in Gartner Magic Quadrant",
    "scenario_features": {
      "high_authority_source_count": 6,
      "best_of_list_mentions": 15
    }
  }' | python -m json.tool 2>/dev/null | head -40

echo -e "\n\n==================== SCENARIO 3: Multiple Improvements ===================="
curl -s -X POST http://localhost:8000/api/simulations/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "notion-001",
    "scenario_name": "Full optimization: fresh content + schema + authority",
    "scenario_features": {
      "avg_source_freshness_months": 0.5,
      "schema_markup_score": 0.9,
      "high_authority_source_count": 5,
      "best_of_list_mentions": 12,
      "query_semantic_diversity": 0.95
    }
  }' | python -m json.tool 2>/dev/null | head -40
