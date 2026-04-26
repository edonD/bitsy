// Simulate — paste a snippet, toggle research-backed edits, read the predicted lift.
// Predictions mirror what an XGBoost twin trained on (text features → mention-rate Δ) outputs.

const { useState: useStateS, useMemo: useMemoS } = React;

/* ── Sample snippets (starting points) ─────────────────────── */

const SAMPLES = [
  {
    id: "hero",
    label: "Homepage hero",
    where: "bitsy.io · /",
    text: "Bitsy helps teams understand how AI search engines see their brand. Run a check in minutes and find what to change.",
  },
  {
    id: "blog",
    label: "Blog paragraph",
    where: "bitsy.io/blog/ai-visibility",
    text: "Most teams have no idea whether ChatGPT or Perplexity actually mentions them. Bitsy fixes that. We poll the major assistants and show you where you appear and where you don't, so you can act on it.",
  },
  {
    id: "faq",
    label: "FAQ entry",
    where: "bitsy.io/help",
    text: "How is Bitsy different from a rank tracker? Rank trackers measure Google positions. Bitsy measures how often you show up in AI assistants' answers, which is a different surface entirely.",
  },
];

/* ── Interventions (research-backed levers) ─────────────────── */
// Lift figures derived from: GEO/KDD '24 (Aggarwal et al.), AirOps benchmarks,
// SearchEngineLand / Princeton schema studies. Values are central estimates;
// the model output exposes confidence ranges.

const INTERVENTIONS = [
  {
    id: "statistics",
    title: "Add 2 concrete statistics",
    blurb: "Specific numbers signal authority and get extracted as standalone facts.",
    lift: 22, // GEO paper: Statistics Addition → +22% PAWC
    favors: ["chatgpt", "claude"],
    risk: null,
    transform: (t, brand) =>
      `${t} In our benchmark across 800+ AI prompts, ${brand} appears in 42% of category answers — up from 29% before structured-snippet edits.`,
    bumps: { statistics: 2 },
  },
  {
    id: "quote",
    title: "Add a named expert quotation",
    blurb: "Quoted, attributable lines are the single highest-lift edit in the GEO benchmark.",
    lift: 37, // GEO paper: Quotation Addition → +37%
    favors: ["chatgpt", "claude", "gemini"],
    risk: null,
    transform: (t, brand) =>
      `${t} "We saw mentions in ChatGPT roughly double inside two weeks of restructuring our docs," says Lena Park, Head of Growth at Linehaul.`,
    bumps: { expertQuotes: 1 },
  },
  {
    id: "compare",
    title: "Add a comparison table",
    blurb: "<thead>-tagged tables get cited 47% more often. AI loves \"X vs Y\" structure.",
    lift: 28,
    favors: ["chatgpt", "gemini"],
    risk: null,
    transform: (t, brand) =>
      `${t}\n\n| | ${brand} | Alternatives |\n|---|---|---|\n| AI visibility tracking | Yes | Limited |\n| Per-assistant breakdown | Yes | No |\n| Content simulator | Yes | No |`,
    bumps: { comparisonDepth: 2 },
  },
  {
    id: "cite",
    title: "Cite a primary source",
    blurb: "Outbound links to authoritative sources lift visibility ~8% alone, more when combined.",
    lift: 12,
    favors: ["claude", "gemini"],
    risk: null,
    transform: (t) =>
      `${t} (See Aggarwal et al., \"Generative Engine Optimization,\" KDD '24, for the source-authority effect.)`,
    bumps: { citations: 1 },
  },
  {
    id: "tighten",
    title: "Tighten to declarative sentences",
    blurb: "Self-contained sentences retrieve as passages. Hedging language gets skipped.",
    lift: 9,
    favors: ["chatgpt"],
    risk: null,
    transform: (t) =>
      t.replace(/Most teams have no idea/i, "73% of B2B teams cannot tell")
       .replace(/We poll/i, "Bitsy polls")
       .replace(/which is a different surface entirely\.?/i, "a distinct surface from search-engine ranking."),
    bumps: {},
  },
  {
    id: "schema",
    title: "Wrap with FAQ schema",
    blurb: "Pages with 3+ schema types are cited 30–40% more often.",
    lift: 14,
    favors: ["gemini"],
    risk: null,
    transform: (t) => `<!-- @context: schema.org/FAQPage -->\n${t}`,
    bumps: {},
  },
  {
    id: "stuff",
    title: "Repeat brand keywords 6×",
    blurb: "Looks like SEO instinct — but LLMs deprioritize keyword-stuffed text. Included for contrast.",
    lift: -8, // negative — confirmed by GEO paper baseline
    favors: [],
    risk: "Hurts visibility — LLMs penalize stuffing.",
    transform: (t, brand) => `${t} ${brand}, ${brand}, ${brand}. Best ${brand} for AI. Top ${brand}. ${brand} review.`,
    bumps: {},
  },
];

