const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

function App() {
  const [activeTab, setActiveTab] = useStateApp("target");
  const [brand, setBrand] = useStateApp(PRESETS[0].brand);
  const [description, setDescription] = useStateApp(PRESETS[0].description);
  const [website, setWebsite] = useStateApp(PRESETS[0].website);
  const [competitors, setCompetitors] = useStateApp(PRESETS[0].competitors);
  const [queries, setQueries] = useStateApp(PRESETS[0].queries);
  const [mode, setMode] = useStateApp("balanced");
  const [engineState, setEngineState] = useStateApp("idle");
  const [progress, setProgress] = useStateApp(0);
  const [selectedActionId, setSelectedActionId] = useStateApp("answer-page");
  const [controls, setControls] = useStateApp(DEFAULT_SCENARIO);

  const report = useMemoApp(
    () => createEngineReport({ brand, description, website, competitorsText: competitors, queriesText: queries, mode }),
    [brand, description, website, competitors, queries, mode],
  );
  const selectedAction = report.actions.find((action) => action.id === selectedActionId) ?? report.actions[0];
  const canRun = report.readiness.filter((item) => item.ready).length >= 3;
  const activeStage = Math.min(Math.floor(progress / 21), STAGES.length - 1);

  useEffectApp(() => {
    if (!report.actions.some((action) => action.id === selectedActionId)) setSelectedActionId(report.actions[0].id);
  }, [report.actions, selectedActionId]);

  useEffectApp(() => {
    function onKey(event) {
      if (event.target && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) return;
      const index = parseInt(event.key, 10);
      if (index >= 1 && index <= LOOP_TABS.length) setActiveTab(LOOP_TABS[index - 1].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffectApp(() => {
    if (engineState !== "running") return;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(100, current + 3);
        if (next >= 100) {
          window.clearInterval(timer);
          setEngineState("complete");
        }
        return next;
      });
    }, 105);
    return () => window.clearInterval(timer);
  }, [engineState]);

  function applyPreset(preset) {
    setBrand(preset.brand);
    setDescription(preset.description || "");
    setWebsite(preset.website);
    setCompetitors(preset.competitors);
    setQueries(preset.queries);
    setSelectedActionId("answer-page");
    setControls(DEFAULT_SCENARIO);
    resetRun();
  }

  function runEngine() {
    if (!canRun || engineState === "running") return;
    setProgress(3);
    setEngineState("running");
    if (activeTab === "target") setActiveTab("observe");
  }

  function resetRun() {
    setEngineState("idle");
    setProgress(0);
  }

  function newRun() {
    resetRun();
    setActiveTab("target");
  }

  function shareRun() {
    if (navigator.clipboard) navigator.clipboard.writeText(window.location.href);
  }

  return (
    <div data-screen-label="Bitsy Engine" className="engine-shell">
      <div className="engine-chrome">
        <div className="container engine-chrome-inner">
          <header className="workspace-header">
            <div className="workspace-brandbar">
              <h1 className="workspace-title">
                {report.brand} <span>/ visibility</span>
              </h1>
              <span className="workspace-sep" />
              <div className="run-pill">
                <span
                  className="run-dot"
                  style={{
                    background: engineState === "running" ? "var(--rust)" : engineState === "complete" ? "var(--moss)" : "var(--muted-2)",
                    boxShadow: engineState === "running" ? "0 0 0 3px rgba(177,82,40,0.15)" : "none",
                    animation: engineState === "running" ? "pulse 1.4s ease-in-out infinite" : "none",
                  }}
                />
                {engineState === "running" ? `running - ${progress}%` : engineState === "complete" ? "estimate ready" : "idle"}
              </div>
              <span className="mono workspace-meta" style={{ fontSize: 10.5, color: "var(--muted-2)", letterSpacing: "0.06em" }}>
                RUN - APR 25 - 2026
              </span>
            </div>

            <div className="workspace-actions">
              <span className="mono workspace-meta" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.08em", marginRight: 4 }}>
                {mode.toUpperCase()} - {report.calls} CALLS
              </span>
              <button className="btn" style={{ padding: "7px 13px", fontSize: 12 }} onClick={shareRun}>
                Share
              </button>
              <button className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }} onClick={newRun}>
                New run
              </button>
            </div>
          </header>

          <div className="rule" />

          <div className="engine-tabbar">
            <div className="tab-row" role="tablist" aria-label="Engine workflow">
              {LOOP_TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  className="tab"
                  data-active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  <span className="tab-key">{index + 1}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="container engine-main">
        <div className="engine-page">
          {activeTab === "target" && (
            <Target
              brand={brand} setBrand={setBrand}
              description={description} setDescription={setDescription}
              website={website} setWebsite={setWebsite}
              competitors={competitors} setCompetitors={setCompetitors}
              queries={queries} setQueries={setQueries}
              mode={mode} setMode={setMode}
              report={report} presets={PRESETS} applyPreset={applyPreset}
              engineState={engineState} progress={progress} activeStage={activeStage}
              canRun={canRun} onRun={runEngine} onReset={resetRun}
            />
          )}

          {activeTab === "observe" && (
            <Observe report={report} mode={mode} setMode={setMode} engineState={engineState} progress={progress} />
          )}

          {activeTab === "simulate" && (
            <Simulate report={report} controls={controls} setControls={setControls} />
          )}

          {activeTab === "execute" && (
            <Execute
              report={report}
              selectedAction={selectedAction}
              selectedActionId={selectedActionId}
              setSelectedActionId={setSelectedActionId}
              controls={controls}
              engineState={engineState}
            />
          )}

          {activeTab === "verify" && <Verify report={report} controls={controls} />}
        </div>

        <div className="rule engine-footer-rule" />
        <p className="mono engine-footer">
          Prototype - Local deterministic estimates. Production wires Target/Observe/Simulate/Execute/Verify to real APIs.
        </p>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
