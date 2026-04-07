import Link from "next/link";

interface Source {
  label: string;
  url: string;
}

export function PageHeader({
  task,
  title,
  subtitle,
}: {
  task: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="section-wash border-b border-[color:var(--line)] py-12 md:py-14">
      <div className="mx-auto max-w-5xl px-6">
        <Link href="/research" className="ink-link mb-4 inline-block text-sm">
          Back to methodology
        </Link>
        <span className="mb-3 inline-flex rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.48)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          Research note {task}
        </span>
        <h1 className="max-w-3xl text-4xl leading-tight text-[var(--ink)] md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 border-t border-[color:var(--line)] pt-8">
      <h2 className="mb-6 text-3xl text-[var(--ink)]">{title}</h2>
      {children}
    </section>
  );
}

export function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="mb-3 text-xl text-[var(--ink)]">{title}</h3>
      {children}
    </div>
  );
}

export function KeyStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="paper-card rounded-[1.4rem] p-5 text-center">
      <div className="text-3xl text-[var(--ink)]">{value}</div>
      <div className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{label}</div>
    </div>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="paper-card my-4 overflow-x-auto rounded-[1.4rem]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[rgba(255,255,255,0.42)]">
            {headers.map((header, index) => (
              <th
                key={index}
                className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--line)]">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-[rgba(255,255,255,0.28)]">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-[var(--muted)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "insight";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-[rgba(255,255,255,0.5)]",
    warning: "bg-[rgba(238,228,207,0.84)]",
    insight: "bg-[rgba(242,239,231,0.9)]",
  };

  return (
    <div className={`my-4 rounded-2xl border border-[color:var(--line)] p-4 text-sm leading-relaxed text-[var(--ink)] ${styles[type]}`}>
      {children}
    </div>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <div className="mt-12 border-t border-[color:var(--line)] pt-8">
      <h2 className="mb-4 text-xl text-[var(--ink)]">Sources</h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {sources.map((source, index) => (
          <li key={index} className="paper-card rounded-[1.2rem] px-4 py-3 text-sm text-[var(--muted)]">
            <a
              href={source.url}
              className="ink-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 text-base leading-8 text-[var(--muted)]">{children}</div>;
}

export function Quote({ text, source }: { text: string; source: string }) {
  return (
    <blockquote className="paper-card my-4 rounded-[1.5rem] px-5 py-4 text-sm">
      <p className="italic text-[var(--ink)]">&ldquo;{text}&rdquo;</p>
      <cite className="mt-2 block text-xs not-italic text-[var(--muted)]">
        {source}
      </cite>
    </blockquote>
  );
}
