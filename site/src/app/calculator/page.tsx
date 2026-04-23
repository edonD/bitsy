import { PageHeader, Section, Prose, SourceList, Callout } from "@/components/ResearchPage";
import { CostCalculator } from "@/components/CostCalculator";

export const metadata = {
  title: "Cost Calculator — Bitsy",
};

export default function CalculatorPage() {
  return (
    <div>
      <PageHeader
        task="3.3"
        title="AI-Search Monitoring Cost Model"
        subtitle="Estimate monthly API cost for repeated prompt sampling across multiple models. Configure brands, prompt volume, model mix, and optimization choices to pressure-test the economics."
      />

      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="mt-10">
          <CostCalculator />
        </div>

        <Section title="How Costs Are Calculated">
          <Prose>
            <p>
              Each brand monitoring query involves sending a prompt (~100 input tokens) to an LLM and receiving a
              response (~500 output tokens) that may or may not mention your brand. The total number of API calls is:
            </p>
          </Prose>
          <div className="paper-card my-4 rounded-2xl p-4 font-mono text-sm text-[var(--ink)]">
            Total queries/month = brands &times; queries_per_brand &times; models &times; samples &times;
            polls_per_day &times; 30
          </div>
          <Prose>
            <p>
              <strong>Samples per query</strong> account for LLM non-determinism. Even at temperature=0, responses can
              vary ~5-10% between runs due to hardware routing. Running 3 samples catches this variance. At
              temperature=1, you need 15-30 samples for statistical confidence (353 prompts for 95% CI per Research
              2.2).
            </p>
            <p>
              <strong>Polling frequency</strong> determines freshness. Parametric models (GPT, Claude, Gemini) only
              change when retrained, so daily polling is sufficient. Search-augmented modes (e.g. ChatGPT browsing,
              Gemini grounding) pull live web data and can change hourly.
            </p>
          </Prose>
        </Section>

        <Section title="Optimization Strategies">
          <Callout type="insight">
            Combined optimizations (tiered models + batch API + prompt caching + semantic caching) can reduce costs by
            <strong> 90-97%</strong> compared to a naive approach of using flagship models for everything.
          </Callout>
          <Prose>
            <p>
              <strong>Tiered Model Strategy (90-95% savings):</strong> Use budget models (GPT-4.1-nano at $0.0002/query,
              Gemini Flash-Lite at $0.0002/query) for 90% of routine polling. Escalate to mid-tier models (Claude Haiku
              4.5 at $0.0026/query) when changes are detected. Use flagship models (GPT-4o, Sonnet 4.6) only for deep
              competitive analysis (1% of queries).
            </p>
            <p>
              <strong>Batch API (50% savings):</strong> OpenAI, Anthropic, and Google all offer 50% discounts for batch
              processing with 24-hour turnaround. Ideal for scheduled daily polls that don&apos;t need real-time results.
            </p>
            <p>
              <strong>Prompt Caching (50-90% on input tokens):</strong> The system prompt is identical across thousands
              of queries. OpenAI offers automatic cached input at 50% off. Anthropic&apos;s prompt caching reduces input costs
              further. Google offers context caching at ~10% of input price.
            </p>
            <p>
              <strong>Semantic Caching (30-73% total reduction):</strong> Cache responses for similar queries. If
              &quot;best CRM for small business&quot; and &quot;top CRM for small companies&quot; return the same result, cache the second.
              Libraries like GPTCache and Redis vector similarity enable this.
            </p>
          </Prose>
        </Section>

        <Section title="Pricing Assumptions">
          <Prose>
            <p>
              All pricing reflects published API rates as of April 2026. Token costs assume ~100 input tokens per query
              (system prompt + question) and ~500 output tokens (response with brand recommendations). Batch API
              discounts are applied uniformly at 50% for OpenAI, Anthropic, and Google models.
            </p>
          </Prose>
        </Section>

        <SourceList
          sources={[
            { label: "OpenAI API Pricing", url: "https://openai.com/api/pricing/" },
            { label: "Anthropic Models & Pricing", url: "https://platform.claude.com/docs/en/docs/about-claude/models" },
            { label: "Gemini API Pricing", url: "https://ai.google.dev/gemini-api/docs/pricing" },
            { label: "Sellm — AI Search API Pricing Guide", url: "https://sellm.io/post/ai-search-api-pricing-guide" },
            { label: "Redis — LLM Cost Optimization Guide", url: "https://redis.io/blog/large-language-model-operations-guide/" },
            { label: "Prem AI — LLM Cost Optimization Guide", url: "https://blog.premai.io/llm-cost-optimization-8-strategies-that-cut-api-spend-by-80-2026-guide/" },
          ]}
        />
      </div>
    </div>
  );
}
