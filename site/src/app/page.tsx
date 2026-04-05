import Link from "next/link";

const sections = [
  {
    href: "/research/llm-mechanics",
    title: "How LLMs Decide What to Mention",
    description:
      "Training data pipelines, RLHF, parametric vs. RAG knowledge, frequency effects, recency bias, and the signals that drive brand recommendations.",
    tag: "Task 2.1",
    stats: ["80%+ from CommonCrawl", "41% from authoritative lists", "3x recency boost"],
  },
  {
    href: "/research/geo-tools",
    title: "How GEO Tools Work Under the Hood",
    description:
      "Response parsing techniques, statistical methods for LLM variance, multi-model normalization, polling architectures, and pre-publication simulation.",
    tag: "Task 2.2",
    stats: ["4 parsing approaches", "15% accuracy variance", "50 polls/day standard"],
  },
  {
    href: "/research/economics",
    title: "The Economics",
    description:
      "API costs per model, cost-per-query analysis, monthly cost modeling, optimization strategies delivering 90-97% savings, and break-even analysis.",
    tag: "Task 2.3",
    stats: ["25x cost gap between models", "$3.60-$4,680/mo range", "90-97% savings possible"],
  },
  {
    href: "/research/landscape",
    title: "The Competitive Landscape",
    description:
      "40+ GEO/LLMO tools mapped across 6 tiers, from enterprise ($5,000+/mo) to free. Funding, features, pricing, and market gaps.",
    tag: "Task 2.4",
    stats: ["40+ tools mapped", "$155M+ top funding", "$1B unicorn (Profound)"],
  },
  {
    href: "/research/papers",
    title: "The Science — Papers & Research",
    description:
      "The foundational GEO paper (KDD 2024), large-scale citation studies, LLM bias research, search volume decline data, and myth-busting.",
    tag: "Task 2.5",
    stats: ["10,000-query benchmark", "+41% from quotations", "-9% from keyword stuffing"],
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-blue-600 font-medium text-sm tracking-wide uppercase mb-3">
            Research Hub
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight max-w-3xl">
            How Companies Get Discovered Inside LLMs
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
            When someone asks ChatGPT &ldquo;what&rsquo;s the best CRM?&rdquo;, some companies show
            up and others don&rsquo;t. This is{" "}
            <strong className="text-slate-900">Generative Engine Optimization</strong> &mdash; the
            new battleground for brand visibility. Bitsy is a comprehensive research hub covering the
            technology, tools, economics, and science behind it.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 text-sm">
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2">
              <span className="text-slate-500">Market size:</span>{" "}
              <strong>$848M&ndash;$1.01B</strong> (2025)
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2">
              <span className="text-slate-500">Growth:</span>{" "}
              <strong>527% YoY</strong> AI-referred traffic
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2">
              <span className="text-slate-500">Search shift:</span>{" "}
              <strong>25% decline</strong> in traditional search by 2026 (Gartner)
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="font-semibold text-amber-900 mb-2">The Core Finding</h2>
          <p className="text-amber-800">
            Traditional SEO signals &mdash; backlinks, domain authority, keyword optimization &mdash;
            have <strong>near-zero influence</strong> on AI recommendations. Instead, LLMs prioritize
            authoritative list mentions (41%), awards/accreditations (18%), and aggregated online
            reviews (16%).{" "}
            <span className="text-amber-600">
              Source:{" "}
              <a
                href="https://www.onely.com/blog/how-chatgpt-decides-which-brands-to-recommend/"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Onely, Dec 2025
              </a>
            </span>
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">Research Findings</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group block border border-slate-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <span className="inline-block text-xs font-medium text-blue-600 bg-blue-50 rounded px-2 py-0.5 mb-3">
                {s.tag}
              </span>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">{s.description}</p>
              <div className="flex flex-wrap gap-2">
                {s.stats.map((stat) => (
                  <span
                    key={stat}
                    className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-1"
                  >
                    {stat}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">SEO vs. GEO: The Shift</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 pr-4 font-semibold text-slate-900">Dimension</th>
                  <th className="text-left py-3 pr-4 font-semibold text-slate-900">Traditional SEO</th>
                  <th className="text-left py-3 font-semibold text-slate-900">Generative Engine Optimization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-700">Success metric</td>
                  <td className="py-3 pr-4 text-slate-600">Click-through rate, page rank</td>
                  <td className="py-3 text-slate-600">Reference rate &mdash; how often cited in AI answers</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-700">Key signals</td>
                  <td className="py-3 pr-4 text-slate-600">Backlinks, keywords, DA</td>
                  <td className="py-3 text-slate-600">Third-party mentions, authoritative lists, freshness</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-700">Content format</td>
                  <td className="py-3 pr-4 text-slate-600">Long-form, keyword-optimized</td>
                  <td className="py-3 text-slate-600">40&ndash;60 word chunks, statistics, quotations, citations</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-700">Optimization window</td>
                  <td className="py-3 pr-4 text-slate-600">Days to weeks</td>
                  <td className="py-3 text-slate-600">Parametric: 18&ndash;36 months; RAG: immediate but volatile</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-700">Overlap</td>
                  <td className="py-3 pr-4 text-slate-600">Google top 10</td>
                  <td className="py-3 text-slate-600">90% of ChatGPT citations are outside Google top 20</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Sources: Onely, GEO paper (KDD 2024), a16z &ldquo;GEO over SEO&rdquo;, Semrush, Digital Bloom
          </p>
        </div>
      </section>
    </div>
  );
}
