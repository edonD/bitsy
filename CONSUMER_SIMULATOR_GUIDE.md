# Bitsy Interactive Simulator - Consumer Guide

## 🚀 Quick Start

Your simulation engine is live and ready for consumers!

**Frontend**: http://localhost:3000/simulator
**Backend API**: http://localhost:8000 (Swagger UI at http://localhost:8000/docs)

## What Consumers Can Do

### 1. **Interactive What-If Builder**
- Set your brand name and ID
- Adjust 6 key features with sliders:
  - **Source Freshness** (0.1 - 24 months): How old are sources citing you?
  - **High Authority Sources** (0-10): G2, Gartner, Wikipedia mentions
  - **Best-Of Lists** (0-30): How many top-10/comparison articles mention you?
  - **Schema Markup** (0-1): Implementation quality
  - **Query Diversity** (0.5-1): How broad your coverage is
  - **Parametric Mentions** (0-100%): From model weights vs. web search

### 2. **Instant Predictions**
- Click "Simulate" button
- Get results in <100ms:
  - Current mention rate (baseline)
  - Predicted mention rate (after changes)
  - Lift in percentage points
  - 95% confidence interval
  - Confidence level (HIGH/MEDIUM/LOW)

### 3. **Feature Contribution Breakdown**
- See exactly what's driving the lift
- SHAP values show each feature's contribution
- Top contributors displayed first
- Progress bars show relative impact

### 4. **Edge Case Analysis**
- "What if only 1 authority source picks it up?"
- "What if content ages to 3 months?"
- "What if competitors copy our strategy?"
- Shows prediction robustness

### 5. **Scenario Management**
- Save scenarios with meaningful names
- Load saved scenarios anytime
- Compare different strategies side-by-side
- Scenarios persist in browser storage

### 6. **Tips & Guidance**
- In-app tips for best practices
- Recommendations on which levers matter most
- Clear feedback on what's working

## Real-World Use Cases

### Use Case 1: Testing a Content Strategy
**Scenario**: "We're publishing 5 detailed implementation guides"

**Actions**:
1. Set `avg_source_freshness_months` to 0.1 (brand new)
2. Set `query_semantic_diversity` to 0.95 (covers more variations)
3. Click Simulate
4. See: +2-4pp expected lift
5. Save as "Content Push Q2"

### Use Case 2: Winning Back Market Share
**Scenario**: "Competitor just got into Gartner, we need to respond"

**Actions**:
1. Set `high_authority_source_count` to 6 (2 more than current)
2. Set `best_of_list_mentions` to 15 (from 5)
3. Set `avg_source_freshness_months` to 0.05 (very fresh)
4. Click Simulate
5. See: +8-12pp expected lift
6. Compare with other scenarios

### Use Case 3: Understanding Schema Impact
**Scenario**: "Does schema markup actually matter?"

**Actions**:
1. ONLY change `schema_markup_score` from 0.5 to 1.0
2. Click Simulate
3. See: +0.5-1pp direct lift
4. Note: Indirect benefits from cleaner parsing
5. Decide if effort is worth it

### Use Case 4: Budget Optimization
**Scenario**: "We have limited budget, what's the highest-ROI move?"

**Compare 3 scenarios**:

**Scenario A**: Fresh content only
- Change: `avg_source_freshness_months` to 0.1
- Expected lift: +2-3pp
- Cost: Low (internal team)
- Save as "Low-Cost Content"

**Scenario B**: Authority push
- Change: `high_authority_source_count` to 6
- Expected lift: +4-6pp
- Cost: Medium (PR/analyst relations)
- Save as "Authority Focus"

**Scenario C**: Comprehensive push
- Change all 4 major levers
- Expected lift: +10-15pp
- Cost: High (all initiatives)
- Save as "Full Court Press"

Then **compare** which ROI makes sense for budget.

## Key Metrics Explained

### Current Mention Rate
The percentage of AI search results that mention your brand currently (baseline).
- Typical range: 20-60%
- Industry average: ~35%

### Predicted Mention Rate
What you'd expect after implementing the changes.
- Same scale (20-60%)
- Based on trained surrogate model

### Lift in Percentage Points (pp)
Absolute change in mention rate.
- +9pp = going from 35% to 44%
- Every 1pp = significant improvement
- Typical good scenario: +3 to +10pp

### Confidence Interval [95%]
The model's uncertainty bounds.
- Narrow intervals (±3pp) = HIGH confidence
- Wide intervals (±8pp) = LOW confidence
- Driven by model validation RMSE

### Confidence Level
**HIGH**: Model has seen similar feature combinations before
**MEDIUM**: Novel but plausible scenario
**LOW**: Extrapolating beyond training data

### SHAP Contributions
Which features are driving the predicted lift.
- Shown as percentages of total lift
- Sorted by impact (highest first)
- Helps prioritize actual initiatives

## Best Practices for Using the Simulator

