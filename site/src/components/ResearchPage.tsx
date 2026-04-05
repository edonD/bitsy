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
    <div className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          &larr; Back to Research Hub
        </Link>
        <span className="block text-xs font-medium text-blue-600 bg-blue-50 rounded px-2 py-0.5 w-fit mb-3">
          Task {task}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">{title}</h1>
        <p className="mt-4 text-lg text-slate-600 leading-relaxed">{subtitle}</p>
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
    <section id={id} className="mt-12">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">{title}</h2>
      {children}
    </section>
  );
}

export function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-slate-800 mb-3">{title}</h3>
      {children}
    </div>
  );
}

export function KeyStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-blue-700">{value}</div>
      <div className="text-sm text-blue-600 mt-1">{label}</div>
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
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse border border-slate-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-50">
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {row.map((cell, j) => (
                <td key={j} className="py-2.5 px-3 text-slate-600">
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
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    insight: "bg-green-50 border-green-200 text-green-800",
  };
  return (
    <div className={`border rounded-lg p-4 my-4 text-sm leading-relaxed ${styles[type]}`}>
      {children}
    </div>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <div className="mt-12 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Sources</h2>
      <ul className="space-y-2 text-sm">
        {sources.map((s, i) => (
          <li key={i}>
            <a
              href={s.url}
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="text-slate-600 leading-relaxed space-y-3">{children}</div>;
}

export function Quote({ text, source }: { text: string; source: string }) {
  return (
    <blockquote className="border-l-4 border-blue-300 bg-blue-50/50 rounded-r-lg pl-4 py-3 pr-4 my-4 text-sm">
      <p className="text-slate-700 italic">&ldquo;{text}&rdquo;</p>
      <cite className="text-slate-500 text-xs mt-1 block not-italic">&mdash; {source}</cite>
    </blockquote>
  );
}
