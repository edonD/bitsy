// Execute — One panel. Pick a move, get the assets.

const ACTION_EXPLAINER = {
  "answer-page":  "Build a page AI can quote. When the model is asked this question, it pulls a clean answer from your site instead of a competitor's.",
  "citations":    "Get mentioned on sites AI trusts. Reddit, review sites, and press are quoted more than your own copy — so the model recommends you even when it doesn't visit your site.",
  "proof-refresh": "Add fresh numbers and dates. Grounded models prefer pages with concrete, recent evidence — they down-rank vague or stale claims.",
};

const ACTION_OUTCOME = {
  "answer-page":  "AI starts citing your page",
  "citations":    "AI hears about you elsewhere",
  "proof-refresh": "AI trusts your page more",
};

function Execute({ report, selectedAction, selectedActionId, setSelectedActionId, controls, engineState }) {
  const baseline = Math.round(report.baseline);
  const predicted = Math.min(98, baseline + selectedAction.lift);

  return (
    <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
      <section className="panel" style={{ padding: 0, position: "relative", width: "100%", maxWidth: 980 }}>
        <div className="corner-mark">EXECUTE</div>

        {/* Header */}
        <div style={{ padding: "26px 28px 18px" }}>
          <h2 className="title" style={{ fontSize: 30, margin: "0 0 6px", lineHeight: 1.1 }}>Make AI mention you</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: 0, maxWidth: 580 }}>
            Three moves that close the gap. Pick one, get the assets, ship.
          </p>
        </div>

        <div className="rule" />

        {/* Hero readout: today vs after this move */}
        <div style={{ padding: "26px 28px 24px", display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 36, alignItems: "center" }}>
          <Reading label="AI mentions you" value={`${baseline}%`} muted />
          <ArrowReading
            from={baseline}
            to={predicted}
            tone={predicted > baseline ? "moss" : "ink"}
            label={engineState === "complete" ? "after this move" : "predicted"}
          />
          <div style={{ justifySelf: "end", textAlign: "right" }}>
            <div className="label" style={{ marginBottom: 6 }}>Lift</div>
            <div className="num" style={{ fontFamily: "var(--sans)", fontSize: 32, fontWeight: 600, letterSpacing: "-0.022em", color: "var(--moss)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              +{selectedAction.lift}<span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 500, marginLeft: 2 }}>pp</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 5 }}>
              {selectedAction.confidence} confidence · {selectedAction.effort} effort
            </div>
          </div>
        </div>

        <div className="rule" />

        {/* Action picker — three options like Target's mode picker */}
        <div style={{ padding: "20px 28px 22px" }}>
          <div className="label" style={{ marginBottom: 12 }}>Pick a move</div>
          <div style={{ display: "grid", gap: 10 }}>
            {report.actions.map((a) => {
              const active = selectedActionId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedActionId(a.id)}
                  style={{
                    display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center",
                    textAlign: "left", padding: "14px 16px",
                    background: active ? "var(--card)" : "transparent",
                    border: `1px solid ${active ? "var(--ink)" : "var(--line-2)"}`,
                    borderRadius: 8, cursor: "pointer",
                    transition: "border-color 140ms, background 140ms",
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: "50%",
                    border: `1.5px solid ${active ? "var(--ink)" : "var(--line-3)"}`,
                    background: "var(--paper)",
                    position: "relative",
                    flexShrink: 0,
                  }}>
                    {active && <span style={{ position: "absolute", inset: 3, borderRadius: "50%", background: "var(--ink)" }} />}
                  </span>
                  <span>
                    <span style={{ display: "block", fontFamily: "var(--sans)", fontSize: 15, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.014em", marginBottom: 3 }}>
                      {a.title}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                      {ACTION_EXPLAINER[a.id] || a.why}
                    </span>
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span className="num" style={{ fontSize: 16, fontWeight: 600, color: active ? "var(--moss)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                      +{a.lift}pp
                    </span>
                    <span className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {a.effort} effort
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rule" />

        {/* Outcome line — what changes for your GEO */}
        <div style={{ padding: "20px 28px 16px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "baseline" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.16em" }}>WHAT CHANGES</span>
          <span style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--ink)", letterSpacing: "-0.012em", lineHeight: 1.3 }}>
            {ACTION_OUTCOME[selectedAction.id] || "AI sees you more often"}.
            <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 16, marginLeft: 6 }}>
              {selectedAction.evidence}
            </span>
          </span>
        </div>

        {/* Steps */}
        <div style={{ padding: "10px 28px 22px" }}>
          <div className="label" style={{ marginBottom: 10 }}>How to do it</div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {selectedAction.steps.map((s, i) => (
              <li key={i} style={{
                padding: "14px 16px",
                background: "var(--paper)",
                border: "1px solid var(--line-2)",
                borderRadius: 6,
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--muted-2)", letterSpacing: "0.12em" }}>STEP {i + 1}</span>
                <span style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rule" />

        {/* Assets */}
        <div style={{ padding: "20px 28px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div className="label">Ready to ship</div>
            <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.06em" }}>
              copy · brief · schema
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <AssetCard
              title="Paste into your page"
              meta="120-word answer block · drop into the top of the page"
            >
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "var(--ink-2)" }}>
                <span style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 32, float: "left", lineHeight: 0.85, marginRight: 6, marginTop: 4, color: "var(--ink)" }}>{report.brand[0]}</span>
                {report.brand} helps teams test AI search visibility before they publish. In this category, teams compare {report.brand} against {report.dominantCompetitor?.brand ?? "alternatives"} on mention rate, cited sources, and predicted lift from content changes — with {controls.statistics} concrete numbers and {controls.citations} third-party citations on the answer page.
              </p>
            </AssetCard>

            <AssetCard
              title="Writer brief"
              meta="1 page · 8 min read · hand to your content team"
            >
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 13, color: "var(--ink-2)" }}>
                <li>Answer the weakest query: <em>{report.weakestQuery.query}</em></li>
                <li>Comparison table: pricing, use cases, limitations vs {report.dominantCompetitor?.brand ?? "alternatives"}.</li>
                <li>Include {controls.expertQuotes} expert quotes and {controls.statistics} concrete numbers.</li>
                <li>Cite {controls.thirdPartyMentions} independent sources at minimum; surface them in a "Sources" footer.</li>
              </ul>
            </AssetCard>

            <AssetCard
              title="Schema markup"
              meta="FAQPage · JSON-LD · paste into <head>"
              code
            >
<pre style={{ margin: 0, fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{`{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": ${JSON.stringify(report.weakestQuery.query)},
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "${report.brand} ranks #${report.target.rank} for this query…"
      }
    }
  ]
}`}</pre>
            </AssetCard>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Atoms ──────────────────────────────────────────────────── */

function Reading({ label, value, muted }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="num" style={{
        fontFamily: "var(--sans)", fontSize: 56, fontWeight: 600, letterSpacing: "-0.03em",
        lineHeight: 0.95, color: muted ? "var(--muted)" : "var(--ink)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
    </div>
  );
}

function ArrowReading({ from, to, tone, label }) {
  const color = tone === "moss" ? "var(--moss)" : "var(--ink)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 18, color: "var(--muted-2)", letterSpacing: "0.02em" }}>→</span>
      <div>
        <div className="label" style={{ marginBottom: 6 }}>{label}</div>
        <div className="num" style={{
          fontFamily: "var(--sans)", fontSize: 56, fontWeight: 600, letterSpacing: "-0.03em",
          lineHeight: 0.95, color, fontVariantNumeric: "tabular-nums",
        }}>
          {to}<span style={{ fontSize: 22, color: "var(--muted)", fontWeight: 500 }}>%</span>
        </div>
      </div>
    </div>
  );
}

function AssetCard({ title, meta, children, code }) {
  return (
    <div style={{
      border: "1px solid var(--line-2)",
      borderRadius: 8,
      background: "var(--paper)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px",
        background: "var(--paper-2)",
        borderBottom: "1px solid var(--line-2)",
        display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10,
      }}>
        <span style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500, letterSpacing: "-0.014em", color: "var(--ink)" }}>
          {title}
        </span>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.04em" }}>
          {meta}
        </span>
      </div>
      <div style={{ padding: code ? "14px 16px" : "16px 18px" }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { Execute });