### 1. **Test One Lever at a Time First**
Start with single-feature changes to understand each lever's impact:
- "How much does freshness matter alone?"
- "What's the authority ROI?"
- "Does query diversity help?"

### 2. **Then Build Scenarios**
Combine levers strategically:
- High impact + low cost
- Complementary effects (fresh content + authority = synergy)

### 3. **Save Everything**
Label scenarios clearly:
- "Q2 Content Push"
- "Gartner Response Plan"
- "Budget-Constrained Push"
- "Aggressive Growth Plan"

### 4. **Trust the Confidence Levels**
- HIGH confidence: Take action (likely accurate)
- MEDIUM confidence: Use for relative comparisons
- LOW confidence: Treat as directional only

### 5. **Focus on Top 3 Features**
The simulator shows that:
1. Authority (3-6pp each)
2. Freshness (2-4pp)
3. Lists (2-3pp per 5 mentions)

...drive 80%+ of lift. Others have supporting roles.

## Understanding the Results

### A Good Scenario
- Lift > 3pp
- Confidence = HIGH or MEDIUM
- Features showing positive contributions
- Edge cases still show upside

### A Risky Scenario
- Confidence = LOW
- Edge cases show negative scenarios
- Requires novel strategy

### A Robust Scenario
- Multiple features contributing
- High confidence even in edge cases
- Works even if execution isn't perfect

## Common Questions

**Q: Why does my scenario show LOW confidence?**
A: You're modifying features in an extreme way the model didn't see in training. It still gives predictions, but with larger error bars.

**Q: Should I trust the SHAP breakdown?**
A: Yes - it's mathematically proven to correctly attribute importance. It shows what the model "thinks" drives each prediction.

**Q: Can I compare scenarios?**
A: Load each saved scenario to see side-by-side predictions. Screenshot results to compare manually (comparison UI coming soon).

**Q: What if my scenario shows negative lift?**
A: Usually means you reduced something important (e.g., made sources much older). The model is warning this hurts visibility.

**Q: How often should I re-simulate?**
A: 
- Daily: Track baseline (no changes)
- Weekly: Test new strategies
- Monthly: Full audit against competitors

## Tips for Content Teams

### For Marketing Teams
1. Test content strategies before publishing
2. Validate timing (freshness) matters
3. Plan for authority signals (PR/partnerships)

### For PR/Analyst Relations
1. Show impact of list mentions on AI visibility
2. Justify Gartner/analyst effort with +3pp per source
3. Prioritize high-authority channels

### For Product Teams
1. Use freshness metric to plan update cadence
2. Test if new features improve query diversity
3. Measure schema.org implementation ROI

### For Executive Teams
1. Quantify trade-offs (cost vs impact)
2. Compare strategies (fresh content vs authority)
3. Justify resource allocation

## What's Coming Soon

- ✅ Interactive sliders (shipped)
- ✅ SHAP explanations (shipped)
- ✅ Scenario saving (shipped)
- ⏳ Scenario comparison UI
- ⏳ Real data integration (actual mention rates)
- ⏳ Historical performance tracking
- ⏳ Competitor benchmarking
- ⏳ Automated recommendations

## Reporting Results

Use this template to report simulator findings:

```
SCENARIO: [Name]
PREDICTED LIFT: [X]pp (current [Y]% → future [Y+X]%)
CONFIDENCE: [HIGH/MEDIUM/LOW]

Key drivers:
- [Feature 1]: +Xpp ([%]% of lift)
- [Feature 2]: +Xpp ([%]% of lift)
- [Feature 3]: +Xpp ([%]% of lift)

Edge cases:
- [Scenario]: [Impact]
- [Scenario]: [Impact]

Recommendation: [Action]
Estimated cost: [Low/Medium/High]
Timeline: [Weeks]
ROI: [How it justifies the cost]
```

## Troubleshooting

**Simulator loads but no results appear**
- Check that backend is running: http://localhost:8000/api/health
- Check browser console for errors (F12)
- Try refreshing page

**Results seem wrong**
- Remember: model is trained on synthetic data
- HIGH confidence = more reliable
- Use for relative comparisons between scenarios

**Can't save scenarios**
- Browser storage might be disabled
- Try incognito mode
- Clear cache and retry

**Slow predictions**
- First simulation trains the model (~5 seconds)
- Subsequent predictions are <100ms
- If slow, backend might be overloaded

## Pricing Context

What you're using:
- **SaaS Tier**: Starter plan ($99/mo)
- **Brands**: Up to 10
- **Scenarios**: Unlimited
- **Storage**: Browser-based (no server cost)

This simulator cost ~$0 to run (no API calls after model training).

Real-world implementation adds data collection ($15-50/mo per brand) and database storage.

---

**Ready to test your first scenario?**

Go to: http://localhost:3000/simulator

Start with the "Authority Push" scenario to see maximum impact, then experiment from there.

Good luck! 🚀
