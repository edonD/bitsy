import {
  PageHeader,
  Section,
  SubSection,
  KeyStat,
  DataTable,
  Callout,
  SourceList,
  Prose,
  Quote,
} from "@/components/ResearchPage";

export const metadata = {
  title: "How LLMs Decide What to Mention — Bitsy Research",
};

export default function LLMMechanicsPage() {
  return (
    <div>
      <PageHeader
        task="2.1"
        title="How LLMs Decide What to Mention"
        subtitle="Training data pipelines, RLHF, parametric vs. RAG knowledge, frequency effects, recency bias, structured data, and the signals that drive brand recommendations."
      />

      <div className="max-w-4xl mx-auto px-6 pb-16">
        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          <KeyStat value="80%+" label="GPT-3 tokens from CommonCrawl" />
          <KeyStat value="41%" label="Signal from authoritative lists" />
          <KeyStat value="79%" label="Parametric (not web search)" />
          <KeyStat value="3x" label="Recency boost (<14 days)" />
        </div>

        <Section title="1. Training Data Pipelines">
          <SubSection title="The CommonCrawl-to-LLM Pipeline">
            <Prose>
              <p>
                Every major LLM starts with CommonCrawl, the largest open web corpus. GPT-3 derived{" "}
                <strong>over 80% of its training tokens</strong> from CommonCrawl; LLaMA allocated{" "}
                <strong>67%</strong> to CommonCrawl and <strong>4.5%</strong> to Wikipedia. At least{" "}
                <strong>64% of 47 LLMs reviewed (2019&ndash;2023)</strong> used at least one filtered version of CommonCrawl.
              </p>
              <p>
                The CCNet pipeline processes raw web data through five stages: data sourcing from CommonCrawl
                (a single snapshot is 8.7 TiB compressed), paragraph-level deduplication using SHA1 hashing
                (~70% removed), language identification via FastText, quality filtering against Wikipedia
                perplexity scores, and reference content filtering.
              </p>
              <p>
                NVIDIA&rsquo;s Nemotron-CC pipeline processes the full CommonCrawl English dataset of{" "}
                <strong>6.3 trillion tokens</strong> into <strong>2 trillion high-quality tokens</strong>{" "}
                using 28 distinct heuristic filters. Training with Nemotron-CC data boosted MMLU scores by{" "}
                <strong>5.6 points</strong> over baseline (59.0 vs. 53.4).
              </p>
            </Prose>
          </SubSection>

          <SubSection title="RLHF: How Human Feedback Shapes Recommendations">
            <Prose>
              <p>
                After pre-training, models are fine-tuned via Reinforcement Learning from Human Feedback (RLHF)
                in three stages: preference dataset creation (human annotators rate outputs pairwise), reward
                model training, and RL fine-tuning using PPO.
              </p>
              <p>
                RLHF doesn&rsquo;t create explicit brand preferences but shapes models toward outputs human
                raters consider helpful and safe. Models <strong>avoid recommending controversial brands</strong>{" "}
                due to safety filters. &ldquo;Digital consensus&rdquo; matters: when multiple authoritative
                sources agree on a brand&rsquo;s category position, RLHF-trained models adopt this as reliable
                information.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="Licensed Data Deals">
            <DataTable
              headers={["Deal", "Value", "Date"]}
              rows={[
                ["Google ↔ Reddit", "$60M/year", "Feb 2024"],
                ["OpenAI ↔ Reddit", "~$70M/year", "May 2024"],
                ["Reddit total licensing", "$203M+", "As of Feb 2024 IPO"],
              ]}
            />
            <Prose>
              <p>
                Reddit is the <strong>most-cited domain by Google AI Overviews and Perplexity</strong>, and the{" "}
                <strong>second most-cited by ChatGPT</strong>. Google algorithm updates (Aug 2023&ndash;Apr 2024)
                nearly tripled Reddit&rsquo;s readership from 132M to 346M monthly visitors.
              </p>
            </Prose>
          </SubSection>
        </Section>

        <Section title="2. Parametric Knowledge vs. RAG">
          <Callout type="insight">
            <strong>The Dual System:</strong> ChatGPT defaults to parametric knowledge (baked into weights)
            for <strong>~79% of prompts</strong>, triggering web search only <strong>21% of the time</strong>{" "}
            (primarily for commercial/local intent). However, <strong>46% of ChatGPT interactions</strong> now
            use integrated search.
          </Callout>
          <Prose>
            <p>This creates two optimization timelines:</p>
          </Prose>
          <DataTable
            headers={["Mechanism", "Timeline", "Volatility"]}
            rows={[
              ["Training data (parametric)", "18–36 month investment", "Durable once encoded"],
              ["RAG (real-time search)", "Immediate", "Can appear/disappear day to day"],
            ]}
          />
          <SubSection title="Frequency Drives Memorization">
            <Prose>
              <p>
                Research from Wang et al. (ICLR 2025) found that factual QA showed the{" "}
                <strong>strongest memorization effect</strong>, increasing alongside model scaling. Pre-training
                data frequency directly correlates with output probability distributions.
              </p>
              <p>
                Brands frequently mentioned in high-quality content before the training cutoff become part of
                the model&rsquo;s neural weights and get mentioned <strong>automatically, without web search</strong>.
                When models cannot confidently retrieve lesser-known brands, they{" "}
                <strong>substitute competitors with higher probabilistic weight</strong> &mdash; the
                &ldquo;substitution effect.&rdquo;
              </p>
            </Prose>
          </SubSection>
        </Section>

        <Section title="3. The Primary Recommendation Signals">
          <DataTable
            headers={["Signal", "Weight"]}
            rows={[
              [<strong key="s1">Authoritative list mentions (&ldquo;Best of&rdquo; lists, expert roundups)</strong>, <strong key="w1">41%</strong>],
              ["Awards and accreditations", "18%"],
              ["Online reviews (aggregated sentiment)", "16%"],
              ["Traditional SEO signals (backlinks, DA, keywords)", "~0%"],
            ]}
          />
          <Callout type="warning">
            <strong>Critical finding from Onely (Dec 2025):</strong> &ldquo;Traditional SEO signals &mdash;
            backlinks, domain authority, keyword optimization &mdash; have near-zero influence on AI
            recommendations.&rdquo;
          </Callout>
          <Prose>
            <p>
              Only <strong>3&ndash;4 brands are cited per ChatGPT response</strong> (vs. 13 for Perplexity,
              ~8 for AI Overviews), creating winner-take-all dynamics. <strong>26% of brands have zero AI
              visibility</strong>. The top 50 brands capture <strong>28.9% of all mentions</strong>.
            </p>
          </Prose>
        </Section>

        <Section title="4. Role of Recency">
          <SubSection title="Knowledge Cutoff Dates">
            <DataTable
              headers={["Model", "Knowledge Cutoff", "Web Access"]}
              rows={[
                ["GPT-5.4 (ChatGPT)", "August 31, 2025", "Yes (Bing)"],
                ["Claude 4.6 Opus", "~May 2025 (reliable)", "No"],
                ["Gemini 3.1 Pro", "January 2025", "Yes (Google)"],
                ["Perplexity Online", "Real-time", "Always"],
                ["Llama 4 (Meta)", "August 2024", "No"],
                ["DeepSeek R1", "October 2023", "No"],
              ]}
            />
          </SubSection>

          <SubSection title="Quantified Recency Bias">
            <Prose>
              <p>
                An ACM SIGIR 2025 study found that &ldquo;fresh&rdquo; passages shift the Top-10&rsquo;s mean
                publication year forward by <strong>up to 4.78 years</strong>. Individual items moved by as many
                as <strong>95 ranks</strong> in reranking experiments.
              </p>
            </Prose>
            <DataTable
              headers={["Content Age", "Share of AI Bot Hits"]}
              rows={[
                [<strong key="a1">&lt;1 year</strong>, <strong key="h1">65%</strong>],
                ["<2 years", "79%"],
                ["<3 years", "89%"],
                ["<5 years", "94%"],
                ["6+ years", "6%"],
              ]}
            />
            <Callout type="insight">
              Brands with content updated within <strong>14 days</strong> appeared in recommendations roughly{" "}
              <strong>3x more often</strong> than brands with identical authority but stale content.
            </Callout>
          </SubSection>
        </Section>

        <Section title="5. Role of Frequency">
          <Quote
            text="A brand mentioned 10,000 times in low-authority blogs may score below one mentioned 200 times in peer-reviewed publications and established industry reports."
            source="MetricsRule"
          />
          <DataTable
            headers={["Metric", "Finding", "Source"]}
            rows={[
              ["Brands < 50 high-trust mentions", "Fail AI recognition 72% of the time", "MetricsRule"],
              ["\"Best of\" roundup inclusion", "400% more likely to be recommended", "MetricsRule"],
              ["Third-party vs. owned", "6.5x more effective from third parties", "MetricsRule"],
              ["Third-party share", "85% of brand mentions from third-party pages", "AirOps"],
              ["Comparative listicles", "32.5% of all AI citations", "Digital Bloom"],
              ["Multi-platform presence (4+)", "2.8x more likely to appear", "Digital Bloom"],
            ]}
          />
        </Section>

        <Section title="6. Structured Data: Schema.org, JSON-LD, FAQ Pages">
          <Callout type="info">
            <strong>The nuanced finding:</strong> Schema markup improves the{" "}
            <strong>quality and accuracy</strong> of LLM responses about your entity but does{" "}
            <strong>not independently increase citation frequency</strong>. The high correlation (81% of cited
            pages have schema) is likely confounded &mdash; well-maintained sites implement both schema and
            high-quality content.
          </Callout>
          <Prose>
            <p>
              Search Atlas analyzed 748,425 queries and found &ldquo;schema markup does not influence LLM
              citation frequency.&rdquo; However, controlled experiments show schema improves response quality:
              in a GetAISO experiment, the schema version scored <strong>8.6/10 vs. 6.6/10</strong> (30%
              improvement). GPT-4 goes from <strong>16% to 54% correct responses</strong> when content relies
              on structured data.
            </p>
            <p>
              Only <strong>12.4% of registered domains</strong> currently implement Schema.org &mdash; a massive
              opportunity gap for accurate representation, if not frequency.
            </p>
          </Prose>
        </Section>

        <Section title="7. Cross-Platform Fragmentation">
          <DataTable
            headers={["Platform", "Key Behavior"]}
            rows={[
              ["ChatGPT", "47.9% of citations from Wikipedia; 2.37 brands/response avg; 68% market share"],
              ["Perplexity", "46.7% Reddit citations; real-time search every query; 5-10 inline citations"],
              ["Google AI Overviews", "93.67% cite top-10 organic; 6.02 brands/response; 2B+ monthly users"],
              ["Claude", "Hedges with \"options include\"; cross-references 3+ sources before surfacing"],
            ]}
          />
          <Prose>
            <p>
              Brand visibility varies <strong>wildly</strong> across models: Ariel detergent has ~24% Share of
              Model on Llama but &lt;1% on Gemini. Brand mentions <strong>disagreed 62% of the time</strong>{" "}
              across platforms. Only <strong>11% of domains</strong> are cited by both ChatGPT AND Perplexity.
            </p>
          </Prose>
          <Quote
            text="Unlike search engines displaying less-popular brands on later pages, AI models are merciless. If your brand doesn't register with an LLM, it simply won't appear at all."
            source="INSEAD / HBR"
          />
        </Section>

        <Section title="8. Comprehensive Signal Ranking">
          <DataTable
            headers={["Signal", "Evidence", "Strength"]}
            rows={[
              ["Authoritative list mentions", "41% of ChatGPT signal", "Very High"],
              ["Brand search volume", "0.334 correlation", "Very High"],
              ["Third-party mentions", "6.5x more effective; 85% of mentions", "Very High"],
              ["Statistics in content", "+37–41% visibility boost (GEO paper)", "High"],
              ["Quotations from credible sources", "+22–41% visibility boost", "High"],
              ["Content freshness (<1 year)", "65% of AI hits; 3x for 14-day", "High"],
              ["Reviews (4+ stars)", "5.3x more recommendations", "High"],
              ["Wikipedia presence", "7.8–47.9% of citations", "High"],
              ["Reddit presence", "46.7% of Perplexity citations", "High"],
              ["Schema markup", "Improves accuracy, not frequency", "Medium"],
              ["Domain Rank", "0.25 correlation", "Medium"],
              ["Backlinks (traditional)", "Weak/neutral correlation", "Low"],
              [<span key="ks" className="text-red-600">Keyword stuffing</span>, <span key="ksi" className="text-red-600">-10% negative impact</span>, <span key="kss" className="text-red-600 font-medium">Harmful</span>],
            ]}
          />
        </Section>

        <Section title="9. Implications for Bitsy">
          <div className="space-y-4">
            <Callout type="insight">
              <strong>Build:</strong> Multi-model polling is non-negotiable (62% cross-platform disagreement).
              Statistical sampling with 50+ samples/day. Track parametric vs. RAG mentions separately. Freshness
              scoring and third-party monitoring (&gt; owned content monitoring).
            </Callout>
            <Callout type="warning">
              <strong>Do NOT build:</strong> A keyword-stuffing optimizer (proven -10% impact). Do not promise
              deterministic results (&lt;1-in-100 chance of same list twice). Do not treat all models as
              interchangeable. Do not rely on backlink metrics.
            </Callout>
          </div>
        </Section>

        <SourceList
          sources={[
            { label: "Wikimedia Foundation — Wikipedia's Value in the Age of Generative AI (July 2023)", url: "https://wikimediafoundation.org/news/2023/07/12/wikipedias-value-in-the-age-of-generative-ai/" },
            { label: "Springer Nature — LLM Training Data Analysis (2025)", url: "https://link.springer.com/article/10.1007/s00146-025-02199-9" },
            { label: "NVIDIA Developer Blog — Nemotron-CC Pipeline (2024)", url: "https://developer.nvidia.com/blog/building-nemotron-cc-a-high-quality-trillion-token-dataset-for-llm-pretraining-from-common-crawl-using-nvidia-nemo-curator/" },
            { label: "Onely — How ChatGPT Decides Which Brands to Recommend (Dec 2025)", url: "https://www.onely.com/blog/how-chatgpt-decides-which-brands-to-recommend/" },
            { label: "Wang et al. — Generalization vs. Memorization (ICLR 2025)", url: "https://arxiv.org/abs/2407.14985" },
            { label: "ACM SIGIR 2025 — Do LLMs Favor Recent Content?", url: "https://arxiv.org/abs/2509.11353" },
            { label: "Seer Interactive — AI Brand Visibility and Content Recency", url: "https://www.seerinteractive.com/insights/study-ai-brand-visibility-and-content-recency" },
            { label: "Search Atlas — Schema Markup and AI Search", url: "https://searchatlas.com/blog/limits-of-schema-markup-for-ai-search/" },
            { label: "MetricsRule — Is Your Brand AI-Trainable?", url: "https://www.metricsrule.com/research/is-your-brand-ai-trainable-how-llms-decide-which-businesses-to-trust/" },
            { label: "Digital Bloom — 2025 AI Citation & LLM Visibility Report", url: "https://thedigitalbloom.com/learn/2025-ai-citation-llm-visibility-report/" },
            { label: "a16z — GEO Over SEO (May 2025)", url: "https://a16z.com/geo-over-seo/" },
            { label: "INSEAD — Meet the Model: Marketing to LLMs", url: "https://knowledge.insead.edu/marketing/meet-model-how-market-llms-and-sell-humans" },
            { label: "PageOnePower — How LLMs Choose Brands", url: "https://www.pageonepower.com/linkarati/how-do-llms-choose-which-brands-to-mention-in-results" },
          ]}
        />
      </div>
    </div>
  );
}
