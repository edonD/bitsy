// Spectrum — the centerpiece. A tick-marked horizontal instrument bar
// showing baseline, predicted, competitor, and live-updating live-mark.

const { useMemo: useMemoSpec } = React;

function Spectrum({ baseline, predicted, competitors = [], live, height = 96, animated = false, label }) {
  // Generate ticks at every 5%, major at every 10%
  const ticks = [];
  for (let i = 0; i <= 100; i += 5) ticks.push({ at: i, major: i % 10 === 0, full: i % 25 === 0 });

  return (
    <div style={{ position: "relative", padding: "8px 10px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="label">{label || "Visibility — measured 0 to 100"}</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.08em" }}>SCALE · LINEAR</span>
      </div>
      <div className="spectrum" style={{ height: 110 }}>
        {/* Tick marks */}
        {ticks.map((t) => (
          <div key={t.at}
            className={"spectrum-tick" + (t.major ? " major" : "")}
            style={{ left: `${t.at}%` }} />
        ))}
        {/* Track */}
        <div className="spectrum-track" />
        {/* Number labels under major ticks */}
        {ticks.filter((t) => t.full).map((t) => (
          <div key={`l-${t.at}`} className="mono" style={{
            position: "absolute", left: `${t.at}%`, top: 42, fontSize: 9.5,
            color: "var(--muted-2)", transform: "translateX(-50%)", letterSpacing: "0.05em",
          }}>{t.at}</div>
        ))}

        {/* Competitor markers — dots only, label on hover */}
        {competitors.map((c, i) => (
          <div key={`c-${i}`} className="marker" title={`${c.label} · ${Math.round(c.at)}%`} style={{ left: `${c.at}%`, top: 50, cursor: "default" }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--paper)",
              border: "1.5px solid var(--muted-2)",
            }} />
          </div>
        ))}
        {/* Competitor legend below */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 68, display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          {competitors.map((c, i) => (
            <span key={`l-${i}`} className="mono" style={{ fontSize: 9.5, color: "var(--muted)", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid var(--muted-2)", background: "var(--paper)" }} />
              {c.label} <span style={{ color: "var(--muted-2)" }}>{Math.round(c.at)}</span>
            </span>
          ))}
        </div>

        {/* Baseline marker — above axis, slate */}
        <div className="marker" style={{ left: `${baseline}%`, top: -2 }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <div className="mono" style={{
              fontSize: 9, color: "var(--slate)", letterSpacing: "0.1em", whiteSpace: "nowrap",
            }}>BASELINE {Math.round(baseline)}</div>
            <div style={{ width: 1, height: 18, background: "var(--slate)" }} />
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--paper)", border: "2px solid var(--slate)", marginTop: -3 }} />
          </div>
        </div>

        {/* Predicted marker — rust, larger */}
        {predicted != null && (
          <div className="marker" style={{ left: `${predicted}%`, top: -10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, color: "var(--rust)",
                letterSpacing: "0.06em", fontWeight: 600, whiteSpace: "nowrap",
                background: "var(--paper)", padding: "2px 6px", border: "1px solid var(--rust)",
                borderRadius: 2,
              }}>
                {animated ? "LIVE" : "PREDICTED"} {Math.round(predicted)}
              </div>
              <div style={{ width: 1, height: 24, background: "var(--rust)" }} />
              <div style={{
                width: 9, height: 9, borderRadius: "50%", background: "var(--rust)",
                marginTop: -3,
                boxShadow: animated ? "0 0 0 4px var(--rust-soft)" : "none",
                animation: animated ? "pulse 1.4s ease-in-out infinite" : undefined,
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Spectrum });
