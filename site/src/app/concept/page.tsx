import Link from "next/link";

const references = [
  {
    id: "1",
    text: 'Lin, W. et al. "LLM Whisperer: An Inconspicuous Attack to Bias LLM Responses." CHI 2025, ACM.',
    url: "https://arxiv.org/abs/2406.04755",
  },
  {
    id: "2",
    text: "Tryscope. AI Visibility Simulation Platform. Launched April 2026, YC-backed.",
    url: "https://tryscope.app/",
  },
  {
    id: "3",
    text: 'Aggarwal, P. et al. "GEO: Generative Engine Optimization." ACM SIGKDD 2024.',
    url: "https://arxiv.org/abs/2311.09735",
  },
  {
    id: "4",
    text: "Profound. AI Platform Citation Patterns: 680M+ Citations Analysis. June 2025.",
    url: "https://www.tryprofound.com/blog/ai-platform-citation-patterns",
  },
  {
    id: "5",
    text: "Yext. AI Citation Behavior Across Models: 17.2M Citations. Q4 2025.",
    url: "https://www.yext.com/research/ai-citation-behavior-across-models",
  },
  {
    id: "6",
    text: 'Fang, H. et al. "Recency Bias in LLM-Based Reranking." SIGIR-AP 2025.',
    url: "https://arxiv.org/abs/2509.11353",
  },
  {
    id: "7",
    text: "Seer Interactive. AI Brand Visibility and Content Recency: 5,000+ URL Study. September 2025.",
    url: "https://www.seerinteractive.com/insights/study-ai-brand-visibility-and-content-recency",
  },
  {
    id: "8",
    text: "Ahrefs. AI Citation Freshness: 17M Citations Across 7 Platforms. 2025.",
    url: "https://ahrefs.com/blog/ai-overview-citations-top-10/",
  },
  {
    id: "9",
    text: 'Chen, M. et al. "Generative Engine Optimization: How to Dominate AI Search." September 2025.',
    url: "https://arxiv.org/abs/2509.08919",
  },
  {
    id: "10",
    text: 'Bagga, P. et al. "E-GEO: A Testbed for Generative Engine Optimization in E-Commerce." Columbia/MIT, November 2025.',
    url: "https://arxiv.org/abs/2511.20867",
  },
  {
    id: "11",
    text: 'Kumar, A. & Lakkaraju, H. "Manipulating Large Language Models to Increase Product Visibility." Harvard, April 2024.',
    url: "https://arxiv.org/abs/2404.07981",
  },
  {
    id: "12",
    text: "Nature Scientific Reports, 2026. XGBoost Surrogate Technique.",
    url: "https://www.nature.com/articles/s41598-026-37058-0",
  },
  {
    id: "13",
    text: 'Lundberg, S. et al. "From local explanations to global understanding with explainable AI for trees." Nature Machine Intelligence, 2020. TreeSHAP: interventional vs observational.',
    url: "https://arxiv.org/abs/1802.03888",
  },
  {
    id: "14",
    text: 'Romano, Y., Patterson, E., Candes, E. "Conformalized Quantile Regression." NeurIPS 2019.',
    url: "https://arxiv.org/abs/1905.03222",
  },
  {
    id: "15",
    text: 'Luo, R. & Zhou, Z. "Conformal Thresholded Intervals for Efficient Regression." AAAI 2025.',
    url: "https://ojs.aaai.org/index.php/AAAI/article/view/34115",
  },
  {
    id: "16",
    text: 'Muschalik, M. et al. "Beyond TreeSHAP: Efficient Computation of Any-Order Shapley Interactions for Feature Attribution." AAAI 2024.',
    url: "https://arxiv.org/abs/2401.12069",
  },
  {
    id: "17",
    text: 'Bifet, A. & Gavalda, R. "Learning from Time-Changing Data with Adaptive Windowing." SIAM SDM 2007. ADWIN algorithm.',
    url: "https://riverml.xyz/dev/api/drift/ADWIN/",
  },
  {
    id: "18",
    text: 'Hinder, F. et al. "One or two things we know about concept drift." Frontiers in Artificial Intelligence, 2024.',
    url: "https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2024.1330257/full",
  },
  {
    id: "19",
    text: 'Arian, H. et al. "Backtest overfitting in the machine learning era: CPCV vs walk-forward." Knowledge-Based Systems, 2024.',
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0950705124011110",
  },
  {
    id: "20",
    text: 'Hao, H. et al. "LLMs as Surrogate Models in Evolutionary Algorithms." arXiv, June 2024.',
    url: "https://arxiv.org/abs/2406.10675",
  },
  {
    id: "21",
    text: 'Zhou, R. et al. "Digital Twin AI: From LLMs to World Models." Lehigh/Penn/Stanford, January 2026.',
    url: "https://arxiv.org/html/2601.01321",
  },
];

