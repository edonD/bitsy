// Simulate — three modes for modeling a content change:
//   1. Plays    → pick from a curated archetype library (default; what most teams want)
//   2. Draft    → paste a real draft, see what features it has and predicted lift
//   3. Levers   → pull the underlying feature inputs directly (debug / power user)

const { useState: useStateS, useMemo: useMemoS, useEffect: useEffectS } = React;

const SIM_MODES = [
  {
    id: "plays",
    label: "Plays",
    blurb: "Pick from the curated archetype library. Use this when you’re scoping work and don’t have a draft yet.",
  },
  {
    id: "draft",
    label: "Draft",
    blurb: "Paste a draft (or an existing page). We extract its features and predict the lift if you ship it.",
  },
  {
    id: "levers",
    label: "Levers",
    blurb: "Pull the raw feature inputs the surrogate model uses. Helpful for sensitivity analysis, not for scoping.",
  },
];

function Simulate({ report, controls, setControls }) {
  const [simMode, setSimMode] = useStateS("plays");

  const [targetQuery, setTargetQuery] = useStateS(() => {
    const sorted = [...report.queryScores].sort((a, b) => a.targetRate - b.targetRate);
    return sorted[0]?.query || report.queries[0] || "";
  });
  const [activePlayIds, setActivePlayIds] = useStateS([]);
  const [selectedAssetId, setSelectedAssetId] = useStateS("homepage");
  const [expandedPlay, setExpandedPlay] = useStateS(null);
  const [draftText, setDraftText] = useStateS("");

  const ownedAssets = useMemoS(
    () => makeOwnedAssets(report.brand, report.website, report.queries),
    [report.brand, report.website, report.queries]
  );
  const selectedAsset = ownedAssets.find((a) => a.id === selectedAssetId) || ownedAssets[0];

  const fanOut = useMemoS(
    () => fanOutQuery(targetQuery, report.brand, report.competitors),
    [targetQuery, report.brand, report.competitors]
  );

  const prediction = useMemoS(
    () => predictForQuery(report, targetQuery, activePlayIds, selectedAsset),
    [report, targetQuery, activePlayIds, selectedAsset]
  );

  useEffectS(() => { setActivePlayIds([]); setExpandedPlay(null); }, [targetQuery]);

  function togglePlay(id) {
    setActivePlayIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  const activeMode = SIM_MODES.find((m) => m.id === simMode) || SIM_MODES[0];

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ink-2)" }}>SIMULATE</div>
        <h1 className="title" style={{ fontSize: 36, margin: "8px 0 6px", letterSpacing: "-0.022em" }}>
          Three ways to model a change.
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: 0, maxWidth: 760, lineHeight: 1.6 }}>
          Pick a play from the catalog, paste a draft, or pull the levers. Each mode runs the same surrogate model — the difference is how you specify the change.
        </p>
      </div>

      {/* Mode switcher */}
      <ModeSwitcher mode={simMode} setMode={setSimMode} active={activeMode} />

      {simMode === "plays" && (
        <>
          <TargetQueryBar
            report={report}
            targetQuery={targetQuery}
            setTargetQuery={setTargetQuery}
            prediction={prediction}
          />
          <FanOutPanel fanOut={fanOut} targetQuery={targetQuery} />
          <PlaysSection
            plays={PLAYS}
            activePlayIds={activePlayIds}
            togglePlay={togglePlay}
            expandedPlay={expandedPlay}
            setExpandedPlay={setExpandedPlay}
            report={report}
            ownedAssets={ownedAssets}
            selectedAsset={selectedAsset}
            setSelectedAssetId={setSelectedAssetId}
          />
          <PredictionPanel prediction={prediction} report={report} />
        </>
      )}

      {simMode === "draft" && (
        <DraftMode report={report} draftText={draftText} setDraftText={setDraftText} />
      )}

      {simMode === "levers" && (
        <LeversMode report={report} controls={controls} setControls={setControls} />
      )}

      {/* Method */}
      <Method />
    </div>
  );
}

/* ── Mode switcher ──────────────────────────────────────────── */

function ModeSwitcher({ mode, setMode, active }) {
  return (
    <section className="panel" style={{ padding: 0, marginBottom: 18, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: "1px solid var(--line-2)" }}>
        {SIM_MODES.map((m, i) => {
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                position: "relative",
                padding: "16px 20px",
                textAlign: "left",
                background: isActive ? "var(--paper)" : "transparent",
                border: 0,
                borderRight: i < 2 ? "1px solid var(--line-2)" : "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mono" style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: isActive ? "var(--ink)" : "var(--muted-2)",
                  letterSpacing: "0.14em",
                }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: isActive ? "var(--ink)" : "var(--ink-2)",
                  letterSpacing: "-0.012em",
                }}>{m.label}</span>
              </div>
              <div style={{
                fontSize: 11.5,
                color: "var(--muted)",
                marginTop: 4,
                lineHeight: 1.45,
              }}>{m.blurb}</div>
              {isActive && (
                <div style={{
                  position: "absolute",
                  left: 0, right: 0, bottom: -1,
                  height: 2,
                  background: "var(--ink)",
                }} />
              )}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: "var(--muted)" }}>
        <span className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.14em", textTransform: "uppercase" }}>USING</span>
        <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{active.label}</span>
        <span style={{ color: "var(--muted-2)" }}>·</span>
        <span>{active.blurb}</span>
      </div>
    </section>
  );
}

/* ── Target query bar ───────────────────────────────────────── */

