import {
  Section,
  SubSection,
  Prose,
  Callout,
  KeyStat,
  DataTable,
  Quote,
} from "@/components/ResearchPage";

export function SimulatorSpecCore() {
  return (
    <>
        <Section id="problem" title="The problem we are solving">
          <Prose>
            <p>
              AI search engines (ChatGPT, Claude, Gemini) now influence buying
              decisions for 58% of consumers. But the way they recommend brands is
              fundamentally different from traditional search&mdash;and fundamentally harder
              to optimize for.
            </p>
          </Prose>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KeyStat value="62%" label="Brand mentions disagree across platforms (CMU LLM Whisperer)" />
            <KeyStat value="<1 in 100" label="Chance of getting the same recommendation list twice" />
            <KeyStat value="40-60%" label="Cited sources change month-to-month" />
            <KeyStat value="3-5" label="Average brands cited per response across ChatGPT, Claude, and Gemini" />
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
              13 observation features relate to <code>mention_rate</code>. The surrogate
              retrains when collection or retraining is run, then serves predictions in
              ~1ms&mdash;roughly 3,000x faster than a real API call, at near-zero marginal cost.
            </p>
            <p>
              This is the same pattern used in engineering digital twins: collect sensor
              data, train a fast proxy, then simulate scenarios against the proxy instead of
              the real system. In our case, the &ldquo;sensors&rdquo; are repeated LLM API samples
              and the &ldquo;proxy&rdquo; is an XGBoost model with feature-importance attribution.
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
                ["Interpretability", "Tree feature importance today; TreeSHAP planned", "Black box or approximate attribution"],
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
                    Refit on all accumulated Convex rows when collection or retraining runs. The model predicts
                    <code>mention_rate</code> from the other 13 fields, uses walk-forward
                    validation when enough dates exist, and exposes feature importance so the model
                    is inspectable instead of opaque.
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

          <SubSection title="Step 3: Score the scenario with XGBoost">
            <Prose>
              <p>
                The updated state runs through the surrogate (~1ms). Bitsy returns predicted
                <code>mention_rate</code>, residual bounds, and importance-weighted feature-change
                attribution. That is the product advantage over pure monitoring:
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
    </>
  );
}