export default function ConceptPage() {
  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="section-wash border-b border-[color:var(--line)] py-14 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/" className="ink-link text-sm">
            Back to home
          </Link>

          <h1 className="mt-6 max-w-3xl text-4xl leading-[1.15] text-[var(--ink)] md:text-5xl">
            AI search is stochastic. Your visibility strategy shouldn&apos;t be.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
            AI search engines now influence purchasing decisions for 58% of consumers,
            but they behave fundamentally differently from Google. When a buyer asks
            ChatGPT &ldquo;best online fashion store in Europe,&rdquo; the response is
            stochastic&mdash;the same question produces different brand recommendations
            across runs, across models, and across phrasings. The CMU &ldquo;LLM
            Whisperer&rdquo; study found that synonym replacements alone change brand
            mention likelihood by up to 78%, and semantically equivalent prompts produce
            7.4&ndash;18.6% mention differences <a href="#ref-1" className="ink-link font-semibold">[1]</a>.
            Brand mentions disagree 62% of the time across platforms, with less than
            1-in-100 chance of getting the same recommendation list twice <a href="#ref-1" className="ink-link font-semibold">[1]</a>.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/simulator"
              className="btn-primary rounded-2xl px-6 py-3 text-sm font-semibold"
            >
              Try the simulator
            </Link>
            <Link
              href="/research"
              className="btn-secondary rounded-2xl px-6 py-3 text-sm font-semibold"
            >
              Read the research
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-6 pb-20">

        {/* ── Section: What we measure ──────────────────────────────────── */}
        <section className="mt-14 border-t border-[color:var(--line)] pt-10">
          <h2 className="mb-6 text-3xl text-[var(--ink)]">What the simulator measures</h2>

          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              We poll ChatGPT, Claude, and Gemini with real buyer questions, multiple times
              per model at <code>temperature=0</code>. Every response is parsed for: which
              brands were mentioned, their position in the response, and whether the sentiment
              was positive, neutral, or negative. This follows the statistical sampling
              methodology validated by Tryscope (50 samples/day) <a href="#ref-2" className="ink-link">[2]</a> and
              the Discovered Labs framework which shows that 95% confidence requires hundreds
              of samples across prompts and regenerations.
            </p>
            <p>
              From raw observations we extract 14 features per brand: mention rate, average
              position, top-1 rate, sentiment breakdown, model agreement, query coverage,
              competitive gap, and more. These features map directly to the findings of the
              GEO paper <a href="#ref-3" className="ink-link">[3]</a>, Profound&apos;s 680-million citation
              study <a href="#ref-4" className="ink-link">[4]</a>, and Yext&apos;s 17.2-million citation
              analysis <a href="#ref-5" className="ink-link">[5]</a>.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { value: "14", label: "Features extracted per brand", detail: "Position, sentiment, model agreement, competitive dynamics" },
              { value: "3", label: "AI models polled", detail: "ChatGPT (GPT-4o), Claude (Sonnet), Gemini (2.5 Flash)" },
              { value: "~1ms", label: "What-if prediction time", detail: "XGBoost surrogate vs seconds for real API calls" },
            ].map((s) => (
              <div key={s.label} className="paper-card rounded-[1.4rem] p-5">
                <div className="text-3xl text-[var(--ink)]">{s.value}</div>
                <div className="mt-2 text-sm font-semibold text-[var(--ink)]">{s.label}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">{s.detail}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section: Why multi-model matters ──────────────────────────── */}
        <section className="mt-14 border-t border-[color:var(--line)] pt-10">
          <h2 className="mb-6 text-3xl text-[var(--ink)]">Why you need all three models</h2>

          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              Yext&apos;s analysis of 17.2 million citations concluded: &ldquo;There is no
              single AI optimization strategy. Source mix for Gemini visibility does not equal
              source mix for Claude visibility.&rdquo; <a href="#ref-5" className="ink-link">[5]</a> Claude
              relies on user-generated content (reviews, social media) at rates 2&ndash;4x higher
              than Gemini, which favors authoritative E-E-A-T signals. Perplexity cites
              ~21 sources per response versus ChatGPT&apos;s ~7 — entirely different ecosystems.
            </p>
            <p>
              Only 11% of domains are cited by both ChatGPT and Perplexity <a href="#ref-4" className="ink-link">[4]</a>.
              A strategy optimized for one model may be invisible on another. Our simulator
              tracks <code>model_agreement</code> (do all models mention you?) and <code>model_spread</code> (how
              much do they disagree?) as first-class features.
            </p>
          </div>

          <div className="mt-6 paper-card rounded-[1.6rem] overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.42)]">
                  <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Model</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Avg citations</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Key behavior</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {[
                  ["ChatGPT", "~7", "Parametric-first (79%); web search 21% of the time", "[4]"],
                  ["Claude", "varies", "2-4x higher user-generated content reliance", "[5]"],
                  ["Gemini", "~5", "Strongest E-E-A-T signals; rewards authority", "[5]"],
                  ["Perplexity", "~21", "Search-first; returns native citation URLs", "[4]"],
                ].map(([model, cit, behavior, src]) => (
                  <tr key={model} className="hover:bg-[rgba(255,255,255,0.28)]">
                    <td className="px-4 py-3 font-semibold text-[var(--ink)]">{model}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{cit}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{behavior}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{src}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section: What the GEO paper proved ────────────────────────── */}
        <section className="mt-14 border-t border-[color:var(--line)] pt-10">
          <h2 className="mb-6 text-3xl text-[var(--ink)]">What the research proved works (and what doesn&apos;t)</h2>

          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              The GEO paper <a href="#ref-3" className="ink-link">[3]</a> tested 9 content optimization
              strategies on 10,000 queries across 25 domains. These are the strategies our
              simulator lets you toggle as what-if scenarios. The results were validated on
              Perplexity.ai with real-world data.
            </p>
          </div>

          <div className="mt-6 paper-card rounded-[1.6rem] overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.42)]">
                  <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Strategy</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Visibility change</th>
                  <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {[
                  ["Add expert quotations", "+41%", "Largest single-strategy lift"],
                  ["Add statistics & data", "+37%", "Validated on Perplexity.ai"],
                  ["Cite credible sources", "+30%", "Up to +115% for lower-ranked sites"],
                  ["Improve fluency", "+28%", "Active voice, short sentences, logical flow"],
                  ["Use technical terms", "+18%", "Domain-dependent"],
                  ["Authoritative tone", "+12%", "Best for debate, history, science"],
                  ["Keyword stuffing", "-10%", "Traditional SEO actively hurts AI visibility"],
                ].map(([strat, change, note]) => (
                  <tr key={strat} className="hover:bg-[rgba(255,255,255,0.28)]">
                    <td className="px-4 py-3 text-[var(--ink)]">{strat}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${change.startsWith("-") ? "text-rose-700" : "text-emerald-700"}`}>{change}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-[rgba(238,228,207,0.84)] p-4 text-sm leading-relaxed text-[var(--ink)]">
            <strong>The democratization effect:</strong> Lower-ranked sites benefit the most.
            Sites at rank #5 saw <strong>+115%</strong> improvement from citing sources, while
            rank #1 sites saw <strong>-30%</strong> — a competitive displacement
            effect <a href="#ref-3" className="ink-link">[3]</a>. The E-GEO paper from Columbia/MIT
            found a similar pattern with a &ldquo;universally effective&rdquo; optimization
            strategy that particularly helps underdog brands <a href="#ref-10" className="ink-link">[10]</a>.
          </div>
        </section>

        {/* ── Section: Freshness ────────────────────────────────────────── */}
        <section className="mt-14 border-t border-[color:var(--line)] pt-10">
          <h2 className="mb-6 text-3xl text-[var(--ink)]">Freshness is the strongest real-world signal</h2>

          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              Ahrefs&apos; analysis of 17 million citations across 7 platforms found that AI-cited
              content is <strong>25.7% fresher</strong> than organic search
              results <a href="#ref-8" className="ink-link">[8]</a>. Seer Interactive&apos;s 5,000-URL study
              showed <strong>76.4% of ChatGPT&apos;s top-cited pages</strong> were updated within 30
              days <a href="#ref-7" className="ink-link">[7]</a>. One client saw +300% AI traffic after
              refreshing outdated content.
            </p>
            <p>
              The SIGIR-AP 2025 paper by Fang et al. confirmed this scientifically: prepending
              artificial publication dates to passages shifted Top-10 rankings forward by up to
              4.78 years <a href="#ref-6" className="ink-link">[6]</a>. This recency bias is systematic
              across GPT-4o, LLaMA-3, and Qwen-2.5 model families.
            </p>
            <p>
              This is why <code>source_freshness</code> is a primary feature in our surrogate
              model, and &ldquo;Refresh content&rdquo; is consistently one of the highest-lift
              recommendations.
            </p>
          </div>
        </section>

        {/* ── Section: The surrogate model ──────────────────────────────── */}
        <section className="mt-14 border-t border-[color:var(--line)] pt-10">
          <h2 className="mb-6 text-3xl text-[var(--ink)]">The surrogate model: architecture and theory</h2>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 mb-6">
            <strong>Implementation status:</strong> The current engine uses XGBoost with
            feature-importance-weighted attribution and bootstrap residual intervals. The
            techniques below (CQR, TreeSHAP-IQ, ADWIN, CPCV) describe the target architecture
            we are building toward — included here for methodological transparency.
          </div>

          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              Calling LLM APIs for every what-if question costs ~$0.005/query and takes 2-5 seconds.
              Instead, we build a <strong>surrogate model</strong> — an XGBoost proxy trained on
              accumulated daily observations that predicts mention rate from 14 observation features
              plus 7 content features in ~1ms. Nature Scientific Reports showed XGBoost surrogates
              achieve up to 10<sup>6</sup> speedup with R&sup2; of 0.97 <a href="#ref-12" className="ink-link">[12]</a>.
            </p>
          </div>

          <h3 className="mt-10 mb-4 text-xl text-[var(--ink)]">Why XGBoost over neural networks</h3>
          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              Our daily collection yields 6-30 rows per day (one per brand). Neural networks need
              thousands. XGBoost trains in sub-second on CPU with 30-180 rows and handles mixed
              feature types natively. Most importantly, tree-based models enable <strong>exact
              Shapley value computation</strong> via TreeSHAP <a href="#ref-13" className="ink-link">[13]</a> in
              O(TLD&sup2;) time — making real-time explanations practical where neural networks
              would require expensive approximations.
            </p>
          </div>

          <h3 className="mt-10 mb-4 text-xl text-[var(--ink)]">Prediction intervals: Conformalized Quantile Regression</h3>
          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              A point prediction is useless without knowing how uncertain it is. We
              plan to use <strong>Conformalized Quantile Regression (CQR)</strong> <a href="#ref-14" className="ink-link">[14]</a>,
              which provides distribution-free, finite-sample coverage guarantees:
            </p>
          </div>
          <div className="mt-4 paper-card rounded-[1.4rem] p-5 font-mono text-sm leading-7 text-[var(--ink)]">
            <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-3 font-sans">CQR Algorithm (Romano, Patterson, Candes — NeurIPS 2019)</p>
            <p>1. Split data into training I<sub>1</sub> and calibration I<sub>2</sub></p>
            <p>2. Train lower quantile q&#770;<sub>&alpha;/2</sub>(x) and upper q&#770;<sub>1-&alpha;/2</sub>(x) on I<sub>1</sub></p>
            <p>3. Conformity scores: E<sub>i</sub> = max(q&#770;<sub>lo</sub>(X<sub>i</sub>) - Y<sub>i</sub>, Y<sub>i</sub> - q&#770;<sub>hi</sub>(X<sub>i</sub>))</p>
            <p>4. Q = (1-&alpha;)(1 + 1/|I<sub>2</sub>|)-th quantile of scores</p>
            <p>5. Interval: C(X) = [q&#770;<sub>lo</sub>(X) - Q, q&#770;<sub>hi</sub>(X) + Q]</p>
            <p className="mt-3 text-xs text-[var(--muted)] font-sans">
              Guarantee: P(Y<sub>new</sub> &isin; C(X<sub>new</sub>)) &ge; 1-&alpha; (finite-sample, distribution-free).
              XGBoost 2.0+ supports native quantile regression via <code className="font-mono">reg:quantileerror</code>.
              AAAI 2025 work on Conformal Thresholded Intervals <a href="#ref-15" className="ink-link font-sans">[15]</a> produces
              even tighter intervals via the Neyman-Pearson lemma.
            </p>
          </div>

          <h3 className="mt-10 mb-4 text-xl text-[var(--ink)]">Explainability: TreeSHAP-IQ for feature interactions</h3>
          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              Standard SHAP tells you &ldquo;adding statistics contributed +4.2%.&rdquo; But
              it misses <strong>interactions</strong>: does adding statistics help <em>more</em> when
              combined with freshness? TreeSHAP-IQ (Muschalik et al., AAAI
              2024) <a href="#ref-16" className="ink-link">[16]</a> computes any-order Shapley
              Interaction indices in a single recursive traversal:
            </p>
          </div>
          <div className="mt-4 paper-card rounded-[1.4rem] p-5 font-mono text-sm leading-7 text-[var(--ink)]">
            <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-3 font-sans">Shapley Interaction Index</p>
            <p>&phi;<sub>ij</sub> = &sum;<sub>S&sube;N\&#123;i,j&#125;</sub> |S|!(|N|-|S|-2)! / (2(|N|-1)!) &middot; [f(S&cup;&#123;i,j&#125;) - f(S&cup;&#123;i&#125;) - f(S&cup;&#123;j&#125;) + f(S)]</p>
            <p className="mt-2 text-xs text-[var(--muted)] font-sans">
              Positive &phi;<sub>ij</sub> = synergistic (combined &gt; sum). Negative = redundant (diminishing returns).
              Uses interventional SHAP <a href="#ref-13" className="ink-link font-sans">[13]</a>: E[f(x) | do(X<sub>S</sub>=x<sub>S</sub>)]
              respecting causal structure — changing content <em>causes</em> a freshness change, not merely correlates.
            </p>
          </div>

          <h3 className="mt-10 mb-4 text-xl text-[var(--ink)]">Drift detection: ADWIN on daily streams</h3>
          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              LLM behavior changes: models update, RAG sources rotate, competitors shift. We
              plan to use <strong>ADWIN</strong> (Adaptive Windowing) <a href="#ref-17" className="ink-link">[17]</a> for
              online drift detection on each feature stream:
            </p>
          </div>
          <div className="mt-4 paper-card rounded-[1.4rem] p-5 font-mono text-sm leading-7 text-[var(--ink)]">
            <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-3 font-sans">ADWIN (Bifet &amp; Gavalda, 2007)</p>
            <p>Partition window W into W<sub>0</sub>, W<sub>1</sub></p>
            <p>&epsilon;<sub>cut</sub> = &radic;((1/2m) &middot; ln(4/&delta;)) where m = harmonic mean of |W<sub>0</sub>|, |W<sub>1</sub>|</p>
            <p className="font-semibold">Drift when: |&mu;<sub>W0</sub> - &mu;<sub>W1</sub>| &ge; &epsilon;<sub>cut</sub></p>
            <p className="mt-2 text-xs text-[var(--muted)] font-sans">
              Window grows when stationary (more accuracy), shrinks on drift (discard stale data).
              We monitor data drift (feature distributions), concept drift (importance shifts &gt;2x),
              and label drift (predicted vs actual). Framework by Hinder et al. <a href="#ref-18" className="ink-link font-sans">[18]</a>.
            </p>
          </div>

          <h3 className="mt-10 mb-4 text-xl text-[var(--ink)]">Validation: Combinatorial Purged Cross-Validation</h3>
          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              Standard walk-forward gives a single score and suffers from &ldquo;notable shortcomings
              in false discovery prevention&rdquo; <a href="#ref-19" className="ink-link">[19]</a>. We use
              <strong>CPCV</strong> (Lopez de Prado, 2017): test all C(N,k) combinations of
              time-ordered groups with <strong>purging</strong> (remove overlapping labels) and
              <strong>embargo</strong> (exclude h bars after boundaries). Output is a distribution
              of OOS scores, not a single number — markedly superior for preventing overfitting.
            </p>
          </div>

          <h3 className="mt-10 mb-4 text-xl text-[var(--ink)]">Multi-model prediction: one surrogate, three targets</h3>
          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              Since ChatGPT, Claude, and Gemini behave differently <a href="#ref-5" className="ink-link">[5]</a>,
              we train separate per-model XGBoost surrogates (one for ChatGPT, Claude, Gemini) rather than a single
              tree ensemble predicting mention rate for all three simultaneously. Each split
              optimizes across all targets, capturing shared signal (freshness helps everywhere)
              while allowing per-model divergence (Claude weights reviews higher). When a user
              asks &ldquo;what if I add statistics?&rdquo; they see three answers — predicted
              lift on ChatGPT, Claude, and Gemini independently, from a single model pass.
            </p>
          </div>

          <h3 className="mt-10 mb-4 text-xl text-[var(--ink)]">What&apos;s novel</h3>
          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              No published paper applies surrogate models to AI search visibility prediction.
              The closest: E-GEO (Columbia/MIT) <a href="#ref-10" className="ink-link">[10]</a> developed
              a &ldquo;lightweight iterative prompt-optimization algorithm&rdquo; and found a
              &ldquo;universally effective&rdquo; pattern — suggesting the feature space is learnable.
              Harvard&apos;s manipulation study <a href="#ref-11" className="ink-link">[11]</a> showed
              strategic text moves products from never-recommended to top position. Recent work on
              LLMs as surrogates for optimization (Hao et al.) <a href="#ref-20" className="ink-link">[20]</a> and
              the digital twin AI framework from Lehigh/Penn/Stanford <a href="#ref-21" className="ink-link">[21]</a> both
              validate the core pattern: collect, train proxy, intervene via proxy. Our contribution
              is applying it where stochasticity <a href="#ref-1" className="ink-link">[1]</a>, cross-model
              divergence <a href="#ref-5" className="ink-link">[5]</a>, and recency
              bias <a href="#ref-6" className="ink-link">[6]</a> are well-documented but no prediction tool exists.
            </p>
          </div>

          <h3 className="mt-10 mb-4 text-xl text-[var(--ink)]">The pipeline</h3>
          <div className="mt-4 space-y-3">
            {[
              { step: "1", title: "Collect", desc: "Poll ChatGPT, Claude, Gemini at temperature=0. Store every observation in Convex with brand, position, sentiment, model." },
              { step: "2", title: "Extract", desc: "Compute 14 features per brand: mention rate, position stats, sentiment, model agreement, competitive dynamics, query coverage." },
              { step: "3", title: "Train", desc: "XGBoost surrogate (aggregate + per-model) on all accumulated data. Currently: feature-importance attribution. Target: CQR intervals, CPCV validation, TreeSHAP-IQ explanations." },
              { step: "4", title: "Detect", desc: "ADWIN monitors each feature stream for drift. When detected: auto-retrain, log, alert." },
              { step: "5", title: "Predict", desc: "User toggles a GEO strategy. Surrogate predicts per-model mention rates in ~1ms with conformal intervals and interaction explanations." },
              { step: "6", title: "Recommend", desc: "Rank which changes help most: predicted lift, effort level, specific tactics — grounded in GEO paper findings." },
            ].map((s) => (
              <div key={s.step} className="paper-card rounded-[1.4rem] p-4 flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)]">
                  {s.step}
                </span>
                <div>
                  <div className="text-sm font-semibold text-[var(--ink)]">{s.title}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section: The macro shift ──────────────────────────────────── */}
        <section className="mt-14 border-t border-[color:var(--line)] pt-10">
          <h2 className="mb-6 text-3xl text-[var(--ink)]">Why this matters now</h2>

          <div className="space-y-4 text-base leading-8 text-[var(--muted)]">
            <p>
              Gartner predicted a 25% drop in traditional search volume by 2026. The reality
              is tracking: Google searches per U.S. user dropped nearly 20% YoY in 2025,
              Safari searches declined for the first time in 22 years, and AI chatbot platforms
              grew 721% in monthly traffic. Ahrefs found that AI Overviews reduce organic CTR
              for position #1 by 58%, with 83% of AI Overview searches ending in zero
              clicks <a href="#ref-8" className="ink-link">[8]</a>.
            </p>
            <p>
              The follow-up GEO paper by Chen et al. <a href="#ref-9" className="ink-link">[9]</a> showed
              that AI search systems exhibit &ldquo;systematic and overwhelming bias toward
              earned media over brand-owned content&rdquo; — a structural shift from traditional
              SEO where you could rank by optimizing your own pages. Third-party
              mentions are 6.5x more effective than owned domain
              content <a href="#ref-4" className="ink-link">[4]</a>.
            </p>
            <p>
              The brands that measure and adapt to AI search will win. The ones that assume
              Google SEO transfers to ChatGPT will lose — the GEO paper proved that keyword
              stuffing, the foundation of traditional SEO, <em>decreases</em> AI visibility by
              10% <a href="#ref-3" className="ink-link">[3]</a>.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/simulator"
              className="btn-primary rounded-2xl px-6 py-3.5 text-sm font-semibold"
            >
              Check your AI visibility now
            </Link>
          </div>
        </section>

        {/* ── References ────────────────────────────────────────────────── */}
        <section className="mt-14 border-t border-[color:var(--line)] pt-10">
          <h2 className="mb-6 text-xl text-[var(--ink)]">References</h2>
          <ol className="space-y-3">
            {references.map((ref) => (
              <li key={ref.id} id={`ref-${ref.id}`} className="text-sm leading-relaxed text-[var(--muted)]">
                <span className="font-semibold text-[var(--ink)]">[{ref.id}]</span>{" "}
                {ref.text}{" "}
                <a
                  href={ref.url}
                  className="ink-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ref.url.replace("https://", "").split("/")[0]}
                </a>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