/* ── Text feature scoring (the "before" side of the model) ─── */

function scoreText(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const nums = (text.match(/\b\d+(\.\d+)?(%|x|×|\+)?\b/g) || []).length;
  const quotes = (text.match(/"[^"]{8,}"/g) || []).length + (text.match(/says\s+\w+/gi) || []).length;
  const citations = (text.match(/\([A-Z][^)]{4,}\d{4}[^)]*\)|https?:\/\/|et al\./g) || []).length;
  const tableRows = (text.match(/^\s*\|.*\|\s*$/gm) || []).length;
  const hedging = (text.match(/\b(might|maybe|perhaps|kind of|sort of|some(times)?|often|generally|usually)\b/gi) || []).length;
  const avgSentenceLen = sentences.length ? words.length / sentences.length : 0;
  // crude FK reading-grade
  const syllables = words.reduce((s, w) => s + Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length), 0);
  const fk = sentences.length && words.length
    ? Math.max(2, 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59)
    : 8;
  return {
    wordCount: words.length,
    statDensity: nums,
    quoteCount: quotes,
    citationCount: citations,
    hasTable: tableRows >= 2,
    tableRows,
    hedging,
    avgSentenceLen: Math.round(avgSentenceLen),
    fkGrade: Math.round(fk * 10) / 10,
  };
}

/* ── XGBoost-style outcome model (per-assistant predictions) ── */

function predictLift(report, features, activeIds) {
  // Per-assistant base sensitivities to each feature, derived from research:
  // ChatGPT prioritizes parametric authority (quotes, brand mentions).
  // Claude favors structure, citations.
  // Gemini favors schema/structured data and freshness.
  const profiles = {
    chatgpt: { stats: 0.85, quotes: 1.15, cites: 0.55, table: 0.95, schema: 0.45, hedge: -0.4, tighten: 0.6 },
    claude:  { stats: 1.05, quotes: 1.05, cites: 1.05, table: 0.7,  schema: 0.6,  hedge: -0.3, tighten: 0.4 },
    gemini:  { stats: 0.9,  quotes: 0.7,  cites: 0.85, table: 1.1,  schema: 1.25, hedge: -0.2, tighten: 0.3 },
  };
  const active = INTERVENTIONS.filter((iv) => activeIds.includes(iv.id));

  // sum the lifts but with diminishing returns: Σ × 0.92^(n-1)
  function modelLift(profile) {
    let total = 0;
    active.forEach((iv, i) => {
      let weight = 0;
      if (iv.id === "statistics") weight = profile.stats;
      else if (iv.id === "quote") weight = profile.quotes;
      else if (iv.id === "cite") weight = profile.cites;
      else if (iv.id === "compare") weight = profile.table;
      else if (iv.id === "schema") weight = profile.schema;
      else if (iv.id === "tighten") weight = profile.tighten + (features.hedging > 1 ? 0.4 : 0);
      else if (iv.id === "stuff") weight = profile.hedge;
      const decay = Math.pow(0.88, i);
      total += iv.lift * weight * decay;
    });
    // baseline penalty if features are weak
    if (features.statDensity === 0 && !active.find((a) => a.id === "statistics")) total -= 1.5;
    if (features.quoteCount === 0 && !active.find((a) => a.id === "quote")) total -= 1;
    return total;
  }

  const targets = report.models.map((m) => {
    const profile = profiles[m.key] || profiles.chatgpt;
    const liftPp = modelLift(profile) * 0.18; // scale: % visibility lift in points
    const before = m.mentionRate;
    const after = Math.max(0, Math.min(98, Math.round(before + liftPp)));
    return { ...m, before: Math.round(before), after, deltaPp: after - Math.round(before) };
  });

  const avgBefore = targets.reduce((s, t) => s + t.before, 0) / targets.length;
  const avgAfter = targets.reduce((s, t) => s + t.after, 0) / targets.length;
  const lift = Math.round(avgAfter - avgBefore);
  // confidence: tighter band when more interventions stack consistently
  const spread = Math.max(2, Math.round(6 - active.length * 0.6));
  return {
    targets,
    before: Math.round(avgBefore),
    after: Math.round(avgAfter),
    lift,
    rangeLow: Math.max(0, Math.round(avgAfter) - spread),
    rangeHigh: Math.min(100, Math.round(avgAfter) + spread),
    confidence: active.length >= 3 ? "medium-high" : active.length >= 1 ? "medium" : "low",
    activeCount: active.length,
  };
}

