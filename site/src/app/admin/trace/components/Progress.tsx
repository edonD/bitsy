"use client";

// Progress visuals: step-number dot, the big animated status orb, the mini
// spinner, and the running-call waveform badge.

export function StepDot({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-semibold text-[var(--paper)]">
      {n}
    </span>
  );
}

// Animated orb shown while a trace is running. When idle it becomes a still
// check mark. A rotating conic-gradient ring + pulsing halo carry the "live"
// feel; a pulsing inner dot shows whether any call is still in flight.
export function StatusOrb({
  progress,
  running,
  inFlight,
}: {
  progress: number;
  running: boolean;
  inFlight: boolean;
}) {
  const size = 88;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={running ? "analysis in progress" : "analysis complete"}
    >
      {/* Outer rotating ring — brand triad colors in a conic gradient */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, #10a37f, #4285f4, #d97706, #10a37f)",
          animation: running ? "orbSpin 3.2s linear infinite" : undefined,
          opacity: running ? 1 : 0.25,
          transition: "opacity 0.6s ease",
        }}
      />
      {/* Inner mask so the ring looks hollow */}
      <div
        className="absolute rounded-full bg-[var(--paper)]"
        style={{ inset: 4 }}
      />
      {/* Gentle pulsing halo */}
      {running && (
        <div
          className="absolute rounded-full"
          style={{
            inset: -6,
            background:
              "radial-gradient(circle, rgba(16,163,127,0.28), transparent 70%)",
            animation: "orbPulse 2.4s ease-in-out infinite",
          }}
          aria-hidden="true"
        />
      )}
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {running ? (
          <div className="flex flex-col items-center">
            <div
              className="h-2.5 w-2.5 rounded-full trace-dot-pulse"
              style={{
                color: inFlight ? "#10a37f" : "#4285f4",
                backgroundColor: "currentColor",
              }}
            />
            <span className="mt-1 text-[10px] font-bold tabular-nums text-[var(--ink)]">
              {progress}%
            </span>
          </div>
        ) : progress === 100 ? (
          <svg
            className="trace-check"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "#10a37f" }}
          >
            <path d="M6 14l5 5 11-11" />
          </svg>
        ) : (
          <span className="text-[10px] font-bold text-[var(--muted)] tabular-nums">
            {progress}%
          </span>
        )}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
  );
}

// Three pulsing bars that look like a mini audio waveform. Recolored when
// the mode is search so the user can tell memory vs search runs apart at a
// glance without expanding the card.
export function RunningBadge({ isSearch }: { isSearch: boolean }) {
  const color = isSearch ? "#4285f4" : "#10a37f";
  return (
    <span className="flex items-center gap-[2px] shrink-0">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block rounded-full"
          style={{
            width: 3,
            height: 10,
            backgroundColor: color,
            animation: `dotPulse 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  );
}
