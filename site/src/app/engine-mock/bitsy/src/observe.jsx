// Observe — harmonized with Target. Hero readout, calm panels, no ruler/colored borders.

const { useState: useStateO } = React;

function Observe({ report, mode, setMode, engineState, progress }) {
  const [hovered, setHovered] = useStateO(null);

  const baseline = report.baseline;
  const liveReading = engineState === "running"
    ? baseline + Math.sin(progress / 6) * 4
    : baseline;
  const live = useSpring(liveReading);

  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      <Cockpit
        report={report} mode={mode} setMode={setMode}
        baseline={baseline} live={live}
        engineState={engineState}
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: 24 }}>
        <Leaderboard report={report} engineState={engineState} hovered={hovered} setHovered={setHovered} />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <QueryMap report={report} />
          <SourceGaps report={report} />
        </div>
      </div>
    </div>
  );
}

/* ── Cockpit ─────────────────────────────────────────────────── */

function Cockpit({ report, mode, setMode, baseline, live, engineState }) {
  const competitorRows = report.leaderboard.filter((r) => !r.isTarget).slice(0, 4);
  const topCompetitor = competitorRows[0];
  const delta = topCompetitor ? Math.round(live - topCompetitor.mentionRate) : 0;

  return (
    <section className="panel" style={{ position: "relative", padding: 0, overflow: "hidden" }}>
      <div className="corner-mark">OBSERVE</div>

      {/* Header */}
      <div style={{ padding: "26px 28px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <h2 className="title" style={{ fontSize: 30, margin: "0 0 6px", lineHeight: 1.1 }}>How AI sees you</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: 0, maxWidth: 540 }}>
            How often {report.brand} comes up across {report.queries.length || 1} buyer questions and {report.models.length} AI assistants.
          </p>
        </div>
        <ModeSwitch mode={mode} setMode={setMode} />
      </div>

      <div className="rule" />

      {/* Hero readout */}
      <div style={{ padding: "30px 28px 26px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 36, alignItems: "center" }}>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>You appear in</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="num" style={{
              fontFamily: "var(--sans)", fontSize: 88, fontWeight: 600, letterSpacing: "-0.04em",
              lineHeight: 0.95, color: "var(--ink)",
              fontVariantNumeric: "tabular-nums",
            }}>{Math.round(live)}</span>
            <span style={{ fontFamily: "var(--sans)", fontSize: 28, fontWeight: 500, color: "var(--muted)", letterSpacing: "-0.02em" }}>%</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>of AI answers about your category</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          <Readout label="Rank" value={`#${report.target.rank}`} hint={`of ${report.leaderboard.length} brands`} />
          <Readout label="Share of voice" value={`${report.target.shareOfVoice.toFixed(1)}%`} hint="of total mentions" />
          <Readout
            label={topCompetitor ? `vs ${topCompetitor.brand}` : "vs leader"}
            value={topCompetitor ? `${delta >= 0 ? "+" : ""}${delta}pp` : "—"}
            hint={delta >= 0 ? "you lead" : "you trail"}
            tone={delta >= 0 ? "moss" : "rust"}
          />
        </div>
      </div>

      <div className="rule" />

      {/* By model — calm cards, no colored borders */}
      <div style={{ padding: "20px 28px 24px" }}>
        <div className="label" style={{ marginBottom: 12 }}>By assistant</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {report.models.map((m) => (
            <div key={m.key} style={{
              padding: 16, background: "var(--paper)",
              border: "1px solid var(--line-2)",
              borderRadius: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--sans)", fontWeight: 500, letterSpacing: "-0.018em", fontSize: 15, color: "var(--ink)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />
                  {m.label}
                </span>
                <span className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{m.mentionRate.toFixed(0)}<span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>%</span></span>
              </div>
              <div style={{ height: 3, background: "var(--paper-2)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${m.mentionRate}%`, background: "var(--ink)", opacity: 0.8 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing: "0.02em" }}>
                <span>pos #{m.avgPosition.toFixed(1)}</span>
                <span>{m.sourceReliance.toFixed(0)}% sourced</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Readout({ label, value, hint, tone }) {
  const color = tone === "moss" ? "var(--moss)" : tone === "rust" ? "var(--rust)" : "var(--ink)";
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--sans)", fontSize: 28, fontWeight: 600, letterSpacing: "-0.022em", color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 5 }}>{hint}</div>
    </div>
  );
}

/* ── Leaderboard ─────────────────────────────────────────────── */

function Leaderboard({ report, engineState, hovered, setHovered }) {
  // `hovered` is now repurposed as the open/expanded row.
  const open = hovered;
  const setOpen = (b) => setHovered((cur) => (cur === b ? null : b));
  const totalAnswers = report.models.length * (report.queries.length || 1);

  return (
    <section className="panel" style={{ padding: 0, position: "relative" }}>
      <div className="corner-mark">LEADERBOARD</div>
      <div style={{ padding: "24px 26px 14px" }}>
        <h3 className="title" style={{ fontSize: 22, margin: "0 0 4px" }}>Who AI recommends</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
          Mention rate across {report.queries.length || 1} questions <span className="mono" style={{ color: "var(--muted-2)" }}>· click a row to see the full report</span>
        </p>
      </div>
      <div className="rule" />
      <div>
        {report.leaderboard.map((row) => {
          const isOpen = open === row.brand;
          return (
            <div
              key={row.brand}
              className="leader-row"
              data-target={row.isTarget}
              data-open={isOpen}
              onClick={() => setOpen(row.brand)}
            >
              <span className="num" style={{ fontSize: 13, color: "var(--muted-2)", textAlign: "right" }}>#{row.rank}</span>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "var(--sans)", fontWeight: 500, letterSpacing: "-0.018em", fontSize: 17, color: "var(--ink)" }}>{row.brand}</span>
                  {row.isTarget && <span className="mono" style={{ fontSize: 9, color: "var(--ink)", letterSpacing: "0.16em", padding: "1px 5px", border: "1px solid var(--line-3)", borderRadius: 3 }}>YOU</span>}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
                  pos #{row.avgPosition.toFixed(1)} · share {row.shareOfVoice.toFixed(1)}% · sentiment {row.sentiment.toFixed(0)}
                </div>
              </div>
              <div className="num" style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", textAlign: "right" }}>
                {row.mentionRate.toFixed(0)}%
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                <span className="mono leader-chevron" style={{ fontSize: 14, lineHeight: 1 }}>›</span>
              </div>
              <div className="leader-bar"><span style={{ width: `${row.mentionRate}%` }} /></div>

              {isOpen && <BrandReport row={row} report={report} totalAnswers={totalAnswers} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BrandReport({ row, report, totalAnswers }) {
  // Deterministic per-brand model breakdown — derived from existing data.
  const seed = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };
  const modelBreakdown = report.models.map((m) => {
    const offset = (seed(`${row.brand}:${m.key}`) % 22) - 11;
    const rate = Math.max(2, Math.min(98, Math.round(row.mentionRate + offset)));
    const cited = Math.round((rate / 100) * (report.queries.length || 1));
    return { ...m, rate, cited };
  });
  const totalCited = Math.round((row.mentionRate / 100) * totalAnswers);

  // Per-question wins: which buyer questions this brand wins / appears strongly in
  const winsCount = report.queryScores.filter((q) =>
    row.isTarget ? q.winner === report.brand : q.winner === row.brand
  ).length;
  const strongOn = report.queryScores
    .map((q) => ({
      query: q.query,
      // synthesize a per-brand-per-query rate
      rate: row.isTarget ? q.targetRate : Math.max(8, Math.min(96, q.targetRate + 14 + (seed(`${row.brand}:${q.query}`) % 28) - 12)),
    }))
    .sort((a, b) => b.rate - a.rate);
  const top = strongOn.slice(0, 2);
  const bottom = strongOn.slice(-1);

  const sortedModels = [...modelBreakdown].sort((a, b) => b.rate - a.rate);
  const strongestModel = sortedModels[0];
  const weakestModel = sortedModels[sortedModels.length - 1];

  return (
    <div className="leader-report" onClick={(e) => e.stopPropagation()}>
      {/* Summary line */}
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
        {row.isTarget ? (
          <>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{report.brand}</span> was cited in{" "}
            <span className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>{totalCited}</span> of{" "}
            <span className="num">{totalAnswers}</span> answers
            {winsCount > 0 && <> · wins <span className="num" style={{ color: "var(--moss)" }}>{winsCount}</span> of {report.queryScores.length} questions</>}
            {" "}· strongest on <span style={{ color: "var(--ink)" }}>{strongestModel.label}</span>, weakest on <span style={{ color: "var(--ink)" }}>{weakestModel.label}</span>.
          </>
        ) : (
          <>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{row.brand}</span> was cited in{" "}
            <span className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>{totalCited}</span> of{" "}
            <span className="num">{totalAnswers}</span> answers
            {row.mentionRate > report.target.mentionRate && (
              <> · beats {report.brand} by <span className="num" style={{ color: "var(--rust)" }}>{Math.round(row.mentionRate - report.target.mentionRate)}pp</span></>
            )}
            {" "}· often named alongside {report.brand} in comparison prompts.
          </>
        )}
      </div>

      {/* Per-assistant breakdown */}
      <div>
        <div className="label" style={{ marginBottom: 10 }}>By assistant</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {modelBreakdown.map((m) => (
            <div key={m.key} style={{ background: "var(--paper)", border: "1px solid var(--line-2)", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color }} />
                  {m.label}
                </span>
                <span className="num" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{m.rate}<span style={{ fontSize: 10, color: "var(--muted)" }}>%</span></span>
              </div>
              <div style={{ height: 2, background: "var(--paper-2)", borderRadius: 1, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${m.rate}%`, background: "var(--ink)", opacity: 0.7 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-question highlights */}
      <div>
        <div className="label" style={{ marginBottom: 8 }}>{row.isTarget ? "Where you appear most" : "Where they win"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {top.map((q) => (
            <div key={q.query} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", fontSize: 12.5 }}>
              <span style={{ color: "var(--ink)" }}>{q.query}</span>
              <span className="num" style={{ color: "var(--ink)", fontWeight: 600, fontSize: 13 }}>{Math.round(q.rate)}%</span>
            </div>
          ))}
          {bottom.length > 0 && bottom[0].query !== top[top.length - 1]?.query && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", fontSize: 12.5, paddingTop: 6, borderTop: "1px dashed var(--line)" }}>
              <span style={{ color: "var(--muted)" }}>weakest · {bottom[0].query}</span>
              <span className="num" style={{ color: "var(--muted)", fontWeight: 600, fontSize: 13 }}>{Math.round(bottom[0].rate)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Query map ──────────────────────────────────────────────── */

function QueryMap({ report }) {
  return (
    <section className="panel" style={{ padding: 0, position: "relative" }}>
      <div className="corner-mark">QUERY MAP</div>
      <div style={{ padding: "24px 26px 14px" }}>
        <h3 className="title" style={{ fontSize: 22, margin: "0 0 4px" }}>Where visibility breaks</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Per-question mention rate, rank, and the recommended next move.</p>
      </div>
      <div className="rule" />
      <table className="bitsy">
        <thead>
          <tr>
            <th style={{ width: "44%" }}>Question</th>
            <th style={{ textAlign: "right", width: 70 }}>You</th>
            <th style={{ textAlign: "right", width: 60 }}>Rank</th>
            <th>Move</th>
          </tr>
        </thead>
        <tbody>
          {report.queryScores.map((q, i) => (
            <tr key={q.query}>
              <td>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ color: "var(--ink)", fontSize: 13 }}>{q.query}</span>
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4, marginLeft: 22 }}>
                  intent <span style={{ color: "var(--ink-2)" }}>{q.intent.toLowerCase()}</span> · winner <span style={{ color: q.winner === report.brand ? "var(--moss)" : "var(--ink-2)" }}>{q.winner}</span> · gap +{q.gap.toFixed(0)}pp
                </div>
              </td>
              <td className="num" style={{ textAlign: "right", color: "var(--ink)", fontSize: 14, fontWeight: 600 }}>{q.targetRate.toFixed(0)}%</td>
              <td className="num" style={{ textAlign: "right", color: "var(--muted)" }}>#{q.targetRank}</td>
              <td style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{q.recommendedMove}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ── Source gaps ─────────────────────────────────────────────── */

function SourceGaps({ report }) {
  return (
    <section className="panel" style={{ padding: 0, position: "relative" }}>
      <div className="corner-mark">SOURCE GAPS</div>
      <div style={{ padding: "24px 26px 14px" }}>
        <h3 className="title" style={{ fontSize: 22, margin: "0 0 4px" }}>Why you lose</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Fixing these is what moves the number.</p>
      </div>
      <div className="rule" />
      <div style={{ padding: "10px 26px 22px" }}>
        {report.sourceGaps.map((g, i) => {
          const pctNum = Math.min(100, (g.current / g.target) * 100);
          const isGood = g.status === "good";
          return (
            <div key={g.label} style={{ padding: "16px 0", borderBottom: i === report.sourceGaps.length - 1 ? "none" : "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{g.label}</div>
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: isGood ? "var(--moss)" : "var(--muted-2)" }}>
                  {g.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <span className="num" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", minWidth: 18 }}>{g.current}</span>
                <div style={{ flex: 1, height: 3, background: "var(--paper-2)", position: "relative", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctNum}%`, background: isGood ? "var(--moss)" : "var(--ink)", opacity: isGood ? 1 : 0.7 }} />
                </div>
                <span className="num" style={{ fontSize: 11, color: "var(--muted-2)", minWidth: 28, textAlign: "right" }}>tgt {g.target}</span>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.55 }}>{g.note}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

Object.assign(window, { Observe });
