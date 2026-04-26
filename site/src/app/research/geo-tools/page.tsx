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

export const metadata = {
  title: "How GEO Tools Work Under the Hood — Bitsy Research",
};

export default function GeoToolsPage() {
  return (
    <div>
      <PageHeader
        task="2.2"
        title="How GEO Tools Work Under the Hood"
        subtitle="Response parsing techniques, statistical methods, multi-model normalization, polling architecture, pre-publication simulation, and open-source implementations."
      />

      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          <KeyStat value="4" label="Parsing approaches in production" />
          <KeyStat value="15%" label="Accuracy variance at temp=0" />
          <KeyStat value="353" label="Unique prompts for 95% CI" />
          <KeyStat value="50x/day" label="Tryscope polling frequency" />
        </div>

        <Section title="1. Response Parsing Techniques">
          <Prose>
            <p>
              GEO tools must solve a core extraction problem: given an LLM&rsquo;s free-text response, identify
              which brands were mentioned, in what order, with what sentiment, and whether they were recommended
              or merely referenced. Four distinct approaches exist in production.
            </p>
          </Prose>

          <SubSection title="1.1 Simple String Matching">
            <Prose>
              <p>
                The most widely deployed approach: case-insensitive substring search. The Bright Data LLM
                Mentions Tracker implements this directly with <code>target_phrase.lower() in answer.lower()</code>.
                This produces a binary &ldquo;mentioned / not mentioned&rdquo; signal. Fast, deterministic,
                zero-cost beyond the API call, but cannot detect misspellings, abbreviations, or paraphrased
                references.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="1.2 Named Entity Recognition (NER) via spaCy">
            <Prose>
              <p>
                spaCy&rsquo;s pre-trained NER pipeline recognizes <code>ORG</code>, <code>PRODUCT</code>, and{" "}
                <code>PERSON</code> entities. The <code>spacy-llm</code> package integrates LLMs directly into
                spaCy pipelines for zero-shot NER without training data.
              </p>
              <p>
                <strong>Limitation:</strong> Pre-trained models often misclassify brand names as common words
                (e.g., &ldquo;Notion&rdquo; as a concept, not the product). Fine-tuning on LLM response corpora
                needed for production accuracy.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="1.3 LLM-as-Judge (Highest Accuracy)">
            <Prose>
              <p>
                Uses a second LLM call to parse the first LLM&rsquo;s response into structured data. Sellm
                extracts four sentiment dimensions: <strong>trustworthiness</strong> (0&ndash;1),{" "}
                <strong>authority</strong> (0&ndash;1), <strong>recommendation strength</strong> (0&ndash;1),
                and <strong>fit for query intent</strong> (0&ndash;1). LLM Pulse uses a 5-point sentiment
                scale with topic-level granularity (pricing, features, customer service, reliability).
              </p>
            </Prose>
          </SubSection>

          <SubSection title="1.4 Position / Ranking Extraction">
            <Prose>
              <p>
                Position matters: first-mentioned brands receive &ldquo;direct-answer language&rdquo; while
                later positions get &ldquo;other options include&rdquo; framing. Sellm extracts 1-indexed
                position ranking. Foundation Inc.&rsquo;s &ldquo;Generative Position&rdquo; metric calculates
                average position across responses &mdash; positions 1&ndash;2 indicate strong preferential
                treatment; position 4+ suggests weak positioning.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="1.5 Native Structured Output (2026 Best Practice)">
            <Prose>
              <p>
                Modern approach bypasses parsing entirely by requesting structured output from the LLM.
                OpenAI&rsquo;s <code>.parse()</code>, Gemini&rsquo;s <code>response_schema</code>, and
                Anthropic&rsquo;s tool use all support forcing output into a predefined schema, eliminating
                regex parsing entirely. Tooling (Pydantic for Python, Zod for TypeScript) has matured.
              </p>
            </Prose>
          </SubSection>
        </Section>

        <Section title="2. Statistical Methods for LLM Variance">
          <SubSection title="The Core Problem: Non-Deterministic Responses">
            <Callout type="warning">
              LLM responses are non-deterministic even at temperature=0. A study of 5 frontier models across
              10 identical runs found accuracy variations of up to <strong>15%</strong>, with worst case{" "}
              <strong>72% difference</strong> (Mixtral on college math). Total Agreement Rate for GPT-4o ranged
              from <strong>0% to 99.6%</strong> across tasks.
            </Callout>
            <Prose>
              <p>Sources of variance at temperature=0 include:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Hardware concurrency: batch-level non-determinism from parallel GPU operations</li>
                <li>Floating-point precision: FP16/BF16 rounding errors differ across hardware</li>
                <li>Backend changes: model updates, routing, load balancing</li>
                <li>Output length correlation: longer outputs show more instability</li>
              </ul>
            </Prose>
          </SubSection>

          <SubSection title="Sample Size Requirements">
            <Prose>
              <p>
                The Discovered Labs LLM Eval Calculator provides concrete guidance: at{" "}
                <strong>95% confidence, +/-2% margin, K=3 resamples per prompt</strong>:{" "}
                <strong>353 unique prompts, 1,059 total API calls</strong>. Tryscope runs every buyer query{" "}
                <strong>50 times/day</strong> across major AI models for statistical confidence.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="Core Statistical Formulas">
            <div className="bg-slate-50 rounded-lg p-4 my-4 font-mono text-sm space-y-2">
              <p><strong>Standard Error (Bernoulli):</strong> SE = sqrt(p * (1-p) / n)</p>
              <p><strong>95% Confidence Interval:</strong> CI = p +/- 1.96 * SE</p>
              <p><strong>Law of Total Variance:</strong> Total Var = Var(x)/n + E[sigma_i^2]/(n*K)</p>
            </div>
            <Callout type="info">
              CLT-based confidence intervals <strong>fail when n &lt; 100</strong> in LLM evaluation contexts,
              producing intervals that are &ldquo;too narrow and overly-confident.&rdquo; Clustered standard
              errors can increase SE by <strong>3x</strong> when questions within a topic cluster are correlated.
            </Callout>
          </SubSection>
        </Section>

        <Section title="3. Multi-Model Normalization">
          <Prose>
            <p>
              GEO tools must normalize results across models with fundamentally different architectures and
              behaviors. Key metrics that enable cross-model comparison:
            </p>
          </Prose>
          <DataTable
            headers={["Metric", "Description", "Used By"]}
            rows={[
              ["Share of Model (SoM)", "% of responses mentioning brand for a given query set", "Peec AI, Profound"],
              ["Position-Adjusted Word Count", "Word count weighted by position (earlier = more weight)", "GEO paper (KDD 2024)"],
              ["Generative Position", "Average position across responses (1 = best)", "Foundation Inc."],
              ["Citation Frequency", "Raw count of URL citations in responses", "Profound, Yext"],
              ["Sentiment Score", "Multi-dimensional sentiment (0-1 or 1-5 scale)", "Sellm, LLM Pulse"],
            ]}
          />
          <Prose>
            <p>
              Cross-platform overlap is remarkably low: only <strong>11% of domains</strong> are cited by both
              ChatGPT and Perplexity. Google AI Overviews and AI Mode cite the same URLs only{" "}
              <strong>13.7%</strong> of the time. This means per-model scoring is essential &mdash; a
              &ldquo;total GEO score&rdquo; across models would be misleading.
            </p>
          </Prose>
        </Section>

        <Section title="4. Polling Architecture">
          <SubSection title="Commercial Tool Approaches">
            <DataTable
              headers={["Tool", "Polling Method", "Scale"]}
              rows={[
                ["Tryscope (Scope)", "50 polls/day per query across 4 models", "Pre-publish simulation"],
                ["Profound", "Real-time capture from 10+ engines", "15M+ prompts/day, 400M+ conversations"],
                ["Evertune", "1M+ custom prompts per brand/month", "25M user behavior data"],
                ["Bright Data", "Headless browser → API endpoint scraping", "Open-source reference"],
                ["Sellm", "Direct API calls, structured output", "<$0.01/prompt, API-only"],
              ]}
            />
          </SubSection>

          <SubSection title="Perplexity&rsquo;s Native Citations">
            <Callout type="insight">
              Perplexity Sonar is unique: every response includes a <code>citations</code> field with URLs,
              making it the only API that natively shows which sources inform recommendations. This eliminates
              the need for parsing and makes it the easiest model to monitor for brand visibility.
            </Callout>
          </SubSection>
        </Section>

        <Section title="5. Pre-Publication Simulation">
          <Prose>
            <p>
              Tryscope (Scope) pioneered the concept of testing content <em>before</em> publishing. Their
              approach: simulate how ChatGPT, Claude, Gemini, and Perplexity would recommend a brand
              given proposed content changes. This uses persona-based simulation and polls 50x/day.
            </p>
            <p>
              The CORE paper (Jin et al., 2026) demonstrated that targeting the synthesis stage
              (rather than retrieval) achieves a <strong>91.4% promotion success rate @Top-5</strong> across
              GPT-4o, Gemini-2.5, Claude-4, and Grok-3 &mdash; validating that pre-publication optimization
              can meaningfully shift AI recommendations.
            </p>
          </Prose>
        </Section>

        <Section title="6. Open-Source Implementations">
          <DataTable
            headers={["Project", "Description", "Stack"]}
            rows={[
              ["Bright Data LLM Mentions Tracker", "Complete brand monitoring pipeline", "Python, Bright Data proxy"],
              ["spacy-llm", "LLM-powered NER in spaCy pipelines", "Python, spaCy"],
              ["GPTCache", "Semantic caching for LLM responses", "Python, Redis"],
              ["Discovered Labs Eval Calculator", "Statistical sample size calculator", "Web tool"],
            ]}
          />
        </Section>

        <Section title="7. Implications for Bitsy">
          <div className="space-y-4">
            <Callout type="insight">
              <strong>Architecture recommendation:</strong> Use LLM-as-Judge with structured output for parsing
              (highest accuracy). Implement tiered polling: cheap models (GPT-4.1-nano) for daily brand
              detection, expensive models (Sonnet, GPT-4o) for deep sentiment analysis only when changes detected.
              Leverage Perplexity&rsquo;s native citation format as the baseline truth source.
            </Callout>
            <Callout type="warning">
              <strong>Do NOT:</strong> Rely on single-shot queries (variance too high). Do not use simple string
              matching as the primary parser (misses paraphrased references). Do not aggregate a single &ldquo;GEO
              score&rdquo; across models &mdash; per-model scoring is essential given only 11% domain overlap.
            </Callout>
          </div>
        </Section>

        <SourceList
          sources={[
            { label: "Bright Data — Build an LLM Mentions Tracker (2025)", url: "https://brightdata.com/blog/ai/build-an-llm-mentions-tracker" },
            { label: "spaCy Documentation — NER", url: "https://spacy.io/" },
            { label: "explosion/spacy-llm — GitHub", url: "https://github.com/explosion/spacy-llm" },
            { label: "Sellm — Extract Brand Sentiment API", url: "https://sellm.io/post/extract-brand-sentiment-llm-api" },
            { label: "Foundation Inc. — GEO Metrics (2026)", url: "https://foundationinc.co/lab/geo-metrics" },
            { label: "LLM Response Variance Study (arXiv 2408.04667)", url: "https://arxiv.org/html/2408.04667v5" },
            { label: "Cameron Wolfe — Stats for LLM Evals", url: "https://cameronrwolfe.substack.com/p/stats-llm-evals" },
            { label: "Discovered Labs — LLM Eval Calculator", url: "https://discoveredlabs.com/tools/llm-eval-calculator" },
            { label: "Tryscope", url: "https://tryscope.app/" },
            { label: "CORE Paper — Controlling Output Rankings (2026)", url: "https://arxiv.org/html/2602.03608v1" },
            { label: "Vincent Schmalbach — Temperature 0 Determinism", url: "https://www.vincentschmalbach.com/does-temperature-0-guarantee-deterministic-llm-outputs/" },
            { label: "DEV Community — LLM Structured Output in 2026", url: "https://dev.to/pockit_tools/llm-structured-output-in-2026-stop-parsing-json-with-regex-and-do-it-right-34pk" },
          ]}
        />
      </div>
    </div>
  );
}
