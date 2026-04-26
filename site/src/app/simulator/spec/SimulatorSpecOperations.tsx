import Link from "next/link";
import { Section, Prose, Callout, DataTable, Quote } from "@/components/ResearchPage";

export function SimulatorSpecOperations() {
  return (
    <>
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
              ["Model training (XGBoost refit)", "~$0.01", "CPU-only, sub-second training when collection or retraining runs"],
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
                "Surrogate model + attribution what-if",
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
                    XGBoost model with walk-forward validation when enough dates exist, compute
                    feature-importance attribution, and refit on accumulated Convex data.
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
                    controllable feature changes. Add scenario prediction, residual bounds,
                    importance-weighted attribution, and drift detection (data, concept, label) with
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
    </>
  );
}
