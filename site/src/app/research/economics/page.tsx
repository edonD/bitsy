import {
  PageHeader,
  Section,
  SubSection,
  KeyStat,
  DataTable,
  Callout,
  SourceList,
  Prose,
} from "@/components/ResearchPage";
import { CostCalculator } from "@/components/CostCalculator";

export const metadata = {
  title: "The Economics — Bitsy Research",
};

export default function EconomicsPage() {
  return (
    <div>
      <PageHeader
        task="2.3"
        title="The Economics"
        subtitle="API costs per model, cost-per-query analysis, monthly cost modeling, optimization strategies, comparison to traditional SEO tools, and break-even analysis for GEO SaaS."
      />

      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          <KeyStat value="25x" label="Cost gap: cheapest vs. flagship" />
          <KeyStat value="$0.0002" label="Cheapest query (GPT-4.1-nano)" />
          <KeyStat value="90-97%" label="Possible savings with optimization" />
          <KeyStat value="$79-149" label="Market sweet spot per month" />
        </div>

        <Section title="1. API Pricing Per Model (April 2026)">
          <SubSection title="OpenAI">
            <DataTable
              headers={["Model", "Input/1M tokens", "Output/1M tokens", "Batch Discount"]}
              rows={[
                [<strong key="n">GPT-4.1-nano</strong>, "$0.10", "$0.40", "50%"],
                ["GPT-4o-mini", "$0.15", "$0.60", "50%"],
                ["GPT-4.1-mini", "$0.40", "$1.60", "50%"],
                ["GPT-4o", "$2.50", "$10.00", "50%"],
                ["GPT-4.1", "$2.00", "$8.00", "50%"],
              ]}
            />
          </SubSection>

          <SubSection title="Anthropic (Claude)">
            <DataTable
              headers={["Model", "Input/1M tokens", "Output/1M tokens", "Context"]}
              rows={[
                ["Claude Opus 4.6", "$5.00", "$25.00", "1M tokens"],
                [<strong key="s">Claude Sonnet 4.6</strong>, "$3.00", "$15.00", "1M tokens"],
                ["Claude Haiku 4.5", "$1.00", "$5.00", "200k tokens"],
              ]}
            />
          </SubSection>

          <SubSection title="Google Gemini">
            <DataTable
              headers={["Model", "Input/1M tokens", "Output/1M tokens", "Notes"]}
              rows={[
                ["Gemini 2.5 Pro", "$1.25", "$10.00", "Higher rate for >200k context"],
                [<strong key="f">Gemini 2.5 Flash</strong>, "$0.30", "$2.50", ""],
                [<strong key="fl">Gemini 2.5 Flash-Lite</strong>, "$0.10", "$0.40", "Free tier available"],
              ]}
            />
            <Callout type="info">
              Grounding with Google Search costs <strong>$14 per 1,000 queries</strong> (after 5,000 free/month).
            </Callout>
          </SubSection>

          <SubSection title="Perplexity Sonar">
            <DataTable
              headers={["Model", "Input/1M", "Output/1M", "Request Fee/1K"]}
              rows={[
                [<strong key="s">Sonar</strong>, "$1.00", "$1.00", "$5-12"],
                ["Sonar Pro", "$3.00", "$15.00", "$6-22"],
                ["Sonar Reasoning Pro", "$2.00", "$8.00", "$6-14"],
              ]}
            />
            <Callout type="warning">
              Perplexity charges both token costs AND per-request fees. Total cost per query = tokens + request fee.
            </Callout>
          </SubSection>
        </Section>

        <Section title="2. Cost Per Query Comparison">
          <Prose>
            <p>
              Assuming a typical brand monitoring query: ~100 input tokens (system prompt + question), ~500
              output tokens (response with recommendations):
            </p>
          </Prose>
          <DataTable
            headers={["Model", "Cost/Query", "Annual (18K queries/mo)"]}
            rows={[
              [<strong key="n">GPT-4.1-nano</strong>, <strong key="np">$0.0002</strong>, "$43"],
              ["Gemini 2.5 Flash-Lite", "$0.0002", "$43"],
              ["GPT-4o-mini", "$0.0003", "$65"],
              ["Gemini 2.5 Flash", "$0.0013", "$281"],
              ["Claude Haiku 4.5", "$0.0026", "$562"],
              ["Perplexity Sonar (+ request fee)", "$0.0006 + ~$0.008", "$1,858"],
              ["GPT-4o", "$0.0053", "$1,145"],
              [<span key="cs" className="text-red-600">Claude Sonnet 4.6</span>, <span key="cp" className="text-red-600">$0.0078</span>, "$1,685"],
            ]}
          />
          <Callout type="insight">
            The cheapest viable models (GPT-4.1-nano, Gemini Flash-Lite) cost{" "}
            <strong>~25x less per query</strong> than flagship models (Sonnet 4.6, Sonar Pro). This gap is the
            foundation of the cost optimization strategy.
          </Callout>
        </Section>

        <Section title="3. Monthly Cost Modeling">
          <SubSection title="Scenario A: Small Brand Monitoring (10 brands)">
            <Prose>
              <p>10 brands &times; 5 queries &times; 4 models &times; 3 samples &times; daily = <strong>18,000 queries/mo</strong></p>
            </Prose>
            <DataTable
              headers={["Strategy", "Monthly Cost"]}
              rows={[
                ["All GPT-4.1-nano", "$3.60"],
                ["All GPT-4o-mini", "$5.40"],
                ["All GPT-4o", "$95.40"],
                ["All Claude Sonnet 4.6", "$140.40"],
                [<strong key="m">Mixed: nano/Flash-Lite polling, GPT-4o deep dives (90/10)</strong>, <strong key="mc">~$13</strong>],
                ["With Perplexity Sonar (add request fees)", "$50–80"],
              ]}
            />
          </SubSection>

          <SubSection title="Scenario B: Enterprise (100 brands)">
            <Prose>
              <p>100 brands &times; 10 queries &times; 4 models &times; 5 samples &times; daily = <strong>600,000 queries/mo</strong></p>
            </Prose>
            <DataTable
              headers={["Strategy", "Monthly Cost"]}
              rows={[
                ["All GPT-4.1-nano", "$120"],
                ["All GPT-4o", "$3,180"],
                ["All Claude Sonnet 4.6", "$4,680"],
                [<strong key="b">Mixed budget (95/5 split)</strong>, <strong key="bc">$350–500</strong>],
                ["With batch API (50% off)", "$175–250"],
              ]}
            />
          </SubSection>
        </Section>

        <Section title="Interactive Cost Calculator">
          <Prose>
            <p>
              Configure your own monitoring parameters to estimate monthly API costs. Adjust brands, queries,
              models, and optimization settings to see real-time projections based on the pricing data above.
            </p>
          </Prose>
          <div className="mt-6">
            <CostCalculator compact />
          </div>
        </Section>

        <Section title="4. Cost Optimization Strategies">
          <SubSection title="Tiered Model Strategy (90-95% savings)">
            <Prose>
              <p>
                The single most impactful optimization: use cheap models for routine polling, expensive models
                only for targeted analysis when changes are detected.
              </p>
            </Prose>
            <DataTable
              headers={["Tier", "Models", "Use Case", "Cost/Query"]}
              rows={[
                [<strong key="p">Polling (90%)</strong>, "GPT-4.1-nano, Gemini Flash-Lite", "Daily brand detection", "$0.0002"],
                ["Analysis (9%)", "GPT-4o-mini, Haiku 4.5", "Change detected → detailed breakdown", "$0.0003-0.0026"],
                ["Deep dive (1%)", "GPT-4o, Sonnet 4.6, Sonar Pro", "Full competitive analysis", "$0.005-0.02"],
              ]}
            />
          </SubSection>

          <SubSection title="Combined Optimization Impact">
            <DataTable
              headers={["Strategy", "Individual Savings", "Cumulative"]}
              rows={[
                ["Tiered model strategy", "90–95%", "90–95%"],
                ["+ Batch API", "50% on remaining", "95–97.5%"],
                ["+ Prompt caching", "50–90% on input", "96–99%"],
                ["+ Semantic caching", "30–73% on cache hits", "97–99.5%"],
                ["+ Low-temp sampling (3 vs 30 samples)", "60–80%", "98–99.8%"],
              ]}
            />
            <Callout type="insight">
              Realistic combined savings: <strong>90&ndash;97%</strong> vs. naive approach. Enterprise scenario
              (100 brands): from <strong>$4,680/mo</strong> naive to <strong>$140&ndash;470/mo</strong> optimized.
            </Callout>
          </SubSection>
        </Section>

        <Section title="5. Competitor Pricing Landscape">
          <DataTable
            headers={["Tool", "Entry", "Mid-Tier", "Enterprise", "Per-Prompt"]}
            rows={[
              ["Rankscale", "$20/mo", "$99/mo", "$780/mo", "~$0.017"],
              ["Otterly.AI", "$29/mo", "$189/mo", "$489/mo", "~$1.22-1.93"],
              ["LLM Pulse", "EUR 49/mo", "EUR 99/mo", "EUR 299/mo", "~EUR 0.66-0.98"],
              ["Peec AI", "~EUR 95/mo", "~EUR 245/mo", "~EUR 495/mo", "~EUR 0.02"],
              ["AthenaHQ", "$295/mo", "—", "Custom", "~$0.083"],
              ["Scrunch AI", "$250/mo", "—", "Custom", "~$0.125-2.00"],
              ["Profound", "$499/mo", "$399/mo Growth", "$2,000-5,000+", "~$4-10"],
              [<strong key="se">Sellm (API)</strong>, "Usage-based", "—", "—", <strong key="sp">&lt;$0.01</strong>],
            ]}
          />
          <Callout type="warning">
            There is a <strong>500x&ndash;1,000x spread</strong> in per-prompt pricing across the market. Profound
            charges ~$9.98/prompt for what costs &lt;$0.01 in raw API calls. The value is in parsing, analysis,
            dashboarding, and insights layered on top.
          </Callout>
        </Section>

        <Section title="6. Comparison to Traditional SEO Tools">
          <DataTable
            headers={["Tool", "Monthly Price", "What You Get"]}
            rows={[
              ["Semrush Starter", "$99/mo", "Basic SEO toolkit"],
              ["Semrush Guru", "$229/mo", "Full SEO + content marketing"],
              ["Ahrefs Lite", "$129/mo", "Core SEO tools (up from $99)"],
              ["Ahrefs Standard", "$249/mo", "Full suite (up from $179)"],
              ["Ahrefs Enterprise", "$1,499/mo", "Enterprise (50% increase over 2025)"],
            ]}
          />
          <Prose>
            <p>
              Semrush (NASDAQ: SEMR) benchmarks: Average ARR per customer <strong>$3,522</strong> (~$294/mo).
              Customers paying &gt;$50K/year grew <strong>72% YoY</strong>. Total ARR: $455.4M (+14% YoY).
              AI product ARR contribution: $10M in Q3 2025 alone (doubling quarter-over-quarter).
            </p>
          </Prose>
        </Section>

        <Section title="7. Break-Even Analysis for GEO SaaS">
          <DataTable
            headers={["Parameter", "Conservative", "Growth"]}
            rows={[
              ["Price point", "$99/mo", "$199/mo"],
              ["Gross margin", "~70%", "~80%"],
              ["Infrastructure + API", "~$30/customer/mo", "~$40/customer/mo"],
              ["Engineering team (3 FTE)", "$45K/mo", "$45K/mo"],
              ["Marketing + sales", "$15K/mo", "$20K/mo"],
              [<strong key="be">Break-even customers</strong>, <strong key="bec">~870</strong>, <strong key="beg">~410</strong>],
              ["Time to break-even (est.)", "~36 months", "~22 months"],
            ]}
          />
          <Callout type="insight">
            The <strong>market sweet spot is $79&ndash;149/month</strong> for most teams. At $199/mo with
            optimized API costs ($0.0002&ndash;0.002/query), approximately <strong>230 customers</strong> reach
            break-even at ~month 22. The 500x&ndash;1,000x markup over raw API costs demonstrates strong
            unit economics potential.
          </Callout>
        </Section>

        <SourceList
          sources={[
            { label: "OpenAI API Pricing", url: "https://openai.com/api/pricing/" },
            { label: "Anthropic Models & Pricing", url: "https://platform.claude.com/docs/en/docs/about-claude/models" },
            { label: "Gemini API Pricing", url: "https://ai.google.dev/gemini-api/docs/pricing" },
            { label: "Perplexity API Pricing", url: "https://docs.perplexity.ai/guides/pricing" },
            { label: "Sellm — AI Search API Pricing Guide", url: "https://sellm.io/post/ai-search-api-pricing-guide" },
            { label: "Otterly.AI Pricing", url: "https://otterly.ai/pricing" },
            { label: "Profound Pricing", url: "https://www.tryprofound.com/pricing" },
            { label: "Semrush Q4 2025 Financial Results", url: "https://investors.semrush.com/news/news-details/2026/Semrush-Announces-Fourth-Quarter-and-Full-Year-2025-Financial-Results/" },
            { label: "Ahrefs Pricing 2026 (CheckThat.ai)", url: "https://checkthat.ai/brands/ahrefs/pricing" },
            { label: "Redis — LLM Cost Optimization Guide", url: "https://redis.io/blog/large-language-model-operations-guide/" },
            { label: "Prem AI — LLM Cost Optimization Guide", url: "https://blog.premai.io/llm-cost-optimization-8-strategies-that-cut-api-spend-by-80-2026-guide/" },
          ]}
        />
      </div>
    </div>
  );
}
