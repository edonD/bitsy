const audiences = [
  "Product marketers",
  "SEO and content teams",
  "Founders launching new pages",
  "Agencies tracking AI visibility",
];

export function BuiltFor() {
  return (
    <section id="built-for">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr,1.2fr] lg:items-start">
          <div>
            <p className="muted-label text-xs">Built for</p>
            <h2 className="mt-4 text-4xl leading-tight text-[var(--ink)]">
              Teams trying to win more AI mentions.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--ink-soft)]">
              The product is most useful when a team cares about launch pages, comparison pages,
              content updates, and competitor visibility.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {audiences.map((audience) => (
              <div key={audience} className="paper-card rounded-[0.35rem] p-6">
                <p className="text-xl leading-tight text-[var(--ink)]">{audience}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
