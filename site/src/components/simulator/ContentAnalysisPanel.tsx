import type { ContentAnalysisResponse } from "@/lib/api";

export function ContentAnalysisPanel({
  data,
  label,
}: {
  data: ContentAnalysisResponse;
  label?: string;
}) {
  const ratingStyles: Record<string, string> = {
    good: "bg-emerald-50 text-emerald-800 border-emerald-200",
    needs_work: "bg-amber-50 text-amber-800 border-amber-200",
    missing: "bg-rose-50 text-rose-800 border-rose-200",
  };

  return (
    <div className="paper-panel rounded-[2rem] p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="muted-label text-xs mb-1">{label || "Content analysis"}</p>
          <h3 className="text-2xl text-[var(--ink)]">{data.title || "Content score"}</h3>
          {data.url && <p className="text-xs text-[var(--muted)] mt-1 truncate">{data.url}</p>}
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold text-[var(--ink)]">{data.overall_score}</p>
          <p className="text-xs text-[var(--muted)]">/100</p>
        </div>
      </div>
      <p className="text-sm text-[var(--muted)] mb-5">{data.summary}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.features.map((feature) => (
          <div key={feature.name} className="paper-card rounded-[1.2rem] p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--ink)]">{feature.label}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  ratingStyles[feature.rating] || ratingStyles.needs_work
                }`}
              >
                {feature.rating.replace("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-2xl text-[var(--ink)]">{String(feature.value ?? "-")}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