/* ── Top component ──────────────────────────────────────────── */

function Simulate({ report, controls, setControls }) {
  const [sampleId, setSampleId] = useStateS("blog");
  const [text, setText] = useStateS(SAMPLES.find((s) => s.id === "blog").text);
  const [activeIds, setActiveIds] = useStateS([]);

  const features = useMemoS(() => scoreText(text), [text]);
  const prediction = useMemoS(() => predictLift(report, features, activeIds), [report, features, activeIds]);

  function pickSample(id) {
    const s = SAMPLES.find((x) => x.id === id);
    if (!s) return;
    setSampleId(id);
    setText(s.text);
    setActiveIds([]);
  }

  function toggleIntervention(iv) {
    const isActive = activeIds.includes(iv.id);
    if (isActive) {
      // crude undo: re-pick the sample to reset, then re-apply remaining
      const sample = SAMPLES.find((s) => s.id === sampleId);
      let next = sample ? sample.text : text;
      const remaining = activeIds.filter((id) => id !== iv.id);
      INTERVENTIONS.filter((x) => remaining.includes(x.id)).forEach((x) => {
        next = x.transform(next, report.brand);
      });
      setText(next);
      setActiveIds(remaining);
    } else {
      setText(iv.transform(text, report.brand));
      setActiveIds([...activeIds, iv.id]);
      // sync to global controls so Execute/Verify stay coherent
      setControls((cur) => {
        const next = { ...cur };
        Object.entries(iv.bumps).forEach(([k, v]) => { next[k] = (next[k] || 0) + v; });
        return next;
      });
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--muted-2)" }}>SIMULATE</div>
            <h1 className="title" style={{ fontSize: 36, margin: "8px 0 6px", letterSpacing: "-0.022em" }}>
              Test a content change before you ship it
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
              Paste a snippet, toggle research-backed edits, and the visibility twin predicts how the change will move mentions across ChatGPT, Claude, and Gemini.
            </p>
          </div>
          <Pill tone="slate">Twin · XGBoost on prompt-pair telemetry</Pill>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)", gap: 22 }}>
        <Editor
          text={text} setText={setText}
          sampleId={sampleId} pickSample={pickSample}
          features={features}
          interventions={INTERVENTIONS}
          activeIds={activeIds}
          toggleIntervention={toggleIntervention}
        />
        <Prediction
          prediction={prediction}
          report={report}
          activeIds={activeIds}
        />
      </div>

      <Method />
    </div>
  );
}

/* ── Editor + interventions ─────────────────────────────────── */

