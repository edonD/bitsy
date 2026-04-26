// Verify — One panel. Did the move work?

function Verify({ report, controls }) {
  const outcome = getSimulationOutcome(report, controls);
  const predicted = outcome.lift;
  const actual = Math.max(0, predicted - 1); // demo: actual lands just under predicted
  const delta = actual - predicted;
  const inside = actual >= (outcome.intervalLow - outcome.baseline) && actual <= (outcome.intervalHigh - outcome.baseline);
  const accuracy = predicted > 0 ? Math.round((1 - Math.abs(delta) / predicted) * 100) : 0;

  return (
    <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
      <section className="panel" style={{ padding: 0, position: "relative", width: "100%", maxWidth: 980 }}>
        <div className="corner-mark">VERIFY</div>

        {/* Header */}
        <div style={{ padding: "26px 28px 18px" }}>
          <h2 className="title" style={{ fontSize: 30, margin: "0 0 6px", lineHeight: 1.1 }}>Did it work?</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: 0, maxWidth: 580 }}>
            We re-ran the same questions 14 days after you shipped. Here's what AI says about you now.
          </p>
        </div>

        <div className="rule" />

        {/* Hero readout: predicted vs actual */}
        <div style={{ padding: "26px 28px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, alignItems: "start" }}>
          <Reading label="We predicted" value={`+${predicted}pp`} tone="muted" />
          <Reading label="What actually happened" value={`+${actual}pp`} tone="ink" big />
          <Reading
            label="Accuracy"
            value={`${accuracy}%`}
            tone={inside ? "moss" : "rust"}
            hint={inside ? "inside our predicted range" : "outside predicted range"}
          />
        </div>

        <div className="rule" />

        {/* What changed line — single sentence verdict */}
        <div style={{ padding: "20px 28px 18px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "baseline" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.16em" }}>VERDICT</span>
          <span style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--ink)", letterSpacing: "-0.012em", lineHeight: 1.4 }}>
            {inside
              ? <>Move worked as expected. <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 16 }}>AI now mentions you in {outcome.baseline + actual}% of answers, up from {outcome.baseline}%.</span></>
              : actual > predicted
              ? <>Move outperformed. <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 16 }}>{Math.abs(delta)}pp better than predicted — consider doubling down here.</span></>
              : <>Move underperformed. <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 16 }}>{Math.abs(delta)}pp short of predicted. Check the assumptions below.</span></>
            }
          </span>
        </div>

        <div className="rule" />

        {/* What we shipped */}
        <div style={{ padding: "20px 28px 22px" }}>
          <div className="label" style={{ marginBottom: 12 }}>What you shipped</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <ShipmentTile label="Concrete numbers added" value={controls.statistics} />
            <ShipmentTile label="Citations added" value={controls.citations} />
            <ShipmentTile label="Third-party mentions" value={controls.thirdPartyMentions} />
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted-2)", marginTop: 12, letterSpacing: "0.06em" }}>
            shipped 14 days ago · {report.models.length} assistants polled · 6 runs each
          </div>
        </div>

        <div className="rule" />

        {/* Per-query breakdown */}
        <div style={{ padding: "20px 28px 24px" }}>
          <div className="label" style={{ marginBottom: 12 }}>Where the lift showed up</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {report.queryScores.map((q, i) => {
              const qPredicted = Math.max(3, Math.round(predicted * (i === 0 ? 0.55 : 0.35)));
              const qActual = Math.max(1, qPredicted - (i % 2));
              const qDelta = qActual - qPredicted;
              const status = qDelta >= 0 ? "as predicted" : "fell short";
              return (
                <QueryDeltaRow
                  key={q.query}
                  query={q.query}
                  predicted={qPredicted}
                  actual={qActual}
                  delta={qDelta}
                  status={status}
                />
              );
            })}
          </div>
        </div>

        <div className="rule" />

        {/* Next step */}
        <div style={{ padding: "20px 28px 24px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center", background: "var(--paper)" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.16em" }}>NEXT</span>
          <span style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
            Lock in the gain. Run again in 30 days to catch ranking drift, and ship the next move.
          </span>
          <button className="btn" style={{ padding: "8px 14px", fontSize: 12 }}>
            Plan next move →
          </button>
        </div>
      </section>
    </div>
  );
}

/* ── Atoms ──────────────────────────────────────────────────── */

function Reading({ label, value, tone, hint, big }) {
  const color =
    tone === "moss" ? "var(--moss)" :
    tone === "rust" ? "var(--rust)" :
    tone === "muted" ? "var(--muted)" : "var(--ink)";
  const size = big ? 56 : 44;
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="num" style={{
        fontFamily: "var(--sans)",
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "-0.028em",
        lineHeight: 0.95,
        color,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function ShipmentTile({ label, value }) {
  return (
    <div style={{
      padding: "14px 16px",
      background: "var(--paper)",
      border: "1px solid var(--line-2)",
      borderRadius: 6,
    }}>
      <div className="num" style={{
        fontFamily: "var(--sans)", fontSize: 26, fontWeight: 600, color: "var(--ink)",
        letterSpacing: "-0.022em", lineHeight: 1, fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.4 }}>
        {label}
      </div>
    </div>
  );
}

function QueryDeltaRow({ query, predicted, actual, delta, status }) {
  const max = Math.max(predicted, actual, 1);
  const positive = delta >= 0;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) auto",
      gap: 16,
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid var(--line-2)",
    }}>
      <span style={{ fontSize: 13, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {query}
      </span>
      <div style={{ position: "relative", height: 18 }}>
        {/* predicted bar (faded) */}
        <div style={{
          position: "absolute", left: 0, top: 3, height: 5,
          width: `${(predicted / max) * 100}%`,
          background: "var(--muted-2)",
          opacity: 0.45,
          borderRadius: 2,
        }} />
        {/* actual bar (solid) */}
        <div style={{
          position: "absolute", left: 0, top: 10, height: 5,
          width: `${(actual / max) * 100}%`,
          background: positive ? "var(--moss)" : "var(--ink)",
          opacity: 0.9,
          borderRadius: 2,
        }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, minWidth: 100 }}>
        <span className="num" style={{ fontSize: 13, fontWeight: 600, color: positive ? "var(--moss)" : "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
          +{actual}pp <span style={{ color: "var(--muted-2)", fontWeight: 400 }}>/ +{predicted}</span>
        </span>
        <span className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {status}
        </span>
      </div>
    </div>
  );
}

Object.assign(window, { Verify });
