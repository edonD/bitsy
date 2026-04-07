const items = [
  {
    label: "What it does",
    value: "Tests real buyer prompts across multiple AI tools.",
  },
  {
    label: "What you get",
    value: "Mention rate, ranking, competitor overlap, and saved runs.",
  },
  {
    label: "Current scope",
    value: "Point-in-time testing today. Runs are saved locally in your browser.",
  },
];

export function ProductBar() {
  return (
    <section id="product">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <div className="grid overflow-hidden rounded-[0.4rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] md:grid-cols-3 md:divide-x md:divide-[color:var(--line)]">
          {items.map((item) => (
            <div key={item.label} className="p-6">
              <p className="muted-label text-xs">{item.label}</p>
              <p className="mt-3 max-w-sm text-base leading-relaxed text-[var(--ink-soft)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