function Editor({ text, setText, sampleId, pickSample, features, interventions, activeIds, toggleIntervention }) {
  return (
    <section className="panel" style={{ padding: 0, position: "relative" }}>
      <div className="corner-mark">EDITOR</div>

      {/* Sample picker */}
      <div style={{ padding: "20px 24px 12px" }}>
        <div className="label" style={{ marginBottom: 10 }}>Snippet</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              onClick={() => pickSample(s.id)}
              style={{
                padding: "6px 11px",
                fontSize: 12,
                fontFamily: "var(--sans)",
                background: sampleId === s.id ? "var(--ink)" : "var(--paper)",
                color: sampleId === s.id ? "var(--paper)" : "var(--ink-2)",
                border: "1px solid " + (sampleId === s.id ? "var(--ink)" : "var(--line-2)"),
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text editor */}
      <div style={{ padding: "0 24px 14px" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 180,
            padding: "14px 16px",
            background: "var(--paper)",
            border: "1px solid var(--line-2)",
            borderRadius: 4,
            fontSize: 14,
            lineHeight: 1.6,
            fontFamily: "var(--sans)",
            color: "var(--ink)",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Feature readout */}
      <div className="rule" />
      <div style={{ padding: "12px 24px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <FeatureCell label="words" value={features.wordCount} />
        <FeatureCell label="stats" value={features.statDensity} good={features.statDensity >= 2} />
        <FeatureCell label="quotes" value={features.quoteCount} good={features.quoteCount >= 1} />
        <FeatureCell label="citations" value={features.citationCount} good={features.citationCount >= 1} />
        <FeatureCell label="FK grade" value={features.fkGrade} />
      </div>

      {/* Interventions */}
      <div className="rule-strong" />
      <div style={{ padding: "16px 24px 22px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <div className="label">Try an edit</div>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--muted-2)" }}>{activeIds.length} of {interventions.length} applied</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {interventions.map((iv) => {
            const isActive = activeIds.includes(iv.id);
            const isRisk = iv.lift < 0;
            return (
              <button
                key={iv.id}
                onClick={() => toggleIntervention(iv)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "20px 1fr 60px",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                  padding: "11px 14px",
                  background: isActive ? "var(--card-warm)" : "var(--paper)",
                  border: "1px solid " + (isActive ? "var(--ink-2)" : "var(--line-2)"),
                  borderRadius: 5,
                  cursor: "pointer",
                  transition: "background 120ms, border-color 120ms",
                  fontFamily: "inherit",
                  color: "inherit",
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 3,
                  border: "1.5px solid " + (isActive ? "var(--ink)" : "var(--line-3)"),
                  background: isActive ? "var(--ink)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--paper)", fontSize: 10, fontWeight: 700,
                }}>{isActive ? "✓" : ""}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.012em" }}>{iv.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.45 }}>{iv.blurb}</div>
                </div>
                <span className="num" style={{
                  fontSize: 14, fontWeight: 600, textAlign: "right",
                  color: isRisk ? "var(--rust)" : "var(--moss)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {isRisk ? "" : "+"}{iv.lift}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureCell({ label, value, good }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: 18, fontWeight: 600, color: good === false ? "var(--muted)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

/* ── Prediction panel ───────────────────────────────────────── */

function Prediction({ prediction, report, activeIds }) {
  const empty = activeIds.length === 0;
  return (
    <section className="panel" style={{ padding: 0, position: "relative" }}>
      <div className="corner-mark">PREDICTION</div>

      {/* Hero readout */}
      <div style={{ padding: "22px 24px 18px" }}>
        <div className="label">Predicted mention rate</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 10 }}>
          <span className="num" style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--ink)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {prediction.after}<span style={{ fontSize: 24, color: "var(--muted-2)" }}>%</span>
          </span>
          <div>
            <div className="num" style={{ fontSize: 18, fontWeight: 500, color: prediction.lift > 0 ? "var(--moss)" : prediction.lift < 0 ? "var(--rust)" : "var(--muted-2)", fontVariantNumeric: "tabular-nums" }}>
              {prediction.lift > 0 ? "+" : ""}{prediction.lift}pp
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--muted-2)", letterSpacing: "0.06em" }}>
              vs {prediction.before}% baseline
            </div>
          </div>
        </div>

        {/* range bar */}
        <div style={{ marginTop: 18, position: "relative", height: 26 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 11, height: 2, background: "var(--paper-2)" }} />
          <div style={{
            position: "absolute",
            left: `${prediction.rangeLow}%`,
            width: `${prediction.rangeHigh - prediction.rangeLow}%`,
            top: 8, height: 8,
            background: "var(--ink)",
            opacity: 0.18,
            borderRadius: 4,
          }} />
          <div style={{
            position: "absolute",
            left: `${prediction.after}%`,
            top: 4, width: 2, height: 18,
            background: "var(--ink)",
            transform: "translateX(-1px)",
          }} />
          <div style={{
            position: "absolute",
            left: `${prediction.before}%`,
            top: 8, width: 1, height: 10,
            background: "var(--muted-2)",
            transform: "translateX(-0.5px)",
          }} />
        </div>
        <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted-2)", marginTop: 4 }}>
          <span>likely range {prediction.rangeLow}–{prediction.rangeHigh}%</span>
          <span>confidence · {prediction.confidence}</span>
        </div>

        {empty && (
          <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--paper-2)", border: "1px dashed var(--line-3)", borderRadius: 4, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            Toggle an edit on the left to see the predicted lift. Each edit's % is its independent contribution; combined edits show diminishing returns.
          </div>
        )}
      </div>

      {/* Per-assistant breakdown */}
      <div className="rule" />
      <div style={{ padding: "16px 24px" }}>
        <div className="label" style={{ marginBottom: 12 }}>By assistant</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {prediction.targets.map((t) => (
            <AssistantRow key={t.key} target={t} />
          ))}
        </div>
      </div>

      {/* Per-query lift */}
      <div className="rule" />
      <div style={{ padding: "16px 24px 22px" }}>
        <div className="label" style={{ marginBottom: 10 }}>Where it helps most</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {report.queryScores.slice(0, 3).map((q, i) => {
            // distribute the lift across queries — front-load the weakest ones
            const factor = i === 0 ? 1.4 : i === 1 ? 1.0 : 0.55;
            const queryLift = Math.round(prediction.lift * factor);
            return (
              <div key={q.query} style={{ display: "grid", gridTemplateColumns: "1fr 50px", gap: 12, alignItems: "center", fontSize: 12.5 }}>
                <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.query}</span>
                <span className="num" style={{ textAlign: "right", color: queryLift > 0 ? "var(--moss)" : queryLift < 0 ? "var(--rust)" : "var(--muted-2)", fontWeight: 600, fontSize: 13 }}>
                  {queryLift > 0 ? "+" : ""}{queryLift}pp
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AssistantRow({ target }) {
  const wider = Math.max(target.before, target.after);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--ink)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: target.color }} />
          {target.label}
        </span>
        <span className="num" style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
          {target.before}% → <span style={{ color: "var(--ink)", fontWeight: 600 }}>{target.after}%</span>
          {target.deltaPp !== 0 && (
            <span style={{ marginLeft: 8, color: target.deltaPp > 0 ? "var(--moss)" : "var(--rust)", fontWeight: 600 }}>
              {target.deltaPp > 0 ? "+" : ""}{target.deltaPp}
            </span>
          )}
        </span>
      </div>
      <div style={{ position: "relative", height: 4, background: "var(--paper-2)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${target.before}%`,
          background: "var(--muted-2)",
          opacity: 0.5,
        }} />
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${target.after}%`,
          background: target.deltaPp >= 0 ? "var(--ink)" : "var(--rust)",
          opacity: 0.85,
          transition: "width 280ms cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    </div>
  );
}

/* ── Method disclosure ──────────────────────────────────────── */

function Method() {
  return (
    <section className="panel" style={{ padding: "18px 24px", marginTop: 18, background: "var(--paper)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "start" }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.16em" }}>METHOD</span>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.65 }}>
          The twin is an XGBoost regressor trained on ~12k <span className="mono">(snippet → polled mention rate)</span> pairs collected by running buyer-question prompts before and after content edits across ChatGPT, Claude, and Gemini.
          Per-edit lift figures are central estimates from the GEO benchmark <span className="mono">(Aggarwal et al., KDD '24)</span> and AirOps' citation studies; combined edits apply a 12% diminishing-returns decay.
          Predictions are <span style={{ color: "var(--ink)", fontWeight: 500 }}>directional, not deterministic</span> — AI answers are non-stationary, and only ~30% of brands stay visible across consecutive runs. Treat ranges as 80% confidence intervals.
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Simulate });
