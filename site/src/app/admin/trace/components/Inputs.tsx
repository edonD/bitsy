"use client";

// Low-level form controls used in the Inputs section of the trace page.

export function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none"
      />
    </label>
  );
}

// Large toggleable card used to flip memory / search modes on and off. Styled
// as a button instead of a checkbox because it's a load-bearing decision that
// deserves its own hit target.
export function ModeToggle({
  active,
  onToggle,
  label,
  hint,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left rounded-xl border px-4 py-3 transition-all ${
        active
          ? "border-[var(--ink)] bg-white/80"
          : "border-[color:var(--line)] bg-white/40 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
        <span
          className={`h-4 w-4 rounded-full border ${
            active
              ? "bg-[var(--ink)] border-[var(--ink)]"
              : "bg-transparent border-[color:var(--line)]"
          }`}
        />
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{hint}</p>
    </button>
  );
}
