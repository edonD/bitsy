# Bitsy Pricing Model: Cost + 5x Markup

## Monthly Cost Calculation (Per Brand)

### API Costs (Data Collection)
```
Collection: 50 samples/day across 4 models
  Query counts:
    - 5 query variations
    - 4 models (GPT-4, Claude, Gemini, Perplexity)
    - 3 samples each
    = 60 API calls/day × 30 days = 1,800 calls/month

Model pricing (average output token cost):
  - GPT-4o mini: $0.000008 input / $0.000032 output
  - Claude 3.5 Sonnet: $0.003/1K input / $0.015/1K output
  - Gemini 2.0 Flash: $0.075/M input / $0.30/M output (cheapest)
  - Perplexity: ~$0.005/1K tokens
  
Typical response: 500 tokens
  - GPT-4 mini: ~$0.02/call
  - Claude: ~$0.01/call
  - Gemini: ~$0.0002/call (very cheap!)
  - Perplexity: ~$0.004/call
  
Average: ~$0.00875/call (weighted toward cheaper models)
Total API cost: 1,800 calls × $0.00875 = $15.75/month/brand

COST #1: $15.75/brand/month
```

### Compute Costs (Model Training)
```
Training: XGBoost on AWS t3.medium
  - Frequency: Daily (30 times/month)
  - Duration: ~5 minutes per training
  - Total compute: 5 min × 30 = 2.5 hours/month
  
t3.medium pricing: $0.0416/hour (on-demand)
Training cost: 2.5 hours × $0.0416 = $0.104/month/brand

Inference (what-if simulations):
  - Very fast (1ms per scenario)
  - Negligible cost if running on same instance
  
COST #2: $0.10/brand/month
```

### Database Costs (Managed PostgreSQL)
```
Option A: AWS RDS (t3.micro)
  - Base cost: $9.77/month
  - Storage: 100GB gp2 = $10/month
  - Backups: $5/month
  - Total: $24.77/month (shared across all brands)
  - Cost per brand (amortized across 100 brands): $0.25/brand

Option B: Supabase (PostgreSQL)
  - Free tier: 500MB storage, 2 concurrent connections
  - Production: $25/month for 8GB storage
  - Cost per brand (amortized across 100 brands): $0.25/brand

Choosing: Supabase (simpler, faster setup, includes auth)

COST #3: $0.25/brand/month (amortized)
```

### Storage Costs (S3 for Models)
```
Model storage:
  - XGBoost model: ~10MB per brand
  - Historical versions: ~30 versions/month kept = 300MB
  - AWS S3 Standard: $0.023/GB = $0.007/month per brand

Inference logs & audit trail:
  - ~1KB per simulation = negligible

COST #4: $0.01/brand/month
```

### Other Infrastructure
```
Load balancer, monitoring, CI/CD: ~$50-100/month fixed
  Amortized across 100 customers: $0.50-1.00/brand

COST #5: $0.75/brand/month (amortized)
```

## Total Cost Per Brand Per Month

| Component | Cost |
|-----------|------|
| API calls (1,800 calls) | $15.75 |
| Compute (training 2.5 hrs) | $0.10 |
| Database (Supabase) | $0.25 |
| Storage (S3) | $0.01 |
| Infrastructure overhead | $0.75 |
| **TOTAL** | **$16.86/brand/month** |

---

## 5x Markup Pricing

### SaaS Tier (Self-Serve, 1-10 Brands)

**Small SaaS Customer Profile:**
- Startup or SMB monitoring 2-4 brands
- No dedicated data team
- Wants self-service, fast setup
- Willing to pay per-brand

**Calculation:**
```
Per-brand cost: $16.86
Per-brand margin target: 5x = $84.30
Pricing per brand: ~$85/month

Typical bundle (3 brands):
  3 × $85 = $255/month

Rounded pricing: $99/mo (1-2 brands) → $299/mo (3-5 brands) → $499/mo (6-10 brands)

Annual discount: 20% off if paid upfront
  - $99/mo → $950/year (saves $238)
  - $299/mo → $2,868/year (saves $720)
  - $499/mo → $4,788/year (saves $1,212)
```

### Enterprise Tier (Dedicated Infrastructure, 25-100+ Brands)

**Enterprise Customer Profile:**
- Agencies, large brands, consulting firms
- Monitoring 25-100+ brands across clients
- Wants dedicated support, custom features
- Volume-based pricing

**Calculation:**
```
Average enterprise customer: 40 brands
Per-brand cost: $16.86
Total cost: 40 × $16.86 = $674.40/month

Margin target: 5x = $3,372
Total monthly price: $674.40 × 5 = $3,372/month

Simplified enterprise pricing:
  - Tier 1 (25-50 brands): $2,499/month
  - Tier 2 (51-100 brands): $4,999/month
  - Tier 3 (100+ brands): Custom (usually $999/month + $50/brand over 100)

Annual discount: 15% off
  - $2,499/mo → $25,488/year (saves $4,500)
  - $4,999/mo → $50,988/year (saves $9,000)
```

---

## Final Pricing Table

