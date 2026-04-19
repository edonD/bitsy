"use client";

// Global keyframes and ambient drifting color blobs used by the trace page.
// Mounting this once at the top of the page enables every component below
// to reference the `.trace-*` utility classes.

export function TraceAnimations() {
  return (
    <style jsx global>{`
      @keyframes orbSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes orbPulse {
        0%, 100% { transform: scale(1); opacity: 0.85; }
        50% { transform: scale(1.08); opacity: 1; }
      }
      @keyframes shimmerSweep {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes dotPulse {
        0%, 100% { transform: scale(1); opacity: 0.95; }
        50%      { transform: scale(1.15); opacity: 1; }
      }
      @keyframes ringPulse {
        0%   { box-shadow: 0 0 0 0 rgba(16,163,127,0.6); }
        80%  { box-shadow: 0 0 0 10px rgba(16,163,127,0); }
        100% { box-shadow: 0 0 0 0 rgba(16,163,127,0); }
      }
      .trace-ring-pulse {
        animation: ringPulse 1.6s ease-out infinite;
      }
      @keyframes thinkDots {
        0%, 20%  { content: ""; }
        40%      { content: "."; }
        60%      { content: ".."; }
        80%, 100% { content: "..."; }
      }
      @keyframes checkPop {
        0%   { transform: scale(0); opacity: 0; }
        60%  { transform: scale(1.25); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes ambientBlobA {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33%      { transform: translate(40px, -20px) scale(1.1); }
        66%      { transform: translate(-30px, 25px) scale(0.95); }
      }
      @keyframes ambientBlobB {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50%      { transform: translate(-50px, 30px) scale(1.15); }
      }
      .trace-shimmer {
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(16, 163, 127, 0.08) 40%,
          rgba(16, 163, 127, 0.16) 50%,
          rgba(16, 163, 127, 0.08) 60%,
          transparent 100%
        );
        background-size: 200% 100%;
        animation: shimmerSweep 1.8s ease-in-out infinite;
      }
      .trace-thinking::after {
        content: "";
        display: inline-block;
        animation: thinkDots 1.4s steps(4) infinite;
        min-width: 1.2em;
        text-align: left;
      }
      .trace-dot-pulse {
        animation: dotPulse 1.4s ease-in-out infinite;
      }
      .trace-check {
        animation: checkPop 0.4s cubic-bezier(0.22, 1.2, 0.36, 1) both;
      }
      .trace-ambient-a {
        animation: ambientBlobA 14s ease-in-out infinite;
      }
      .trace-ambient-b {
        animation: ambientBlobB 18s ease-in-out infinite;
      }
    `}</style>
  );
}

// Three large radial-gradient blobs that softly drift across the background.
// They fade in while work is running and fade out when the page is idle so
// the page feels calm at rest but alive during a trace.
export function AmbientBlobs({ running }: { running: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
        running ? "opacity-60" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      <div
        className="trace-ambient-a absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(16,163,127,0.35), transparent 60%)",
        }}
      />
      <div
        className="trace-ambient-b absolute top-1/3 -left-40 h-[380px] w-[380px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, rgba(66,133,244,0.28), transparent 60%)",
        }}
      />
      <div
        className="trace-ambient-a absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(217,119,6,0.22), transparent 60%)",
        }}
      />
    </div>
  );
}
