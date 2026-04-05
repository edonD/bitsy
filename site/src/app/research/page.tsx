import Link from "next/link";

const pages = [
  { href: "/research/llm-mechanics", title: "How LLMs Decide What to Mention", task: "2.1" },
  { href: "/research/geo-tools", title: "How GEO Tools Work Under the Hood", task: "2.2" },
  { href: "/research/economics", title: "The Economics", task: "2.3" },
  { href: "/research/landscape", title: "The Competitive Landscape", task: "2.4" },
  { href: "/research/papers", title: "The Science — Papers & Research", task: "2.5" },
];

export default function ResearchIndex() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Research Findings</h1>
      <div className="space-y-4">
        {pages.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="block border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-xs text-blue-600 font-medium">Task {p.task}</span>
            <h2 className="text-lg font-semibold text-slate-900 mt-1">{p.title}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