function TargetQueryBar({ report, targetQuery, setTargetQuery, prediction }) {
  return (
    <section className="panel" style={{ padding: "18px 22px", marginBottom: 18, position: "relative" }}>
      <div className="corner-mark">QUERY</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 28, alignItems: "center" }}>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Query you're optimizing for</div>
          <select
            value={targetQuery}
            onChange={(e) => setTargetQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "11px 12px",
              fontSize: 14.5,
              fontFamily: "var(--sans)",
              fontWeight: 500,
              letterSpacing: "-0.006em",
              lineHeight: 1.35,
              color: "var(--ink)",
              background: "var(--paper)",
              border: "1px solid var(--line-2)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {report.queryScores.map((q) => (
              <option key={q.query} value={q.query}>
                {q.query}  ·  rank #{q.targetRank}  ·  {q.targetRate}% mention
              </option>
            ))}
          </select>
        </div>
        {prediction && (
          <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
            <Stat label="Current rank" value={`#${prediction.baselineRank}`} sub={prediction.targetQuery.winner !== report.brand ? `behind ${prediction.targetQuery.winner}` : "you lead"} />
            <Stat label="Mention rate" value={`${prediction.baselineRate}%`} sub="this query" />
            <Stat label="Cite probability" value={`${prediction.citeBefore}%`} sub="typical run" />
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div style={{ minWidth: 104, textAlign: "right" }}>
      <div className="mono" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-2)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div className="num" style={{ fontSize: 24, fontWeight: 650, color: "var(--ink)", lineHeight: 1.05, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{sub}</div>
    </div>
  );
}

/* ── Fan-out panel ──────────────────────────────────────────── */

function FanOutPanel({ fanOut, targetQuery }) {
  const sourceLabels = {
    "owned": "your site",
    "review-site": "review site",
    "listicle": "third-party listicle",
    "reddit": "Reddit",
    "blog": "blog",
    "case-study": "case study",
  };
  return (
    <section className="panel" style={{ padding: 0, marginBottom: 18, position: "relative" }}>
      <div className="corner-mark">FAN-OUT</div>
      <div style={{ padding: "18px 22px 10px" }}>
        <div className="label" style={{ marginBottom: 4 }}>What the LLM actually asks itself</div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.5, maxWidth: 720 }}>
          Modern assistants decompose a single user query into 3–6 sub-queries, run them in parallel, then synthesize the answer. You don't optimize for the question — you optimize for the fan-out.
        </p>
      </div>
      <div className="rule" />
      <div style={{ padding: "12px 22px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0 24px" }}>
          {fanOut.map((f, i) => (
            <FanOutRow key={i} item={f} sourceLabel={sourceLabels[f.source] || f.source} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FanOutRow({ item, sourceLabel, index }) {
  const winning = item.you >= 35;
  const losing = item.you < 15;
  const tone = winning ? "var(--moss)" : losing ? "var(--rust)" : "var(--ink-2)";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "16px 1fr auto",
      gap: 12,
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid var(--line-2)",
    }}>
      <span className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)" }}>↳{(index+1).toString().padStart(2, "0")}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", fontFamily: "var(--mono)", letterSpacing: "-0.005em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.sub}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--muted-2)", marginTop: 2, letterSpacing: "0.02em" }}>
          dominant source: <span style={{ color: "var(--muted)" }}>{sourceLabel}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 60, height: 4, background: "var(--paper-2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${item.you}%`, height: "100%", background: tone, opacity: 0.85 }} />
        </div>
        <span className="num" style={{ fontSize: 12, fontWeight: 600, color: tone, fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>
          {item.you}%
        </span>
      </div>
    </div>
  );
}

/* ── Plays section ──────────────────────────────────────────── */

