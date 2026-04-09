import Link from "next/link";
import {
  Section,
  SubSection,
  Prose,
  Callout,
  KeyStat,
  DataTable,
  Quote,
} from "@/components/ResearchPage";

export default function SimulatorPage() {
  return (
    <div>
      {/* Header */}
      <div className="section-wash border-b border-[color:var(--line)] py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <Link href="/" className="ink-link mb-4 inline-block text-sm">
            Back to home
          </Link>
          <span className="mb-3 inline-flex rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.48)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Product spec
          </span>
          <h1 className="max-w-4xl text-4xl leading-tight text-[var(--ink)] md:text-5xl">
            The Bitsy Simulator: what we need to build and why.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
            A digital twin of AI search behavior. Instead of querying LLMs every time a
            user wants to test a hypothesis, we train a lightweight surrogate model on real
            daily observations and let users run instant what-if scenarios against it.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 pb-20">

        {/* ── The Problem ── */}
        <Section id="problem" title="The problem we are solving">
          <Prose>
            <p>
              AI search engines (ChatGPT, Claude, Gemini, Perplexity) now influence buying
              decisions for 58% of consumers. But the way they recommend brands is
              fundamentally different from traditional search&mdash;and fundamentally harder
              to optimize for.
            </p>
          </Prose>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KeyStat value="62%" label="Brand mentions disagree across platforms (CMU LLM Whisperer)" />
            <KeyStat value="<1 in 100" label="Chance of getting the same recommendation list twice" />
            <KeyStat value="40-60%" label="Cited sources change month-to-month" />
            <KeyStat value="3-4" label="Average brands cited per ChatGPT response (vs. 13 for Perplexity)" />
          </div>

          <SubSection title="Three core difficulties">
            <Prose>
              <p>
                <strong>1. Stochasticity.</strong> LLMs are non-deterministic. Even at temperature=0,
                you can see up to 15% accuracy variation across runs due to hardware concurrency,
                floating-point precision, and backend changes. Synonym replacements in prompts
                increase brand mention likelihood by up to 78%. You cannot test once and trust
                the result.
              </p>
              <p>
                <strong>2. Cost at scale.</strong> Each real API call costs money. Testing 10 brands
                across 5 queries, 4 models, and 5 samples daily = 18,000 queries/month. At GPT-4o
                rates that is $95/month just for polling&mdash;before any analysis. And most tools
                charge $0.66&ndash;$9.98 per prompt on top of that.
              </p>
              <p>
                <strong>3. Opacity.</strong> When your visibility drops, existing tools tell you
                <em>that</em> it dropped but not <em>why</em>. The #1 complaint across GEO tool
                reviews is &ldquo;monitoring without action.&rdquo; 10 of 11 tested tools missed
                factual errors entirely.
              </p>
            </Prose>
          </SubSection>

          <Callout type="insight">
            <strong>The market gap:</strong> Pre-publish simulation is almost nonexistent.
            Only one competitor (Tryscope, launched April 3 2026, YC-backed) offers any form of
            it&mdash;and they do not appear to use a surrogate model approach. Everyone else
            monitors <em>after</em> the fact. Bitsy should let you test <em>before</em> you publish.
          </Callout>
        </Section>

        {/* ── The Approach ── */}
        <Section id="approach" title="Our approach: the surrogate model">
          <Prose>
            <p>
              Instead of calling LLM APIs for every what-if question, we build a
              <strong> lightweight machine learning model</strong> (XGBoost) that learns the
              relationship between content features and AI mention behavior. This surrogate
              model is trained daily on real observations and serves predictions in ~1ms&mdash;roughly
              3,000x faster than a real API call, at near-zero marginal cost.
            </p>
            <p>
              This is the same pattern used in engineering digital twins: collect sensor
              data, train a fast proxy, then simulate scenarios against the proxy instead of
              the real system. In our case, the &ldquo;sensors&rdquo; are daily LLM API samples
              and the &ldquo;proxy&rdquo; is an XGBoost model with SHAP-based explanations.
            </p>
          </Prose>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <KeyStat value="$0.30" label="Daily API cost per brand for training data (50 samples across 4 models)" />
            <KeyStat value="~1ms" label="Prediction time per what-if scenario (vs. seconds for real API)" />
            <KeyStat value="R2 > 0.85" label="Target surrogate model accuracy (validated with walk-forward)" />
          </div>

          <Quote
            text="Surrogate models achieve prediction in 0.02 seconds&mdash;1 million times faster than the original simulation for well-defined tasks, with R-squared values of 0.97."
            source="Nature Scientific Reports, 2026 &mdash; on XGBoost surrogate techniques"
          />

          <SubSection title="Why XGBoost, not a neural network">
            <Prose>
              <p>
                XGBoost wins on every dimension that matters for this use case:
              </p>
            </Prose>
            <DataTable
              headers={["Criterion", "XGBoost", "Neural network"]}
              rows={[
                ["Training speed", "Seconds on daily batch", "Minutes to hours"],
                ["Interpretability", "Native SHAP support (exact values)", "Black box or approximate SHAP"],
                ["Data requirements", "Works with 30-100 daily observations", "Needs thousands+"],
                ["Mixed feature types", "Handles numeric + categorical natively", "Requires encoding"],
                ["Prediction latency", "~1ms", "~10-50ms (GPU) or more"],
                ["Debugging", "Inspect individual trees", "Weight matrices are opaque"],
              ]}
            />
          </SubSection>
        </Section>

        {/* ── The Architecture ── */}
        <Section id="architecture" title="Four-layer architecture">
          <Prose>
            <p>
              The simulator is structured as four layers, each with a clear responsibility.
              This follows the standard digital twin pattern adapted for LLM monitoring.
            </p>
          </Prose>

          <div className="mt-6 space-y-4">
            <div className="paper-card rounded-[1.6rem] p-5">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">1</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Device layer &mdash; Real LLM APIs</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    OpenAI GPT-4o, Anthropic Claude Sonnet, Google Gemini 2.5, and Perplexity
                    Sonar. These are the &ldquo;real world&rdquo; we observe. We poll them with
                    temperature=0 for maximum reproducibility and structured output for reliable
                    parsing. Perplexity uniquely returns a <code>citations</code> array with
                    source URLs, making it the closest API equivalent to a consumer search
                    experience.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-5">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">2</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Collection layer &mdash; Daily sampling</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    50 samples per brand per day across 4+ models. Each sample records: which brands
                    were mentioned, their position in the response, sentiment (positive/neutral/negative),
                    whether the mention came from parametric knowledge or RAG retrieval, and which
                    sources were cited. At temperature=0, 3-5 samples per query are sufficient for
                    90-95% consistency. The statistical foundation: SE = sqrt(p(1-p)/n), with 95%
                    confidence intervals.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-5">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">3</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Proxy layer &mdash; Surrogate model</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    XGBoost model retrained nightly on accumulated observations. Takes 40-60
                    engineered features as input and predicts mention probability, expected position,
                    and sentiment distribution. Validated with walk-forward cross-validation (no
                    look-ahead bias). SHAP values computed for every prediction to explain <em>why</em>
                    the model expects a particular outcome. Includes drift detection (z-score on
                    features, feature importance shifts) to know when the model is going stale.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-5">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">4</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Application layer &mdash; What-if dashboard</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    The user-facing simulator. Users modify content features (add statistics,
                    improve freshness, add third-party citations) and instantly see predicted
                    impact on mention rate, position, and sentiment&mdash;with confidence
                    intervals and SHAP-based explanations of which changes drove the prediction.
                    This is where Bitsy differs from every other tool: predictions happen in
                    milliseconds, not minutes, and come with causal explanations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Feature Engineering ── */}
        <Section id="features" title="The 40-60 engineered features">
          <Prose>
            <p>
              The surrogate model does not see raw text. It sees structured signals extracted
              from both the daily observations and the content being analyzed. These features
              are grouped into six categories, informed by the empirical citation studies we
              reviewed (Profound 680M citations, Yext 17.2M citations, Ahrefs 17M, Seer 5K URLs).
            </p>
          </Prose>

          <DataTable
            headers={["Category", "Example features", "Evidence basis"]}
            rows={[
              [
                "Time-series",
                "Mention rate (lag-1, 7d avg, 30d avg), volatility, trend direction",
                "Daily polling data; detects momentum shifts before they become visible",
              ],
              [
                "Competitor",
                "Top-3 competitor avg mention rate, our-vs-best ratio, competitor gaining flag",
                "Only 3-4 brands cited per ChatGPT response; displacement is zero-sum",
              ],
              [
                "Content quality",
                "Source freshness (months), high-authority source count, statistics density, quotation count, content length (chars)",
                "GEO paper: +41% from quotations, +37% from statistics; Ahrefs: 76.4% of top-cited pages updated within 30 days",
              ],
              [
                "Query characteristics",
                "Informational vs. transactional %, average query length, semantic diversity",
                "Profound: 1/3 of citations from fan-out queries with zero traditional search volume",
              ],
              [
                "Mechanism",
                "Parametric vs. RAG %, training cutoff proximity, web-search trigger rate",
                "ChatGPT uses parametric knowledge 79% of the time; RAG mentions are immediate but volatile",
              ],
              [
                "Seasonality",
                "Day of week, weekend flag, seasonal index, recency-freshness interaction",
                "Ahrefs: newer content cited first; 65% of crawler hits target content <1 year old",
              ],
            ]}
          />

          <Callout type="info">
            Content features map directly to the GEO paper&apos;s optimization strategies.
            Each what-if toggle in the UI (&ldquo;What if I add statistics?&rdquo;) translates
            to a feature perturbation the surrogate model can evaluate instantly.
          </Callout>
        </Section>

        {/* ── What-If Engine ── */}
        <Section id="whatif" title="What the what-if engine does">
          <Prose>
            <p>
              The what-if engine is the core product interaction. A user asks: &ldquo;What
              would happen to my mention rate if I refreshed my product page, added third-party
              reviews, and included comparison statistics?&rdquo; The engine answers in three steps:
            </p>
          </Prose>

          <SubSection title="Step 1: Encode the scenario">
            <Prose>
              <p>
                The user&apos;s hypothetical changes are translated into feature perturbations.
                &ldquo;Refresh content&rdquo; maps to decreasing <code>source_freshness_months</code>.
                &ldquo;Add statistics&rdquo; maps to increasing <code>statistics_density</code>.
                &ldquo;Get third-party reviews&rdquo; maps to increasing <code>high_authority_source_count</code>.
                The base case is the current feature vector from the latest daily observation.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="Step 2: Predict with uncertainty">
            <Prose>
              <p>
                The perturbed feature vector runs through the XGBoost surrogate (~1ms). To
                quantify uncertainty, we use bootstrap ensemble prediction: train multiple
                models on resampled data and report the spread. The output is a predicted
                mention rate with 95% confidence interval, expected position shift, and
                sentiment change for each AI model independently.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="Step 3: Explain with SHAP">
            <Prose>
              <p>
                SHAP (SHapley Additive exPlanations) decomposes the prediction into per-feature
                contributions. The user sees: &ldquo;Adding statistics contributed +4.2% to
                predicted mention rate; refreshing content contributed +2.8%; third-party
                reviews contributed +1.5%.&rdquo; This is the causal story that no monitoring
                tool provides today.
              </p>
              <p>
                We also run sensitivity analysis: for each feature in the scenario, sweep
                across a range of values to show diminishing returns. &ldquo;You get most of
                the freshness benefit within the first 30 days; refreshing again after 7 days
                has minimal incremental lift.&rdquo;
              </p>
            </Prose>
          </SubSection>

          <Callout type="insight">
            <strong>Validation loop:</strong> Every what-if prediction is compared to actual
            outcomes the following week. If the model predicted a +5% mention rate from
            adding statistics, we check whether brands that actually added statistics saw
            that lift. This continuous backtesting is how the surrogate stays honest.
          </Callout>
        </Section>

        {/* ── GEO Optimization Strategies ── */}
        <Section id="geo-strategies" title="The optimization strategies users can simulate">
          <Prose>
            <p>
              The GEO paper (Princeton/Georgia Tech, ACM SIGKDD 2024) tested 9 content
              optimization strategies on 10,000 queries. These become the primary what-if
              levers in the simulator. Combined with empirical citation research, they form
              the feature perturbation menu.
            </p>
          </Prose>

          <DataTable
            headers={["Strategy", "Measured lift", "Maps to feature"]}
            rows={[
              ["Add quotations from authoritative sources", "+41% visibility", "quotation_count, source_authority_score"],
              ["Add relevant statistics and data points", "+37% visibility", "statistics_density, fact_density"],
              ["Cite credible sources inline", "+30% (up to +115% for lower-ranked sites)", "citation_count, source_diversity"],
              ["Improve fluency and readability", "+28% visibility", "fluency_score, readability_grade"],
              ["Use authoritative tone", "+variable by domain", "authoritative_language_score"],
              ["Refresh content (recency)", "+300% AI traffic in case study", "source_freshness_months"],
              ["Increase content length to 5-10K chars", "10.18 vs 2.39 citations", "content_length_chars"],
              ["Get third-party mentions", "6.5x more effective than owned", "third_party_mention_count"],
              ["Keyword stuffing", "-10% (negative)", "keyword_density (inverse signal)"],
            ]}
          />

          <Callout type="warning">
            <strong>Keyword stuffing actively hurts.</strong> This is the biggest divergence from
            traditional SEO. The GEO paper showed a -6% to -10% effect. Traditional SEO keyword
            optimization does not transfer to AI search. The simulator should clearly flag this.
          </Callout>
        </Section>

        {/* ── Multi-Model Behavior ── */}
        <Section id="multimodel" title="Per-model behavior differences">
          <Prose>
            <p>
              A critical design decision: the simulator must produce per-model predictions,
              not a single aggregate. Research shows wildly divergent citation behavior across
              platforms. A strategy that works for Gemini may fail for Claude.
            </p>
          </Prose>

          <DataTable
            headers={["Model", "Avg citations/response", "Key behavior", "Source control range"]}
            rows={[
              ["ChatGPT (GPT-4o)", "3.5", "Parametric-first (79%); triggers web search only 21% of the time", "Varies by sector"],
              ["Claude (Sonnet)", "4", "2-4x higher Limited Control sources; strong third-party preference", "6.3-24.4% Full Control"],
              ["Gemini 2.5 Pro", "5", "Strongest E-E-A-T signals; rewards authority and structure", "22.4-54.0% Full Control"],
              ["Perplexity Sonar", "13", "Search-first; most consistent across sectors; returns citation URLs", "37-50% Full Control"],
            ]}
          />

          <Callout type="info">
            Yext&apos;s analysis of 17.2M citations concluded: &ldquo;No single AI optimization
            strategy. Source mix for Gemini visibility does not equal source mix for Claude
            visibility.&rdquo; This is why we train separate model heads or separate surrogates
            per LLM provider.
          </Callout>
        </Section>

        {/* ── Drift Detection ── */}
        <Section id="drift" title="Drift detection: knowing when the model is wrong">
          <Prose>
            <p>
              LLM behavior changes over time. Models get updated, RAG sources rotate, and
              competitive landscapes shift. The simulator must detect when its predictions
              are going stale. We monitor three types of drift:
            </p>
          </Prose>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="paper-card rounded-[1.6rem] p-5">
              <h4 className="text-sm font-semibold text-[var(--ink)]">Data drift</h4>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Input feature distributions shift. Detected via z-score monitoring (alert when
                &gt;2 standard deviations from trailing average). Example: a model update changes
                how often it triggers web search.
              </p>
            </div>
            <div className="paper-card rounded-[1.6rem] p-5">
              <h4 className="text-sm font-semibold text-[var(--ink)]">Concept drift</h4>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                The relationship between features and outcomes changes. Detected via feature
                importance shifts (&gt;2x or &lt;0.5x change). Example: freshness suddenly matters
                less after a model retraining.
              </p>
            </div>
            <div className="paper-card rounded-[1.6rem] p-5">
              <h4 className="text-sm font-semibold text-[var(--ink)]">Label drift</h4>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Output distribution changes. Detected by comparing predicted vs. actual mention
                rates on a rolling basis. Triggers automatic model retraining when prediction
                error exceeds threshold.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Economics ── */}
        <Section id="economics" title="Cost structure">
          <Prose>
            <p>
              The surrogate model approach has radically different economics from direct API
              polling. The expensive part (collecting training data) is amortized across all
              simulations. Individual what-if queries cost essentially nothing.
            </p>
          </Prose>

          <DataTable
            headers={["Cost component", "Per brand / month", "Notes"]}
            rows={[
              ["API collection (50 samples/day, 4 models)", "$9.00", "Using tiered strategy: 90% nano/Flash-Lite, 10% GPT-4o/Sonnet"],
              ["Model training (daily XGBoost refit)", "~$0.01", "CPU-only, sub-second training on daily batch"],
              ["Inference (per what-if query)", "~$0.00001", "~1ms XGBoost prediction, negligible compute"],
              ["Infrastructure (DB, compute, storage)", "~$1.50", "PostgreSQL + lightweight compute"],
              ["Total per brand", "~$10.50", "vs. $199/month SaaS price = 94.7% gross margin"],
            ]}
          />

          <Callout type="insight">
            <strong>The margin insight:</strong> GEO SaaS achieves 80-91% gross margins&mdash;higher
            than typical AI SaaS (25-60%)&mdash;because polling queries are short (100 input, 500
            output tokens), highly cacheable, batchable (50% discount), and work with cheap models.
            The surrogate model makes margins even better by replacing most real API calls with
            instant local predictions.
          </Callout>
        </Section>

        {/* ── Competitive Position ── */}
        <Section id="competition" title="How this compares to existing tools">
          <Prose>
            <p>
              We catalogued 40+ GEO/LLMO tools across 8 tiers (see research note 2.4).
              The critical finding: pre-publish simulation is a near-empty category.
            </p>
          </Prose>

          <DataTable
            headers={["Approach", "Who does it", "Limitation"]}
            rows={[
              ["Post-hoc monitoring (poll → dashboard)", "Profound, Peec, Otterly, 30+ others", "Tells you what happened, not why or what to do next"],
              ["Content scoring (static analysis)", "Frase, Writesonic, Scrunch", "No simulation; just scores current state against heuristics"],
              ["Pre-publish RAG simulation", "Tryscope (only)", "Direct API calls each time; no surrogate; enterprise-only pricing"],
              [
                "Surrogate model + SHAP what-if",
                <span key="bitsy" className="font-semibold text-[var(--ink)]">Bitsy (our approach)</span>,
                "Requires daily data collection before simulation works; cold-start delay",
              ],
            ]}
          />

          <Quote
            text="Far too many tools, not enough users."
            source="Lily Ray, SEO industry analyst, on the crowded GEO monitoring space"
          />

          <Prose>
            <p>
              The crowded space is <em>monitoring</em>. The empty space is
              <em> simulation</em>&mdash;especially with explainability. That is where we build.
            </p>
          </Prose>
        </Section>

        {/* ── What to Build ── */}
        <Section id="build" title="What we build, in order">
          <Prose>
            <p>
              The simulator is built in four phases. Each phase produces a usable product
              increment, not just infrastructure.
            </p>
          </Prose>

          <div className="mt-6 space-y-4">
            <div className="paper-card rounded-[1.6rem] p-6">
              <div className="flex items-start gap-4">
                <span className="surface-chip px-2.5 py-0.5 text-xs font-bold">Phase 1</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Data collection + baseline dashboard</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    Build the LLM API client (unified interface to OpenAI, Anthropic, Google,
                    Perplexity). Set up the collection scheduler (5 queries x 4 models x 3
                    samples = 60 calls/day per brand). Store results in PostgreSQL with the
                    daily aggregation pipeline. Surface raw mention rates and citation counts
                    in a simple dashboard. This gives us training data and a monitoring baseline.
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    <strong>Output:</strong> Working data pipeline. Users see daily mention rate,
                    position, and sentiment by model.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-6">
              <div className="flex items-start gap-4">
                <span className="surface-chip px-2.5 py-0.5 text-xs font-bold">Phase 2</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Feature engineering + surrogate model</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    Build the feature extraction pipeline (40-60 features across 6 categories).
                    Train the first XGBoost surrogate with walk-forward validation. Compute
                    SHAP values for global feature importance. Set up nightly retraining via
                    batch job. Add model versioning with rollback capability.
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    <strong>Output:</strong> Trained surrogate model. Users see feature importance
                    rankings and model accuracy metrics.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-6">
              <div className="flex items-start gap-4">
                <span className="surface-chip px-2.5 py-0.5 text-xs font-bold">Phase 3</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">What-if simulator + drift detection</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    Build the what-if engine: scenario encoding, bootstrap prediction with
                    uncertainty bounds, SHAP decomposition, and sensitivity analysis. Add drift
                    detection (data, concept, label) with automated alerts and retraining triggers.
                    Build the simulation UI with toggleable GEO strategies mapped to feature
                    perturbations.
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    <strong>Output:</strong> Full what-if simulator. Users ask &ldquo;what if I
                    add statistics?&rdquo; and see predicted lift with explanations.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-6">
              <div className="flex items-start gap-4">
                <span className="surface-chip px-2.5 py-0.5 text-xs font-bold">Phase 4</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Validation + scale</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    Implement the weekly backtesting loop (compare predictions to actuals).
                    Add fan-out query detection (1/3 of citations come from zero-search-volume
                    decomposed queries). Multi-tenant isolation. Cost optimization (batch API,
                    prompt caching, semantic response caching). Scale to 100+ brands with
                    tiered model strategy.
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    <strong>Output:</strong> Production-grade simulator with validated predictions
                    and sub-$200/month cost per 100 brands.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── What NOT to Build ── */}
        <Section id="antipatterns" title="What we explicitly do not build">
          <Prose>
            <p>
              Equally important as what we build is what we avoid. These are traps the
              research identified.
            </p>
          </Prose>

          <div className="mt-4 space-y-3">
            {[
              {
                rule: "Do not position as a \"GEO\" tool",
                reason: "Google's John Mueller and Lily Ray flagged the term as a scam signal. Use \"AI visibility\" or \"AI search simulator\" instead.",
              },
              {
                rule: "Do not promise schema markup optimization",
                reason: "No evidence supports it. ChatGPT FAQ schema actually had fewer citations (3.6 vs 4.2 without). A 1,000-domain audit found zero LLM bots visiting llms.txt.",
              },
              {
                rule: "Do not use browser scraping for production",
                reason: "ToS violations, fragile (DOM changes break it), slow, hard to scale. API polling with structured output is the right path.",
              },
              {
                rule: "Do not use flagship models for polling",
                reason: "GPT-4.1-nano at $0.0002/query gives sufficient signal for monitoring. GPT-4o at $0.0053 is 26x more expensive with marginal benefit for detection tasks.",
              },
              {
                rule: "Do not build a full SEO platform",
                reason: "Cannot compete with Ahrefs (26.7B keywords) or Semrush ($112M quarterly revenue). Stay focused on what-if simulation.",
              },
              {
                rule: "Do not use prompt-based pricing",
                reason: "Every GEO tool that uses per-prompt pricing draws user complaints. Price by brand count or flat tiers.",
              },
            ].map((item) => (
              <div key={item.rule} className="paper-card rounded-[1.4rem] px-5 py-4">
                <p className="text-sm font-semibold text-[var(--ink)]">{item.rule}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{item.reason}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Key Research Backing ── */}
        <Section id="evidence" title="The evidence base">
          <Prose>
            <p>
              Every design decision above is grounded in specific research. Here are the
              primary sources the simulator architecture draws from.
            </p>
          </Prose>

          <DataTable
            headers={["Source", "Dataset / scope", "Key finding for Bitsy"]}
            rows={[
              ["GEO paper (Princeton, KDD 2024)", "10,000 queries, 9 strategies", "Quotations +41%, Statistics +37%, Keyword stuffing -10%"],
              ["Profound citation analysis", "680M+ citations, 7 sectors", "Top 30 domains = 67% of citations; 85% of retrieved pages never cited"],
              ["Yext source control study", "17.2M citations, 4 models", "No single optimization strategy works across all models"],
              ["Ahrefs freshness study", "17M citations, 7 platforms", "AI-cited content is 25.7% fresher than organic results"],
              ["Seer Interactive URL analysis", "5,000+ URLs", "76.4% of top-cited pages updated within 30 days"],
              ["CMU LLM Whisperer", "Multi-platform comparison", "62% brand mention disagreement; <1/100 same list twice"],
              ["Brandlight citations vs. Google", "AI vs organic comparison", "90% of ChatGPT citations from pages outside Google top-20"],
              ["E-GEO (e-commerce testbed)", "15 rewriting heuristics", "Meta-optimization improved rankings +0.68 to +1.61 positions"],
              ["EMNLP 2025 cognitive biases", "LLM recommendation study", "Social proof boosts; scarcity/exclusivity reduces visibility"],
            ]}
          />

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/research" className="btn-secondary rounded-2xl px-5 py-3 text-sm font-semibold">
              Read the full research notes
            </Link>
            <Link href="/simulate" className="btn-primary rounded-2xl px-5 py-3 text-sm font-semibold">
              Try the current prototype
            </Link>
          </div>
        </Section>

      </div>
    </div>
  );
}
