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
            A digital twin of AI answer-engine behavior. We collect real brand/query/model
            samples into Convex, compress them into a 14-field daily state vector, and train
            an XGBoost surrogate so users can run instant what-if scenarios without re-polling
            APIs every time.
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
              <strong> lightweight machine learning model</strong> (XGBoost) that learns how
              13 daily observation features relate to <code>mention_rate</code>. The surrogate
              is retrained nightly on accumulated Convex rows and serves predictions in
              ~1ms&mdash;roughly 3,000x faster than a real API call, at near-zero marginal cost.
            </p>
            <p>
              This is the same pattern used in engineering digital twins: collect sensor
              data, train a fast proxy, then simulate scenarios against the proxy instead of
              the real system. In our case, the &ldquo;sensors&rdquo; are repeated LLM API samples
              and the &ldquo;proxy&rdquo; is an XGBoost model with SHAP-based explanations.
            </p>
          </Prose>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <KeyStat value="14" label="Daily fields persisted per brand (1 target + 13 predictors)" />
            <KeyStat value="~1ms" label="Prediction time per what-if scenario (vs. seconds for real API)" />
            <KeyStat value="2+" label="Repeated runs per model/query in the MVP collection loop" />
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
        <Section id="architecture" title="What the simulator does, step by step">
          <Prose>
            <p>
              The product flow is simple: collect raw LLM observations, compress them into a
              daily brand state, then let a fast surrogate score hypotheses against that state.
            </p>
          </Prose>

          <div className="mt-6 space-y-4">
            <div className="paper-card rounded-[1.6rem] p-5">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">1</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Step 1 &mdash; User inputs the market frame</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    The user provides four things: brand name, website URL, competitors, and
                    the buyer questions their customers would actually ask AI. That defines the
                    sampling universe for the run.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-5">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">2</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Step 2 &mdash; Poll real LLM APIs repeatedly</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    For every buyer question, call ChatGPT (<code>gpt-4o-mini</code>), Claude
                    (Sonnet), and Gemini (<code>2.5 Flash</code>) at <code>temperature=0</code>.
                    Run each query 2+ times per model and require structured JSON output so the
                    response can be parsed into mention, position, and sentiment fields.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-5">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">3</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Step 3 &mdash; Persist raw observations to Convex</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    Every observation is stored as a <code>brand x query x model x sample</code>
                    row with <code>mentioned</code>, <code>position</code>, and
                    <code>sentiment</code>. Each run becomes training data rather than throwaway
                    output, so the corpus compounds over time.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-5">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">4</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Step 4 &mdash; Engineer the daily brand state</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    Roll raw observations up into one daily row per brand. That row includes
                    <code>mention_rate</code> plus 13 explanatory features covering rank,
                    sentiment, competitor pressure, query coverage, and cross-model consistency.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-5">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">5</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Step 5 &mdash; Train the XGBoost digital twin</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    Retrain nightly on all accumulated Convex rows. The model predicts
                    <code>mention_rate</code> from the other 13 fields, uses walk-forward
                    validation to avoid look-ahead bias, and exposes SHAP values so the model
                    is explainable instead of opaque.
                  </p>
                </div>
              </div>
            </div>

            <div className="paper-card rounded-[1.6rem] p-5">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">6</span>
                <div>
                  <h3 className="text-lg text-[var(--ink)]">Step 6 &mdash; Simulate what-if scenarios</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    User-facing GEO tactics perturb the brand state and the surrogate returns an
                    instant forecast. This is the point of the product: users can test
                    hypotheses in milliseconds instead of paying for fresh API calls on every
                    scenario.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Callout type="info">
            <strong>Sampling discipline matters.</strong> Tryscope validated repeated daily
            polling as the practical benchmark, and Discovered Labs&apos; eval framework gives
            the statistical direction: 95% confidence at 2% margin requires roughly 353 unique
            prompts with <code>K=3</code> resamples. The MVP starts smaller, but the system is
            designed to accumulate toward that level of confidence over time.
          </Callout>
        </Section>

        {/* ── Feature Engineering ── */}
        <Section id="features" title="The 14 daily brand features">
          <Prose>
            <p>
              Every brand gets one row per day. <code>mention_rate</code> is the target the
              surrogate learns to predict; the other 13 fields describe rank, sentiment,
              competitive pressure, and model disagreement.
            </p>
          </Prose>

          <DataTable
            headers={["Feature", "What it captures", "Research basis"]}
            rows={[
              ["mention_rate", "% of responses mentioning the brand", "Core GEO metric; analogous to Share of Model"],
              ["avg_position", "Mean rank when the brand is mentioned", "Profound: rank #1 is cited far more than top-20 positions"],
              ["top1_rate", "% of mentions where the brand is ranked #1", "Winner-take-all recommendation behavior"],
              ["top3_rate", "% of mentions where the brand appears in the top 3", "Comparative listicle and shortlist behavior"],
              ["positive_rate", "% positive sentiment across mentions", "Onely: sentiment and reviews matter materially in recommendations"],
              ["negative_rate", "% negative sentiment across mentions", "EMNLP 2025 recommendation-bias work"],
              ["net_sentiment", "(positive - negative) / total", "Sellm-style structured extraction"],
              ["competitor_avg_rate", "Mean mention rate of all other tracked brands", "Computed against every other tracked brand, not just named competitors"],
              ["vs_best_competitor", "Our rate divided by the best competitor", "Only a few brands fit in each answer"],
              ["model_agreement", "min(model_rates) / max(model_rates)", "Yext: no single AI optimization strategy"],
              ["model_spread", "Range between best and worst model rates", "Claude/Gemini source preference divergence"],
              ["query_coverage", "% of buyer questions where the brand appears", "Profound: fan-out queries drive a large share of citations"],
              ["share_of_mentions", "Brand mentions divided by total tracked-brand mentions in the sample set", "Different denominator from mention_rate: one response can contribute multiple tracked-brand mentions"],
              ["brands_ahead", "Count of competitors with a higher mention rate", "Competitive displacement tracking"],
            ]}
          />

          <Callout type="info">
            This daily row is what persists to Convex and becomes the training corpus. Every
            new collection run adds another brand-day example the surrogate can learn from.
          </Callout>
        </Section>

        {/* ── What-If Engine ── */}
        <Section id="whatif" title="How scenario simulation works">
          <Prose>
            <p>
              What-if simulation sits one layer above the observational model. Users choose a
              GEO tactic, Bitsy encodes it into controllable feature changes, and the surrogate
              estimates how the next daily brand state should move.
            </p>
          </Prose>

          <SubSection title="Step 1: Pick the user-facing tactic">
            <Prose>
              <p>
                The first release should expose only research-backed levers: add statistics,
                add expert quotations, cite credible sources, refresh content, improve fluency,
                and get third-party mentions.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="Step 2: Translate tactics into feature changes">
            <Prose>
              <p>
                Each tactic maps to an upstream control variable such as
                <code>statistics_density</code>, <code>quotation_count</code>,
                <code>citation_count</code>, <code>source_freshness</code>,
                <code>fluency_score</code>, or <code>third_party_count</code>. Those controls
                are the layer a marketer can actually change.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="Step 3: Score the scenario with XGBoost + SHAP">
            <Prose>
              <p>
                The updated state runs through the surrogate (~1ms). Bitsy returns predicted
                <code>mention_rate</code>, confidence bounds, and SHAP-style explanations of
                which levers drove the lift. That is the product advantage over pure monitoring:
                not just what happened, but what is likely to change next.
              </p>
            </Prose>
          </SubSection>

          <Callout type="insight">
            <strong>Model boundary:</strong> the stored daily state is observational. The
            strategy encoder should perturb controllable content signals, then translate those
            into the observation space the surrogate is trained on. That keeps the model honest
            about what it knows and what the user can control.
          </Callout>
        </Section>

        {/* ── GEO Optimization Strategies ── */}
        <Section id="geo-strategies" title="The first strategy toggles">
          <Prose>
            <p>
              The first release should expose only tactics with quantified external evidence,
              not generic SEO lore or intuition.
            </p>
          </Prose>

          <DataTable
            headers={["Strategy", "Feature change", "Evidence"]}
            rows={[
              ["Add statistics and data", "statistics_density", "GEO paper: +37% visibility"],
              ["Add expert quotations", "quotation_count", "GEO paper: +41% visibility"],
              ["Cite credible sources", "citation_count", "GEO paper: +30%, up to +115% for lower-ranked sites"],
              ["Refresh content", "source_freshness", "Seer: 76.4% of top-cited pages updated within 30 days; Ahrefs: AI-cited pages are 25.7% fresher"],
              ["Improve fluency", "fluency_score", "GEO paper: +28% visibility"],
              ["Get third-party mentions", "third_party_count", "Profound: 6.5x more effective than owned content; 85% of mentions come from third parties"],
            ]}
          />

          <Callout type="info">
            These are user-facing levers. Internally they should change the observation features
            the surrogate actually trains on, rather than bypassing the model contract.
          </Callout>
        </Section>

        {/* ── Multi-Model Behavior ── */}
        <Section id="multimodel" title="Cross-model disagreement is a feature">
          <Prose>
            <p>
              We do not average models away. The daily state explicitly captures how much
              ChatGPT, Claude, and Gemini disagree via <code>model_agreement</code> and
              <code>model_spread</code>.
            </p>
          </Prose>

          <DataTable
            headers={["Model", "Sampling role", "Observed behavior", "Why it matters"]}
            rows={[
              ["ChatGPT (GPT-4o-mini)", "Baseline high-volume polling model", "Short recommendation lists; winner-take-all outcomes", "Drives mention_rate, top1_rate, and top3_rate sensitivity"],
              ["Claude (Sonnet)", "Contrastive second model", "Stronger third-party preference and different source mix", "Prevents optimizing only for ChatGPT behavior"],
              ["Gemini (2.5 Flash)", "Authority-sensitive comparison model", "Responds differently to structure and authority signals", "Feeds model_agreement and model_spread directly"],
            ]}
          />

          <Callout type="info">
            Yext&apos;s analysis of 17.2M citations concluded: &ldquo;No single AI optimization
            strategy. Source mix for Gemini visibility does not equal source mix for Claude
            visibility.&rdquo; That is why disagreement between models is itself a predictor,
            not noise to discard.
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
              ["API collection (buyer queries x 3 models x 2+ samples)", "Variable", "This is the main marginal cost; simulation itself does not hit APIs"],
              ["Model training (daily XGBoost refit)", "~$0.01", "CPU-only, sub-second training on daily batch"],
              ["Inference (per what-if query)", "~$0.00001", "~1ms XGBoost prediction, negligible compute"],
              ["Infrastructure (DB, compute, storage)", "~$1-2", "Convex + lightweight compute"],
              ["Total per brand", "Low single digits at MVP scale", "Direct polling stays bounded because scenarios are served locally"],
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
              ["Post-hoc monitoring (poll -> dashboard)", "Profound, Peec, Otterly, 30+ others", "Tells you what happened, not why or what to do next"],
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
                    Build the LLM API client for OpenAI, Anthropic, and Google. Run each buyer
                    query 2+ times per model with structured JSON output, store every
                    <code>brand x query x model x sample</code> observation in Convex, and
                    surface raw mention rate, position, and sentiment in a baseline dashboard.
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
                    Build the 14-field daily brand state, where <code>mention_rate</code> is
                    the target and the other 13 fields feed the surrogate. Train the first
                    XGBoost model with walk-forward validation, compute SHAP values, and set up
                    nightly retraining on all accumulated Convex data.
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
                    Build the strategy encoder that maps research-backed GEO tactics to
                    controllable feature changes. Add scenario prediction, confidence bounds,
                    SHAP decomposition, and drift detection (data, concept, label) with
                    automated alerts and retraining triggers.
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
                    Expand query coverage, add more model providers when needed, and harden
                    multi-tenant isolation. Optimize costs with caching and batching, then
                    scale the daily training corpus to 100+ brands.
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    <strong>Output:</strong> Production-grade simulator with validated predictions
                    and low per-brand marginal cost.
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