function PlaysSection({ plays, activePlayIds, togglePlay, expandedPlay, setExpandedPlay, report, ownedAssets, selectedAsset, setSelectedAssetId }) {
  const categories = [
    { id: "owned",      label: "Edit owned content",   blurb: "Rewrite or publish pages on your site. Fastest, but lowest ceiling." },
    { id: "earned",     label: "Earn third-party citations", blurb: "Reddit, listicles, reviews, original research. ~88% of LLM citations are not yours." },
    { id: "structural", label: "Fix structure & entity",     blurb: "Schema, freshness, brand consistency. Boring; compounds." },
  ];
  return (
    <section style={{ marginBottom: 18 }}>
      <div className="label" style={{ marginBottom: 12, paddingLeft: 2 }}>Plays</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {categories.map((cat) => (
          <CategoryBlock
            key={cat.id}
            cat={cat}
            plays={plays.filter((p) => p.category === cat.id)}
            activePlayIds={activePlayIds}
            togglePlay={togglePlay}
            expandedPlay={expandedPlay}
            setExpandedPlay={setExpandedPlay}
            report={report}
            ownedAssets={cat.id === "owned" ? ownedAssets : null}
            selectedAsset={selectedAsset}
            setSelectedAssetId={setSelectedAssetId}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryBlock({ cat, plays, activePlayIds, togglePlay, expandedPlay, setExpandedPlay, report, ownedAssets, selectedAsset, setSelectedAssetId }) {
  return (
    <div className="panel" style={{ padding: 0, position: "relative" }}>
      <div style={{ padding: "16px 22px 12px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: "-0.014em", color: "var(--ink)" }}>{cat.label}</h3>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "4px 0 0", lineHeight: 1.5 }}>{cat.blurb}</p>
        </div>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.12em" }}>
          {plays.filter((p) => activePlayIds.includes(p.id)).length}/{plays.length} active
        </span>
      </div>

      {/* asset picker for owned plays */}
      {ownedAssets && (
        <>
          <div className="rule" />
          <div style={{ padding: "12px 22px", background: "var(--paper)" }}>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.12em", marginBottom: 8 }}>WHICH PAGE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ownedAssets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAssetId(a.id)}
                  style={{
                    padding: "7px 11px",
                    fontSize: 11.5,
                    background: selectedAsset?.id === a.id ? "var(--ink)" : "var(--paper)",
                    color: selectedAsset?.id === a.id ? "var(--paper)" : "var(--ink-2)",
                    border: "1px solid " + (selectedAsset?.id === a.id ? "var(--ink)" : "var(--line-2)"),
                    borderRadius: 4,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{a.role}</span>
                  {a.missing && <span style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: 0.7 }}>· not yet published</span>}
                </button>
              ))}
            </div>
            {selectedAsset && (
              <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--paper-2)", border: "1px solid var(--line-2)", borderRadius: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>{selectedAsset.url}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)" }}>updated {selectedAsset.lastUpdated}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55, fontStyle: selectedAsset.missing ? "italic" : "normal", opacity: selectedAsset.missing ? 0.7 : 1 }}>
                  {selectedAsset.currentSnippet}
                </div>
                {selectedAsset.weaknesses?.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedAsset.weaknesses.map((w) => (
                      <span key={w} style={{ fontSize: 10.5, color: "var(--rust)", background: "rgba(168,97,46,0.08)", padding: "2px 7px", borderRadius: 3, fontFamily: "var(--mono)", letterSpacing: "0.02em" }}>
                        — {w}
                      </span>
                    ))}
                    {selectedAsset.strengths?.map((s) => (
                      <span key={s} style={{ fontSize: 10.5, color: "var(--moss)", background: "rgba(58,122,100,0.08)", padding: "2px 7px", borderRadius: 3, fontFamily: "var(--mono)", letterSpacing: "0.02em" }}>
                        + {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <div className="rule" />
      <div style={{ padding: "0 22px 18px" }}>
        {plays.map((p, i) => (
          <PlayRow
            key={p.id}
            play={p}
            isActive={activePlayIds.includes(p.id)}
            isExpanded={expandedPlay === p.id}
            onToggle={() => togglePlay(p.id)}
            onExpand={() => setExpandedPlay(expandedPlay === p.id ? null : p.id)}
            report={report}
            selectedAsset={selectedAsset}
            isLast={i === plays.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function PlayRow({ play, isActive, isExpanded, onToggle, onExpand, report, selectedAsset, isLast }) {
  const ctx = {
    brand: report.brand,
    competitor: report.competitors[0] || "competitor",
    useCase: (report.description || "").split(/[.,]/)[0]?.trim().toLowerCase() || "your category",
    host: (report.website || `https://${report.brand.toLowerCase().replace(/\s+/g, "")}.com`).replace(/\/$/, ""),
    assetUrl: selectedAsset?.url || "<page>",
    subreddit: report.brand === "Bitsy" ? "SaaS" : "marketing",
    subreddit2: "Entrepreneur",
  };
  const where = typeof play.where === "function" ? play.where(selectedAsset, ctx) : play.where;
  const whatText = play.what(ctx);

  return (
    <div style={{ borderTop: "1px solid var(--line-2)" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "22px 1fr auto auto",
        gap: 14,
        alignItems: "center",
        padding: "14px 4px",
      }}>
        {/* check */}
        <button
          onClick={onToggle}
          style={{
            width: 18, height: 18, borderRadius: 3,
            border: "1.5px solid " + (isActive ? "var(--ink)" : "var(--line-3)"),
            background: isActive ? "var(--ink)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--paper)", fontSize: 11, fontWeight: 700,
            cursor: "pointer", padding: 0,
          }}
        >{isActive ? "✓" : ""}</button>

        {/* title + where */}
        <div onClick={onExpand} style={{ cursor: "pointer", minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.012em" }}>
            {play.title}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
            ↳ {where}
          </div>
        </div>

        {/* meta chips */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <MetaChip label="effort" value={play.effort} />
          <MetaChip label="time" value={play.timeToImpact} mono />
        </div>

        {/* lift */}
        <div style={{ textAlign: "right", minWidth: 78 }}>
          <div className="num" style={{ fontSize: 16, fontWeight: 600, color: "var(--moss)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            +{play.lift.mid}%
          </div>
          <div className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", marginTop: 3, letterSpacing: "0.04em" }}>
            range {play.lift.low}–{play.lift.high}
          </div>
        </div>
      </div>

      {/* expanded "how to" */}
      {isExpanded && (
        <div style={{ padding: "0 4px 18px 36px", marginTop: -4 }}>
          <div style={{ background: "var(--paper)", border: "1px solid var(--line-2)", borderRadius: 5, padding: "16px 18px" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.16em", marginBottom: 10 }}>{play.whatTitle.toUpperCase()}</div>
            <pre style={{
              margin: 0,
              fontFamily: "var(--sans)",
              fontSize: 12.5,
              lineHeight: 1.65,
              color: "var(--ink-2)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>{whatText}</pre>
            <div className="rule" style={{ margin: "14px -18px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "start" }}>
              <span className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.14em", paddingTop: 2 }}>SOURCE</span>
              <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.55 }}>
                {play.citations.join(" · ")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaChip({ label, value, mono }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, color: "var(--muted)",
      padding: "3px 8px",
      background: "var(--paper)",
      border: "1px solid var(--line-2)",
      borderRadius: 3,
      fontFamily: mono ? "var(--mono)" : "inherit",
      letterSpacing: mono ? "0.02em" : 0,
    }}>
      <span className="mono" style={{ fontSize: 9, color: "var(--muted-2)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ color: "var(--ink-2)" }}>{value}</span>
    </span>
  );
}

/* ── Prediction panel ───────────────────────────────────────── */

function PredictionPanel({ prediction, report }) {
  if (!prediction) return null;
  const empty = prediction.activeCount === 0;

  // Competitor context: leader for THIS query, plus #1 in overall leaderboard
  const queryLeaderRate = Math.min(95, Math.round(prediction.baselineRate + prediction.targetQuery.gap));
  const queryLeaderName = prediction.targetQuery.winner;
  const overallLeader = report.leaderboard.find((r) => !r.isTarget) || null;
  // Ceiling: max realistic for this query — must always exceed both the prediction
  // range and the leader (otherwise "ceiling" is below predicted, which is incoherent).
  const ceilingFromGap = prediction.baselineRate + 38;
  const ceilingFromLeader = queryLeaderRate + 6;
  const ceilingFromRange = (prediction.rangeHigh || 0) + 4;
  const ceiling = Math.min(95, Math.max(ceilingFromGap, ceilingFromLeader, ceilingFromRange));

  // Build the competitive ladder for this query: you, query-leader, overall #1 (if different)
  const ladder = [];
  ladder.push({ name: report.brand, rate: prediction.baselineRate, kind: "you" });
  if (queryLeaderName && queryLeaderName !== report.brand) {
    ladder.push({ name: queryLeaderName, rate: queryLeaderRate, kind: "leader" });
  }
  if (overallLeader && overallLeader.brand !== queryLeaderName && overallLeader.brand !== report.brand) {
    ladder.push({ name: overallLeader.brand, rate: Math.round(overallLeader.mentionRate), kind: "rival" });
  }
  ladder.sort((a, b) => a.rate - b.rate);

  if (empty) {
    return <EmptyPrediction prediction={prediction} report={report} ladder={ladder} ceiling={ceiling} />;
  }

  return <ActivePrediction prediction={prediction} report={report} ladder={ladder} ceiling={ceiling} />;
}

/* ── Empty (diagnostic) state ───────────────────────────────── */

function EmptyPrediction({ prediction, report, ladder, ceiling }) {
  const you = ladder.find((l) => l.kind === "you");
  const top = ladder[ladder.length - 1];
  const gapToTop = top.rate - you.rate;

  return (
    <section className="panel" style={{ padding: 0, marginBottom: 18, position: "relative" }}>
      <div className="corner-mark">BASELINE</div>
      <div style={{ padding: "22px 24px 20px" }}>
        <div className="label" style={{ marginBottom: 6 }}>Where you stand on this query</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 16, color: "var(--ink-2)", letterSpacing: "-0.012em", marginBottom: 18, fontStyle: "italic" }}>
          “{prediction.targetQuery.query}”
        </div>

        <CompetitiveLadder ladder={ladder} ceiling={ceiling} highlightYou />

        <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--paper-2)", border: "1px solid var(--line-2)", borderRadius: 4, display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "start" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.14em", paddingTop: 2 }}>NEXT</span>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
            {gapToTop > 0
              ? <>{gapToTop}pp behind <span style={{ color: "var(--ink)", fontWeight: 600 }}>{top.name}</span>. Toggle plays above — the prediction panel will show the lift, expected rank shift, and where each assistant moves.</>
              : <>You lead this query. Stack defensive plays (freshness, schema, fresh reviews) to hold position; competitors will close the gap otherwise.</>
            }
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Active (predicting) state ──────────────────────────────── */

function ActivePrediction({ prediction, report, ladder, ceiling }) {
  // augment the ladder with the predicted "after" position
  const afterLadder = [
    ...ladder,
    { name: "predicted", rate: prediction.avgAfter, kind: "after", rangeLow: prediction.rangeLow, rangeHigh: prediction.rangeHigh },
  ].sort((a, b) => a.rate - b.rate);

  return (
    <section className="panel" style={{ padding: 0, marginBottom: 18, position: "relative" }}>
      <div className="corner-mark">PREDICTION</div>
      <div style={{ padding: "22px 24px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 32, alignItems: "start" }}>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Predicted mention rate · this query</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span className="num" style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--ink)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {prediction.avgAfter}<span style={{ fontSize: 26, color: "var(--muted-2)" }}>%</span>
              </span>
              <div>
                <div className="num" style={{ fontSize: 18, fontWeight: 500, color: prediction.lift > 0 ? "var(--moss)" : prediction.lift < 0 ? "var(--rust)" : "var(--muted-2)", fontVariantNumeric: "tabular-nums" }}>
                  {prediction.lift > 0 ? "+" : ""}{prediction.lift}pp
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--muted-2)", letterSpacing: "0.06em" }}>
                  likely {prediction.rangeLow}–{prediction.rangeHigh}% · {prediction.confidence}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <Outcome label="Expected rank" before={`#${prediction.baselineRank}`} after={`#${prediction.newRank}`} improved={prediction.newRank < prediction.baselineRank} />
            <Outcome label="Cite probability" before={`${prediction.citeBefore}%`} after={`${prediction.citeAfter}%`} improved={prediction.citeAfter > prediction.citeBefore} />
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <CompetitiveLadder ladder={afterLadder} ceiling={ceiling} />
        </div>
      </div>

      <div className="rule" />
      <div style={{ padding: "16px 24px" }}>
        <div className="label" style={{ marginBottom: 12 }}>Where the lift comes from · per assistant</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {prediction.targets.map((t) => (
            <AssistantDeltaRow key={t.key} target={t} />
          ))}
        </div>
      </div>

      <div className="rule" />
      <div style={{ padding: "16px 24px 22px" }}>
        <div className="label" style={{ marginBottom: 12 }}>
          Stack contribution
          <span className="mono" style={{ marginLeft: 8, fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.06em", textTransform: "none" }}>
            · raw lift · diminishing-returns adjusted
          </span>
        </div>
        <StackContribution prediction={prediction} />
      </div>
    </section>
  );
}

/* ── Competitive ladder (the new horizontal track) ──────────── */

function CompetitiveLadder({ ladder, ceiling, highlightYou }) {
  // Primary ticks (you / predicted) always sit ABOVE the track. Secondaries (competitors)
  // go below by default; if two secondaries are too close on the same row, the second
  // gets pushed slightly to row 2 below.
  const primaries = ladder.filter((l) => l.kind === "you" || l.kind === "after");
  const secondaries = ladder.filter((l) => l.kind !== "you" && l.kind !== "after").sort((a, b) => a.rate - b.rate);

  // Stagger secondaries: walk left→right; if too close to the previous on row 0, push to row 1
  let lastRowRates = [-100, -100];
  const minDist = 8;
  const secondariesWithSlot = secondaries.map((s) => {
    let row = 0;
    if (s.rate - lastRowRates[0] < minDist) row = 1;
    if (row === 1 && s.rate - lastRowRates[1] < minDist) row = 0; // both crowded
    lastRowRates[row] = s.rate;
    return { ...s, slot: "below", row };
  });

  // Primaries: if two are within 7%, push the first one to a slightly higher row
  let primariesWithSlot = primaries.map((p) => ({ ...p, slot: "above", row: 0 }));
  if (primariesWithSlot.length === 2) {
    const sorted = [...primariesWithSlot].sort((a, b) => a.rate - b.rate);
    if (Math.abs(sorted[1].rate - sorted[0].rate) < 7) {
      primariesWithSlot = primariesWithSlot.map((p) => p === sorted[0] ? { ...p, row: 1 } : p);
    }
  }

  const allTicks = [...primariesWithSlot, ...secondariesWithSlot];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Mention rate · this query
        </span>
        <span className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.08em" }}>
          ceiling · <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{ceiling}%</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 168 }}>
        {/* Ceiling vertical marker */}
        <div style={{
          position: "absolute",
          left: `${ceiling}%`,
          top: 70, bottom: 70,
          width: 0,
          borderLeft: "1px dashed var(--line-3)",
          opacity: 0.85,
        }} />

        {/* Track */}
        <div style={{
          position: "absolute",
          left: 0, right: 0,
          top: 82,
          height: 6,
          background: "var(--paper-2)",
          borderRadius: 3,
        }} />

        {/* 25 / 50 / 75 reference ticks (very subtle) */}
        {[25, 50, 75].map((v) => (
          <div key={v} style={{
            position: "absolute",
            left: `${v}%`,
            top: 86, height: 2, width: 1,
            background: "var(--line-3)",
            opacity: 0.5,
          }} />
        ))}

        {/* Filled portion from 0 to highest "you" or "after" position */}
        {(() => {
          const farthestYou = primariesWithSlot.sort((a, b) => b.rate - a.rate)[0];
          if (!farthestYou) return null;
          return (
            <div style={{
              position: "absolute",
              left: 0,
              width: `${farthestYou.rate}%`,
              top: 82, height: 6,
              background: "var(--ink)",
              opacity: 0.85,
              borderRadius: 3,
              transition: "width 320ms cubic-bezier(0.4, 0, 0.2, 1)",
            }} />
          );
        })()}

        {/* Range band */}
        {primariesWithSlot.find((l) => l.kind === "after") && (() => {
          const after = primariesWithSlot.find((l) => l.kind === "after");
          return (
            <div style={{
              position: "absolute",
              left: `${after.rangeLow}%`,
              width: `${Math.max(1, after.rangeHigh - after.rangeLow)}%`,
              top: 76, height: 18,
              background: "var(--ink)",
              opacity: 0.1,
              borderRadius: 4,
              pointerEvents: "none",
            }} />
          );
        })()}

        {/* Ticks */}
        {allTicks.map((l, i) => <LadderTick key={`${l.kind}-${i}`} item={l} />)}
      </div>
    </div>
  );
}

function LadderTick({ item }) {
  const isYou = item.kind === "you";
  const isAfter = item.kind === "after";
  const isPrimary = isYou || isAfter;

  const tickColor = isAfter ? "var(--moss)" : isYou ? "var(--ink)" : "var(--muted-2)";
  // Ticks sit ON or BELOW the track only — never extending above it (where labels live).
  const tickHeight = isPrimary ? 18 : 14;
  // Track sits at top:82, height 6. Tick starts at track top.
  const tickTop = isPrimary ? 82 : 84;

  // Label rows. Above-track row 0 must clear the track entirely.
  // Above-track: row 0 = 36 (clears track at 82, label ~28px tall ends at ~64, 18px gap to track).
  //              row 1 = 0  (50px gap from row 0).
  // Below-track: row 0 = 100 (track ends at 88, 12px gap), row 1 = 138 (38px below row 0).
  let labelTop;
  if (item.slot === "above") {
    labelTop = item.row === 1 ? 0 : 50;
  } else {
    labelTop = item.row === 1 ? 138 : 100;
  }

  const labelText = isYou ? "you" : isAfter ? "predicted" : item.name;
  const valueText = `${item.rate}%`;

  return (
    <>
      <div style={{
        position: "absolute",
        left: `${item.rate}%`,
        top: tickTop,
        width: isPrimary ? 2 : 1,
        height: tickHeight,
        background: tickColor,
        transform: "translateX(-50%)",
        borderRadius: 1,
        transition: "left 320ms cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: isPrimary ? 1 : 0.7,
      }} />
      <div style={{
        position: "absolute",
        left: `${item.rate}%`,
        top: labelTop,
        transform: "translateX(-50%)",
        textAlign: "center",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        transition: "left 320ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="mono" style={{
          fontSize: 9.5,
          color: tickColor,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: isPrimary ? 600 : 400,
          opacity: isPrimary ? 1 : 0.85,
        }}>
          {labelText}
        </div>
        <div className="num" style={{
          fontSize: isPrimary ? 12 : 10.5,
          fontWeight: isPrimary ? 600 : 500,
          color: isPrimary ? "var(--ink)" : "var(--muted)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.005em",
          marginTop: 1,
        }}>
          {valueText}
        </div>
      </div>
    </>
  );
}

/* ── Per-assistant delta-focused row ────────────────────────── */

function AssistantDeltaRow({ target }) {
  const positive = target.deltaPp > 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 84px", gap: 14, alignItems: "center" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--ink)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: target.color }} />
        {target.label}
      </span>
      <div style={{ position: "relative", height: 18 }}>
        {/* baseline marker */}
        <div style={{ position: "absolute", left: `${target.before}%`, top: 0, bottom: 0, width: 1, background: "var(--muted-2)", opacity: 0.6 }} />
        {/* delta bar from before to after */}
        {target.deltaPp !== 0 && (
          <div style={{
            position: "absolute",
            left: `${Math.min(target.before, target.after)}%`,
            width: `${Math.abs(target.deltaPp)}%`,
            top: 6, height: 6,
            background: positive ? "var(--moss)" : "var(--rust)",
            opacity: 0.85,
            borderRadius: 3,
            transition: "left 320ms, width 320ms",
          }} />
        )}
        {/* after notch */}
        <div style={{
          position: "absolute",
          left: `${target.after}%`,
          top: 2, width: 2, height: 14,
          background: "var(--ink)",
          transform: "translateX(-1px)",
          transition: "left 320ms cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
      <div style={{ textAlign: "right" }}>
        <span className="num" style={{ fontSize: 13, fontWeight: 600, color: positive ? "var(--moss)" : target.deltaPp < 0 ? "var(--rust)" : "var(--muted-2)", fontVariantNumeric: "tabular-nums" }}>
          {positive ? "+" : ""}{target.deltaPp}pp
        </span>
        <div className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.04em", marginTop: 1 }}>
          {target.before}→{target.after}%
        </div>
      </div>
    </div>
  );
}

/* ── Stack contribution (per-play, with decay made visible) ── */

function StackContribution({ prediction }) {
  // Replicate the per-play decay so we can show raw vs adjusted contribution.
  // (Source of truth lives in simulate-data; we mirror the math here for display.)
  const plays = prediction.activePlays;
  const rows = plays.map((p, i) => {
    const decay = Math.pow(0.9, i);
    const raw = p.lift.mid;
    const adj = Math.round(raw * decay * 10) / 10;
    return { id: p.id, title: p.title, raw, adj, decay };
  });
  const adjTotal = rows.reduce((s, r) => s + r.adj, 0);
  const maxRaw = Math.max(...rows.map((r) => r.raw), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 200px 110px", gap: 14, alignItems: "center" }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
          <div style={{ position: "relative", height: 14 }}>
            {/* raw lift bar (faded) */}
            <div style={{
              position: "absolute", left: 0, top: 4, height: 6,
              width: `${(r.raw / maxRaw) * 100}%`,
              background: "var(--muted-2)",
              opacity: 0.32,
              borderRadius: 3,
            }} />
            {/* adjusted bar (solid) */}
            <div style={{
              position: "absolute", left: 0, top: 4, height: 6,
              width: `${(r.adj / maxRaw) * 100}%`,
              background: "var(--moss)",
              opacity: 0.92,
              borderRadius: 3,
              transition: "width 280ms",
            }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="num" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through", fontVariantNumeric: "tabular-nums", marginRight: 8 }}>
              +{r.raw}
            </span>
            <span className="num" style={{ fontSize: 13, fontWeight: 600, color: "var(--moss)", fontVariantNumeric: "tabular-nums" }}>
              +{r.adj}
            </span>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--line-2)", display: "grid", gridTemplateColumns: "1fr 200px 110px", gap: 14, alignItems: "center" }}>
        <span style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 500 }}>Total adjusted lift</span>
        <span />
        <span className="num" style={{ textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
          +{Math.round(adjTotal * 10) / 10}pp
        </span>
      </div>
    </div>
  );
}

function Outcome({ label, before, after, improved }) {
  const tone = improved ? "var(--moss)" : "var(--muted-2)";
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="num" style={{ fontSize: 22, fontWeight: 500, color: "var(--muted-2)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
          {before}
        </span>
        <span style={{ color: "var(--muted-2)", fontSize: 14 }}>→</span>
        <span className="num" style={{ fontSize: 26, fontWeight: 600, color: tone, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em" }}>
          {after}
        </span>
      </div>
    </div>
  );
}

function AssistantRow({ target }) {
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
          opacity: 0.9,
          transition: "width 320ms cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    </div>
  );
}

/* ── Method ─────────────────────────────────────────────────── */

function Method() {
  return (
    <section className="panel" style={{ padding: "18px 24px", background: "var(--paper)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "start" }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.16em" }}>METHOD</span>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.65 }}>
          Each play's lift range is sourced from the GEO benchmark <span className="mono">(Aggarwal et al., KDD '24)</span>, AirOps citation telemetry, and Princeton/Stanford studies on LLM source bias. The fan-out shows the sub-queries an LLM decomposes a request into before retrieval — your visibility is the average across those, not the surface query.
          Stacked plays apply diminishing-returns decay <span className="mono">(0.9ⁿ)</span>; per-assistant sensitivities reflect each model's documented preferences (ChatGPT favors Reddit + listicles, Gemini weights schema, Claude weights citations + structure).
          Predictions are <span style={{ color: "var(--ink)", fontWeight: 500 }}>directional 80% intervals</span>, not guarantees — only ~30% of brand mentions persist across consecutive runs of the same prompt.
        </div>
      </div>
    </section>
  );
}

/* ── Draft mode ──────────────────────────────────────────────
   Paste an actual draft (or an existing page URL’s text). We
   extract content features, score them with the same weights
   the surrogate model uses, and project a lift on overall
   mention rate. Keeps the same Method footer for honesty. */

const DRAFT_EXAMPLES = {
  comparison: `Zalando vs ASOS: which European fashion store is right for you in 2026

Quick verdict
Zalando wins on size and free returns. ASOS wins on trend speed.

|                          | Zalando                | ASOS                  |
| ------------------------ | ---------------------- | --------------------- |
| Catalog size             | 2.1m+ items            | 850k items            |
| Free returns window      | 100 days               | 28 days               |
| Average shipping (EU)    | 3–5 days               | 4–7 days              |
| Sustainability score     | 4.1/5 (Good On You)    | 3.4/5 (Good On You)   |

According to Statista 2024 data, Zalando processed 47% of EU online fashion returns last year — a number that gives EU shoppers genuine confidence to try sizes at home.

“We picked Zalando because the 100-day return window means we can buy two sizes and decide,” said Anna K., a customer in Berlin.

Use ASOS if: you’re under 25 and want bleeding-edge UK street trends.
Use Zalando if: you value catalogue depth, mainstream EU brands, and frictionless returns.`,
  refresh: `Best online fashion store in Europe (2026 update)

Last updated: April 2026.

We re-ran our 2024 analysis with new data: 1,200 EU shoppers, surveyed in February 2026. Top three by overall satisfaction:

1. Zalando — 4.6/5. 47% market share of EU fashion returns. Catalogue: 2.1m+ items.
2. ASOS — 4.1/5. UK strength, fast trend cycles.
3. Zara — 4.0/5. Best for fast fashion drops.

Notable shift: Zalando’s NPS rose from 42 to 51 between 2024 and 2026, primarily driven by the 100-day return policy expansion.`,
};

function DraftMode({ report, draftText, setDraftText }) {
  const features = useMemoS(() => extractDraftFeatures(draftText), [draftText]);
  const draftPrediction = useMemoS(() => predictFromDraft(report, features), [report, features]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <DraftEditor
        draftText={draftText}
        setDraftText={setDraftText}
        report={report}
      />
      <DraftFeaturesPanel features={features} />
      <DraftPredictionPanel prediction={draftPrediction} report={report} />
    </div>
  );
}

function DraftEditor({ draftText, setDraftText, report }) {
  return (
    <section className="panel" style={{ padding: 0, position: "relative" }}>
      <div className="corner-mark">DRAFT</div>
      <div style={{ padding: "20px 22px 12px" }}>
        <div className="label" style={{ marginBottom: 6 }}>Paste your draft (or an existing page’s text)</div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.55, maxWidth: 720 }}>
          The model reads <em>features</em>, not prose: how many concrete numbers, named sources, quotations,
          comparison signals, and external citations the page contains. Paste at least 200 words for a usable signal.
        </p>
      </div>

      <div style={{ padding: "0 22px 12px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="micro" style={{ marginRight: 4 }}>Try an example</span>
        <button
          className="btn"
          style={{ padding: "5px 10px", fontSize: 11 }}
          onClick={() => setDraftText(DRAFT_EXAMPLES.comparison.replaceAll("Zalando", report.brand))}
        >
          Comparison page
        </button>
        <button
          className="btn"
          style={{ padding: "5px 10px", fontSize: 11 }}
          onClick={() => setDraftText(DRAFT_EXAMPLES.refresh.replaceAll("Zalando", report.brand))}
        >
          Refreshed listicle
        </button>
        <button
          className="btn"
          style={{ padding: "5px 10px", fontSize: 11 }}
          onClick={() => setDraftText("")}
          disabled={!draftText}
        >
          Clear
        </button>
      </div>

      <div style={{ padding: "0 22px 20px" }}>
        <textarea
          className="field"
          rows={14}
          placeholder={"Paste a draft, an existing page’s body copy, or a markdown comparison table.\n\nExample: best European fashion store in 2026, with named comparisons, recent statistics, and customer quotes."}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 12.5, lineHeight: 1.55, resize: "vertical" }}
        />
      </div>
    </section>
  );
}

function DraftFeaturesPanel({ features }) {
  if (!features) {
    return (
      <section className="panel" style={{ padding: "16px 22px", position: "relative" }}>
        <div className="corner-mark">FEATURES</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, maxWidth: 640 }}>
          Paste at least a paragraph of content above and we’ll score it on the same dimensions the surrogate
          model uses: <span className="mono">citations · named sources · quotations · statistics · comparison signals · freshness · table structure</span>.
        </div>
      </section>
    );
  }

  const cells = [
    { key: "wordCount",     label: "Words",                 value: features.wordCount,     hint: "more is not always better" },
    { key: "stats",         label: "Concrete numbers",       value: features.stats,         hint: "stats density" },
    { key: "citations",     label: "External links",         value: features.citations,     hint: "third-party" },
    { key: "namedSources",  label: "Named sources",          value: features.namedSources,  hint: "“According to…”" },
    { key: "quotes",        label: "Quotations",             value: features.quotes,        hint: "expert / customer" },
    { key: "tableSig",      label: "Comparison tables",      value: features.tableSig,      hint: "table rows" },
    { key: "compHint",      label: "Comparison signals",     value: features.compHint ? "✓" : "—", hint: "vs / alternative / unlike" },
    { key: "fresh",         label: "Recent year reference",  value: features.fresh ? "✓" : "—", hint: "2024+" },
  ];

  return (
    <section className="panel" style={{ padding: 0, position: "relative" }}>
      <div className="corner-mark">FEATURES</div>
      <div style={{ padding: "16px 22px 8px" }}>
        <div className="label" style={{ marginBottom: 4 }}>What we extracted</div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>
          Heuristic in this mock; production pipes draft text through the real <span className="mono">analyze-content</span> service.
        </p>
      </div>
      <div className="rule" />
      <div style={{ padding: "14px 22px 18px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {cells.map((c) => (
          <div key={c.key} style={{ background: "var(--paper)", border: "1px solid var(--line-2)", borderRadius: 6, padding: "10px 12px" }}>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{c.label}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.018em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {c.value}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted-2)", marginTop: 4 }}>{c.hint}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DraftPredictionPanel({ prediction, report }) {
  if (!prediction) {
    return (
      <section className="panel" style={{ padding: "16px 22px", position: "relative" }}>
        <div className="corner-mark">PREDICTION</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
          Prediction will appear once we have enough content to score.
        </div>
      </section>
    );
  }

  const arrowColor = prediction.lift > 0 ? "var(--moss)" : prediction.lift < 0 ? "var(--rust)" : "var(--muted-2)";

  return (
    <section className="panel" style={{ padding: 0, position: "relative" }}>
      <div className="corner-mark">PREDICTION</div>
      <div style={{ padding: "22px 24px 18px" }}>
        <div className="label" style={{ marginBottom: 8 }}>Predicted overall mention rate · if you ship this</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span className="num" style={{
              fontFamily: "var(--sans)", fontSize: 64, fontWeight: 600,
              letterSpacing: "-0.03em", color: "var(--ink)",
              lineHeight: 0.95, fontVariantNumeric: "tabular-nums",
            }}>
              {prediction.predicted}<span style={{ fontSize: 26, color: "var(--muted-2)", fontWeight: 500 }}>%</span>
            </span>
            <div>
              <div className="num" style={{ fontSize: 18, fontWeight: 600, color: arrowColor, fontVariantNumeric: "tabular-nums" }}>
                {prediction.lift > 0 ? "+" : ""}{prediction.lift}pp
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--muted-2)", letterSpacing: "0.06em", marginTop: 2 }}>
                from {prediction.baseline}% baseline · likely {prediction.rangeLow}–{prediction.rangeHigh}% · {prediction.confidence}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, justifyItems: "end" }}>
            <Outcome label="Baseline" before="—" after={`${prediction.baseline}%`} improved={false} />
            <Outcome label="With this draft" before={`${prediction.baseline}%`} after={`${prediction.predicted}%`} improved={prediction.lift > 0} />
          </div>
        </div>
      </div>

      <div className="rule" />

      <div style={{ padding: "16px 24px 22px" }}>
        <div className="label" style={{ marginBottom: 12 }}>Where the lift comes from</div>
        {prediction.drivers.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            The draft has no features the surrogate weighs heavily yet — add comparisons, citations, statistics, or quotations.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {prediction.drivers.map((d) => {
              const max = Math.max(...prediction.drivers.map((x) => x.value), 1);
              return (
                <div key={d.label} style={{ display: "grid", gridTemplateColumns: "1fr 240px 80px", gap: 14, alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{d.label}</span>
                  <div style={{ height: 6, background: "var(--paper-2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(d.value / max) * 100}%`, background: "var(--moss)", opacity: 0.9, borderRadius: 3 }} />
                  </div>
                  <span className="num" style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--moss)", fontVariantNumeric: "tabular-nums" }}>
                    +{Math.round(d.value * 10) / 10}pp
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rule" />
      <div style={{ padding: "14px 24px 18px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "start" }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.14em", paddingTop: 2 }}>NEXT</span>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
          {prediction.lift >= 6
            ? <>Strong draft. Ship it, then return to <span style={{ color: "var(--ink)", fontWeight: 600 }}>Verify</span> in two weeks to compare actual lift to this prediction.</>
            : prediction.lift >= 2
              ? <>Moderate signal. Tighten the comparisons, add a named source or two, and re-score before shipping.</>
              : <>The draft reads well to humans but doesn’t carry the features that move {report.brand}’s mention rate. Try the <span style={{ color: "var(--ink)", fontWeight: 600 }}>Plays</span> mode for a curated archetype.</>
          }
        </div>
      </div>
    </section>
  );
}

function extractDraftFeatures(text) {
  if (!text || text.trim().length < 50) return null;
  const wordCount = text.trim().split(/\s+/).length;
  const stats = (text.match(/\b\d{1,5}(?:[.,]\d+)?\s?(?:%|pp|x|k|m|b|mo|days|years?)?\b/gi) || []).length;
  const quotes = (text.match(/[“"][^“"”\n]{18,}[”"]/g) || []).length;
  const citations = (text.match(/https?:\/\/\S+/g) || []).length;
  const tableSig = (text.match(/^\s*\|.+\|\s*$/gm) || []).length;
  const namedSources = (text.match(/\b(?:according to|reports?|study|survey|data shows|found that|analysis|benchmark)\b/gi) || []).length;
  const fresh = /\b20(2[4-9]|3\d)\b/.test(text);
  const compHint = /\b(?:vs\.?|versus|alternative|compared to|differs from|unlike|similar to)\b/i.test(text);
  const headings = (text.match(/^#{1,3}\s+\S|^[A-Z][^.\n]{4,}\n[-=]{3,}/gm) || []).length;

  return {
    wordCount, stats, quotes, citations, tableSig, namedSources,
    fresh, compHint, headings,
  };
}

function predictFromDraft(report, features) {
  if (!features) return null;
  const baseline = Math.round(report.baseline);

  const drivers = [
    { label: "third-party citations", value: Math.min(features.citations, 8) * 1.6 },
    { label: "named sources",          value: Math.min(features.namedSources, 6) * 1.2 },
    { label: "expert quotations",      value: Math.min(features.quotes, 4) * 1.35 },
    { label: "comparison table",       value: features.tableSig >= 3 ? 4 : features.tableSig > 0 ? 2 : 0 },
    { label: "comparison language",    value: features.compHint ? 3.5 : 0 },
    { label: "concrete statistics",    value: Math.min(features.stats, 14) * 0.45 },
    { label: "heading structure",      value: Math.min(features.headings, 6) * 0.4 },
    { label: "freshness reference",    value: features.fresh ? 1.6 : 0 },
  ].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  const totalLift = drivers.reduce((s, d) => s + d.value, 0);
  const cappedLift = Math.min(34, Math.round(totalLift));
  const predicted = Math.min(95, baseline + cappedLift);

  const driverCount = drivers.length;
  const conf = features.wordCount < 200 ? "low confidence"
    : driverCount >= 5 ? "medium-high confidence"
      : driverCount >= 3 ? "medium confidence"
        : "low-medium confidence";

  return {
    baseline, predicted, lift: cappedLift,
    rangeLow: Math.max(0, predicted - 5),
    rangeHigh: Math.min(95, predicted + 6),
    confidence: conf,
    drivers,
    features,
  };
}

/* ── Levers mode ─────────────────────────────────────────────
   Power-user / debug view. Pull each lever the surrogate
   weighs and see overall lift, confidence, and which lever
   is doing the most work. Reuses getSimulationOutcome()
   from logic.jsx so this stays consistent with Execute. */

const LEVERS = [
  { key: "thirdPartyMentions", label: "Third-party mentions", hint: "Listicles, reviews, podcasts that cite you", min: 0, max: 12, step: 1 },
  { key: "comparisonDepth",    label: "Comparison depth",     hint: "Tables, bullets, named alternatives",       min: 0, max: 10, step: 1 },
  { key: "expertQuotes",       label: "Expert quotations",    hint: "Named customers / analysts on the page",     min: 0, max: 8,  step: 1 },
  { key: "citations",          label: "Inline citations",     hint: "External links to evidence",                  min: 0, max: 14, step: 1 },
  { key: "statistics",         label: "Concrete statistics",  hint: "Numbered claims with units",                  min: 0, max: 18, step: 1 },
  { key: "freshness",          label: "Days since updated",   hint: "Lower is fresher; older = decay",             min: 0, max: 365, step: 7 },
];

function LeversMode({ report, controls, setControls }) {
  const outcome = useMemoS(() => getSimulationOutcome(report, controls), [report, controls]);
  const setLever = (key, value) => setControls((cur) => ({ ...cur, [key]: value }));

  function reset() { setControls(DEFAULT_SCENARIO); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <section className="panel" style={{ padding: 0, position: "relative" }}>
        <div className="corner-mark">LEVERS</div>
        <div style={{ padding: "20px 22px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Pull the levers</div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.55, maxWidth: 640 }}>
              Each lever is a real input the daily surrogate (XGBoost) weighs when it predicts mention rate.
              Drag to see the marginal effect. Read the result as <em>directional</em>, not as a forecast.
            </p>
          </div>
          <button className="btn" onClick={reset} style={{ padding: "6px 10px", fontSize: 11 }}>Reset</button>
        </div>

        <div className="rule" />

        <div style={{ padding: "16px 22px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {LEVERS.map((l) => (
            <LeverRow
              key={l.key}
              lever={l}
              value={controls[l.key]}
              onChange={(v) => setLever(l.key, v)}
              baseline={DEFAULT_SCENARIO[l.key]}
            />
          ))}
        </div>
      </section>

      <LeversOutcomePanel outcome={outcome} report={report} />
    </div>
  );
}

function LeverRow({ lever, value, onChange, baseline }) {
  const delta = value - baseline;
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line-2)", borderRadius: 6, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>{lever.label}</div>
          <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 2 }}>{lever.hint}</div>
        </div>
        <div style={{ textAlign: "right", minWidth: 72 }}>
          <span className="num" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.012em" }}>
            {value}
          </span>
          {delta !== 0 && (
            <div className="mono" style={{ fontSize: 10, color: delta > 0 ? "var(--moss)" : "var(--rust)", letterSpacing: "0.04em" }}>
              {delta > 0 ? "+" : ""}{delta} vs baseline
            </div>
          )}
        </div>
      </div>
      <input
        type="range"
        min={lever.min}
        max={lever.max}
        step={lever.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--ink)" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.04em" }}>{lever.min}</span>
        <span className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.04em" }}>{lever.max}</span>
      </div>
    </div>
  );
}

function LeversOutcomePanel({ outcome, report }) {
  const arrowColor = outcome.lift > 0 ? "var(--moss)" : outcome.lift < 0 ? "var(--rust)" : "var(--muted-2)";

  return (
    <section className="panel" style={{ padding: 0, position: "relative" }}>
      <div className="corner-mark">OUTCOME</div>
      <div style={{ padding: "22px 24px 18px" }}>
        <div className="label" style={{ marginBottom: 8 }}>Predicted overall mention rate</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span className="num" style={{
              fontFamily: "var(--sans)", fontSize: 64, fontWeight: 600,
              letterSpacing: "-0.03em", color: "var(--ink)",
              lineHeight: 0.95, fontVariantNumeric: "tabular-nums",
            }}>
              {outcome.predicted}<span style={{ fontSize: 26, color: "var(--muted-2)", fontWeight: 500 }}>%</span>
            </span>
            <div>
              <div className="num" style={{ fontSize: 18, fontWeight: 600, color: arrowColor, fontVariantNumeric: "tabular-nums" }}>
                {outcome.lift > 0 ? "+" : ""}{outcome.lift}pp
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--muted-2)", letterSpacing: "0.06em", marginTop: 2 }}>
                from {outcome.baseline}% · 80% interval {outcome.intervalLow}–{outcome.intervalHigh}% · {outcome.confidence}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, justifyItems: "end" }}>
            <Outcome label="Pressure" before="—" after={`${outcome.pressure}`} improved={false} />
            <Outcome label="Controllability" before="—" after={`${outcome.controllability}`} improved={outcome.controllability > 60} />
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted-2)", lineHeight: 1.6 }}>
          Top lever: <span style={{ color: "var(--ink)", fontWeight: 600 }}>{outcome.topDriver}</span>.
          Pressure measures how much of the category {report.brand} doesn’t already own. Controllability is how
          much of the gap can be closed with the levers above.
        </div>
      </div>

      <div className="rule" />
      <div style={{ padding: "14px 24px 18px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "start" }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.14em", paddingTop: 2 }}>WARNING</span>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
          Levers without context invite bad mental models — “add 4 quotes” is not a play. Use this view for
          sensitivity analysis (which lever moves the number most), then go back to <span style={{ color: "var(--ink)", fontWeight: 600 }}>Plays</span> or
          <span style={{ color: "var(--ink)", fontWeight: 600 }}> Draft</span> to make it concrete.
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Simulate });