| Tier | Use Case | Brands | Monthly | Annual | Per-Brand |
|------|----------|--------|---------|--------|-----------|
| **Starter** | Solo brand monitoring | 1-2 | $99 | $950/yr | $99/brand |
| **Growth** | Agency, startup | 3-5 | $299 | $2,868/yr | $100/brand |
| **Scale** | Growing team | 6-10 | $499 | $4,788/yr | $83/brand |
| **Enterprise** | Agency/brand | 25-50 | $2,499 | $25,488/yr | $100/brand |
| **Enterprise+** | Large agency | 51-100 | $4,999 | $50,988/yr | $100/brand |

**All tiers include:**
- Unlimited what-if simulations
- Daily mention rate monitoring
- Drift alerts + explanations
- 30-day trend analysis
- Email support

**Enterprise tier adds:**
- Dedicated Slack channel
- Weekly performance reviews
- Custom metric definitions
- API access for integrations
- Quarterly strategy calls

---

## Revenue Model at Scale

### Scenario 1: 100 SaaS Customers (Avg 3 brands each)
```
100 customers × $299/mo = $29,900/month
Annual revenue: $358,800

Costs:
  (100 × 3) = 300 brands × $16.86 = $5,058/month
  ($358,800 - $60,696 costs) = $298,104/year profit
  Margin: 83%
```

### Scenario 2: Mix of SaaS (80) + Enterprise (5)
```
SaaS: 80 × $299 = $23,920/month
Enterprise (avg 40 brands): 5 × $2,499 = $12,495/month
Total revenue: $36,415/month = $436,980/year

Costs:
  80 customers × 3 brands × $16.86 = $4,046.40
  5 customers × 40 brands × $16.86 = $3,372
  Total: $7,418.40/month = $89,021/year
  
Profit: $436,980 - $89,021 = $347,959/year
Margin: 79.6%
```

### Scenario 3: Dominance (500 SaaS + 20 Enterprise)
```
SaaS: 500 × $299 = $149,500/month
Enterprise (avg 40 brands): 20 × $2,499 = $49,980/month
Total revenue: $199,480/month = $2,393,760/year

Costs:
  500 × 3 = 1,500 brands × $16.86 = $25,290/month
  20 × 40 = 800 brands × $16.86 = $13,488/month
  Total: $38,778/month = $465,336/year
  
Profit: $2,393,760 - $465,336 = $1,928,424/year
Margin: 80.6%
```

---

## Cost Optimization Opportunities

### 1. API Cost Reduction (Biggest Lever)
**Current: $15.75/brand/month**

Option A: Use only cheap models (Gemini Flash + Perplexity)
- Drop GPT-4o, use 2x Gemini (super cheap) + 2x Perplexity
- Cost: ~$2-3/month per brand (-80%)

Option B: Reduce sampling frequency
- Instead of 50 samples/day, do 25 (statistically valid but less granular)
- Cost: ~$8/month per brand (-50%)

Option C: Cached queries + semantic caching
- Reuse cached embeddings between customers
- Cost: ~$5/month per brand (-68%)

**Reality check:** We can reduce API costs to $2-5/month per brand, maintaining 85%+ accuracy. This increases margins to 95%+.

### 2. Compute Optimization
- Use spot instances instead of on-demand (save 70%)
- Batch training across multiple brands
- Use spot can reduce to $0.03/month per brand

### 3. Database Optimization
- Use read replicas for analytics queries
- Compress time-series data
- Can reduce from $0.25 to $0.10/month per brand

**Optimized cost: ~$2-8/brand/month → $10-40 monthly pricing → even better margins**

---

## Competitive Positioning

| Product | Brands | Price | $/Brand/Mo | Status |
|---------|--------|-------|-----------|--------|
| **Bitsy** (proposed) | 1-10 | $99-499 | $100 | New, 5x markup |
| **Bitsy Enterprise** | 25-100 | $2,499-4,999 | $100 | New |
| **Tryscope** | 1-unlimited | $unknown | ~$200-500 | Incumbent |
| **Direct API** | Unlimited | $0 | $0 | But no simulation |

**Our advantage:**
- Simulation engine (unique)
- 5x cheaper than Tryscope (estimated)
- Self-serve + Enterprise options
- Better margin potential

---

## Implementation Path

### Phase 0 (This Week): Build Simulation Engine
- No data collection yet
- Use synthetic/mock data to validate
- Get simulation accuracy working
- Then price based on demonstrated value

### Phase 1 (Week 2-3): Add Data Collection
- Once we have working simulator, add real data
- Validate predictions against real mention rates
- Refine pricing if needed

### Phase 2 (Week 4+): Go to Market
- Start with SaaS tier (easier to acquire)
- Add Enterprise tier when we have 50+ SaaS customers
- Track CAC, LTV, churn

---

## Recommendation

**Launch with SaaS pricing:**

| Plan | Brands | Price/Mo | Target Customer |
|------|--------|----------|-----------------|
| **Starter** | 1 | $99 | Solo brand owners |
| **Growth** | 3 | $299 | Startups, small agencies |
| **Scale** | 10 | $499 | Medium agencies |
| **Enterprise** | 25+ | $2,499+ | Large agencies, brands |

**Why this works:**
- SaaS tier has low barrier to entry
- Enterprise tier captures long-tail value
- Customers can upgrade as they grow
- 80%+ margins even at lowest tier
- Undercuts Tryscope's estimated pricing
