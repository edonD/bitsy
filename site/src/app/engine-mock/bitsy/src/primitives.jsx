// Shared primitive components.

const { useState, useEffect, useRef, useMemo } = React;

function Pill({ tone = "muted", children }) {
  const cls = tone === "rust" ? "pill rust" : tone === "moss" ? "pill moss" : tone === "slate" ? "pill slate" : "pill";
  return <span className={cls}><span className="dot" />{children}</span>;
}

function Label({ children, style }) {
  return <span className="label" style={style}>{children}</span>;
}

function Stat({ label, value, tone, mono }) {
  return (
    <div className="stat-block">
      <span className="label">{label}</span>
      <span className={`v ${mono ? "num" : ""}`} style={{ color: tone === "rust" ? "var(--rust)" : tone === "moss" ? "var(--moss)" : tone === "slate" ? "var(--slate)" : undefined }}>
        {value}
      </span>
    </div>
  );
}

// Hover tooltip portal — anchored to mouse
function useTooltip() {
  const [tip, setTip] = useState(null);
  const onEnter = (data) => (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ ...data, x: r.right + 10, y: r.top });
  };
  const onLeave = () => setTip(null);
  return { tip, onEnter, onLeave };
}

function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div className="tip" data-show="true" style={{ left: tip.x, top: tip.y, position: "fixed" }}>
      {tip.label && <div className="tip-label">{tip.label}</div>}
      <div>{tip.body}</div>
    </div>
  );
}

// Smoothly animate a number toward a target using rAF
function useSpring(target, { stiffness = 0.18 } = {}) {
  const [val, setVal] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    let raf;
    const tick = () => {
      const d = target - ref.current;
      if (Math.abs(d) < 0.05) { ref.current = target; setVal(target); return; }
      ref.current = ref.current + d * stiffness;
      setVal(ref.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, stiffness]);
  return val;
}

Object.assign(window, { Pill, Label, Stat, useTooltip, Tooltip, useSpring });
