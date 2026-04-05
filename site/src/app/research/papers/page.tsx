import {
  PageHeader,
  Section,
  SubSection,
  KeyStat,
  DataTable,
  Callout,
  SourceList,
  Prose,
  Quote,
} from "@/components/ResearchPage";

export const metadata = {
  title: "The Science — Papers & Research — Bitsy Research",
};

export default function PapersPage() {
  return (
    <div>
      <PageHeader
        task="2.5"
        title="The Science — Papers & Research"
        subtitle="The foundational GEO paper (KDD 2024), large-scale citation studies, LLM bias research, search volume decline data, and myth-busting with empirical evidence."
      />

      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          <KeyStat value="+41%" label="Quotation addition (GEO paper)" />
          <KeyStat value="-9%" label="Keyword stuffing (harmful)" />
          <KeyStat value="680M" label="Citations analyzed (Profound)" />
          <KeyStat value="25%" label="Search decline by 2026 (Gartner)" />
        </div>

        <Section title="1. The Foundational Paper: GEO — Generative Engine Optimization">
          <div className="bg-slate-50 rounded-lg p-5 my-4">
            <p className="text-sm text-slate-600">
              <strong>Authors:</strong> Aggarwal, Murahari, Rajpurohit, Kalyan, Narasimhan, Deshpande
            </p>
            <p className="text-sm text-slate-600">
              <strong>Institutions:</strong> Princeton, Georgia Tech, The Allen Institute of AI, IIT Delhi
            </p>
            <p className="text-sm text-slate-600">
              <strong>Venue:</strong> KDD 2024 (30th ACM SIGKDD Conference)
            </p>
            <p className="text-sm text-slate-600">
              <strong>arXiv:</strong>{" "}
              <a href="https://arxiv.org/abs/2311.09735" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                2311.09735
              </a>
            </p>
          </div>

          <SubSection title="GEO-Bench: The Benchmark">
            <DataTable
              headers={["Parameter", "Detail"]}
              rows={[
                ["Total queries", "10,000 (8K train / 1K validation / 1K test)"],
                ["Query distribution", "80% informational, 10% transactional, 10% navigational"],
                ["Domains", "25 categories"],
                ["Sources per query", "Top 5 Google search results"],
                ["Data sources", "9 datasets (MS MARCO, ORCAS-1, Natural Questions, AllSouls, LIMA, etc.)"],
              ]}
            />
          </SubSection>

          <SubSection title="Nine Optimization Strategies Tested">
            <DataTable
              headers={["Strategy", "Visibility Change", "Notes"]}
              rows={[
                [<strong key="q" className="text-green-700">Quotation Addition</strong>, <strong key="qv" className="text-green-700">+41%</strong>, "Most effective overall"],
                [<strong key="s" className="text-green-700">Statistics Addition</strong>, <strong key="sv" className="text-green-700">+32%</strong>, "Quantitative > qualitative"],
                [<strong key="f" className="text-green-700">Fluency Optimization</strong>, <strong key="fv" className="text-green-700">+28%</strong>, "Readability improvements"],
                [<strong key="c" className="text-green-700">Cite Sources</strong>, <strong key="cv" className="text-green-700">+27%</strong>, "+115% for rank-5 sites"],
                ["Technical Terms", "+18%", "Domain-specific terminology"],
                ["Easy-to-Understand", "+14%", "Simplified language"],
                ["Authoritative", "+12%", "Persuasive tone"],
                ["Unique Words", "+6%", "Minimal impact"],
                [<strong key="k" className="text-red-600">Keyword Stuffing</strong>, <strong key="kv" className="text-red-600">-9%</strong>, <span key="kn" className="text-red-600">Harmful — traditional SEO tactic backfires</span>],
              ]}
            />
            <Callout type="warning">
              <strong>The single most important result:</strong> Traditional SEO keyword stuffing{" "}
              <em>decreases</em> visibility by 9% in generative engines. GEO and SEO are not the same discipline.
            </Callout>
          </SubSection>

          <SubSection title="The Democratization Effect">
            <Prose>
              <p>Lower-ranked websites benefit dramatically more from GEO than top-ranked ones:</p>
            </Prose>
            <DataTable
              headers={["Google Rank", "Strategy", "Visibility Change"]}
              rows={[
                [<strong key="r5">Rank 5</strong>, "Cite Sources", <strong key="r5v" className="text-green-700">+115.1%</strong>],
                ["Rank 5", "Statistics Addition", "+97.9%"],
                ["Rank 1", "Cite Sources", "-30.3%"],
                ["Rank 1", "Statistics Addition", "-20.6%"],
              ]}
            />
            <Callout type="insight">
              GEO &ldquo;levels the playing field&rdquo; for smaller content creators. A page ranked #5 in
              Google can <strong>more than double</strong> its generative engine visibility by adding citations.
            </Callout>
          </SubSection>

          <SubSection title="Domain-Specific Effectiveness">
            <DataTable
              headers={["Domain", "Most Effective Strategy"]}
              rows={[
                ["Debate / History", "Authoritative, Quotation Addition"],
                ["Science", "Authoritative, Fluency Optimization"],
                ["Business / Health", "Fluency Optimization"],
                ["Law & Government", "Cite Sources, Statistics Addition"],
                ["Facts / Statements", "Cite Sources"],
                ["People & Society", "Quotation Addition"],
                ["Opinion", "Statistics Addition"],
              ]}
            />
          </SubSection>

          <SubSection title="Best Combination">
            <Prose>
              <p>
                <strong>Fluency Optimization + Statistics Addition</strong> showed maximum combined performance:
                5.5% improvement over best single-method. <strong>Cite Sources</strong> averaged 31.4%
                improvement when combined with other methods. Not all combinations are additive.
              </p>
            </Prose>
          </SubSection>
        </Section>

        <Section title="2. Large-Scale Citation Studies">
          <SubSection title="Profound: 680 Million Citations">
            <DataTable
              headers={["Platform", "#1 Source", "Share", "#2 Source"]}
              rows={[
                ["ChatGPT", "Wikipedia", "7.8%", "Reddit (1.8%)"],
                ["Perplexity", "Reddit", "6.6%", "YouTube (2.0%)"],
                ["Google AI Overviews", "Reddit", "2.2%", "YouTube (1.9%)"],
              ]}
            />
            <Prose>
              <p>
                Cross-platform overlap is remarkably low: only <strong>11% of domains</strong> are cited by both
                ChatGPT and Perplexity. Commercial domains (.com) account for <strong>80.41%</strong> of all
                citations; nonprofit (.org) accounts for 11.29%.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="Yext: 17.2 Million Citations">
            <Prose>
              <p>
                Analyzed citations across ChatGPT, Perplexity, Google AI Overviews, and Claude. Key finding:{" "}
                <strong>&ldquo;There is no single AI optimization strategy&rdquo;</strong> that works across all
                models. Each platform has fundamentally different citation patterns. Recommended: optimize
                per-platform rather than using a universal approach.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="Ahrefs: 17 Million Citations">
            <Prose>
              <p>
                AI-cited content is <strong>25.7% fresher</strong> than traditional search results. The top 30
                domains capture <strong>67% of all citations</strong>. Ahrefs found that content cited by AI
                tends to be more recently published and more frequently updated.
              </p>
            </Prose>
          </SubSection>

          <SubSection title="Brandlight: Traditional vs. AI Search">
            <Callout type="insight">
              <strong>90% of ChatGPT citations come from pages outside Google&rsquo;s top 20.</strong> The
              Google SERP &harr; AI citation overlap dropped from 70% to below 20%. This confirms that
              optimizing for Google is no longer sufficient for AI visibility.
            </Callout>
          </SubSection>
        </Section>

        <Section title="3. Search Volume Decline Data">
          <DataTable
            headers={["Source", "Prediction / Finding"]}
            rows={[
              [<strong key="g">Gartner (Feb 2024)</strong>, "Traditional search volume drops 25% by 2026"],
              ["Gartner (extended)", "Organic traffic drops 50% by 2028"],
              ["Bain & Company", "60% of searches now end without a click (zero-click)"],
              ["Ahrefs", "AI Overviews reduce CTR for top pages by 58%"],
              ["Apple", "Safari had first-ever search decline (May 2025)"],
              ["Google searches/user", "Dropped 20% YoY in U.S. (2025)"],
              ["AI chatbot traffic", "80.92% YoY growth"],
              ["Consumer AI usage", "58% use AI for product recommendations (up from 25% in 2023)"],
            ]}
          />
          <Callout type="info">
            <strong>Counterpoint:</strong> Some analysts contest Gartner&rsquo;s projection. Datos analysis found
            &ldquo;almost no indication that traditional search is on a path to a 25% decline&rdquo; through
            mid-2025 traffic data. LLM usage remains under 5% of global search queries.
          </Callout>
        </Section>

        <Section title="4. The a16z Perspective">
          <Quote
            text="Visibility means showing up directly in the answer itself, rather than ranking high."
            source="Zach Cohen & Seema Amble, a16z (May 2025)"
          />
          <Prose>
            <p>Key data points from a16z&rsquo;s &ldquo;How Generative Engine Optimization Rewrites the Rules of Search&rdquo;:</p>
          </Prose>
          <DataTable
            headers={["Metric", "Value"]}
            rows={[
              ["SEO market foundation", "$80 billion+"],
              ["AI search query length", "23 words avg (vs. 4 in traditional)"],
              ["AI session depth", "6 minutes average"],
              ["ChatGPT → Vercel signups", "10% of new signups"],
              ["New success metric", "\"Reference rates\" — how often cited in AI answers"],
            ]}
          />
          <Quote
            text="How you're encoded into the AI layer is the new competitive advantage."
            source="a16z"
          />
        </Section>

        <Section title="5. LLM Bias and Stochasticity Research">
          <SubSection title="LLM Whisperer (Carnegie Mellon, 2024)">
            <Prose>
              <p>
                449 prompts across 77 product categories, 1,000 responses per prompt. Found that subtle synonym
                replacements can increase brand mention likelihood by up to <strong>78%</strong>. Semantically
                equivalent prompts produced absolute mention differences of <strong>7.4% to 18.6%</strong>.
                Maximum variance: <strong>100%</strong> (InstantPot from 0% to 100% between equivalent prompts).
              </p>
            </Prose>
          </SubSection>

          <SubSection title="Position Bias in LLM Recommendations">
            <Prose>
              <p>
                First-mentioned brands receive &ldquo;direct-answer language&rdquo; while later positions get
                &ldquo;other options include&rdquo; framing. Only <strong>3&ndash;4 brands</strong> are cited per
                ChatGPT response vs. 13 for Perplexity, creating winner-take-all dynamics. Less than{" "}
                <strong>1-in-100 chance</strong> of any platform producing the same recommendation list twice.
              </p>
            </Prose>
          </SubSection>
        </Section>

        <Section title="6. Myth-Busting">
          <DataTable
            headers={["Myth", "Reality", "Evidence"]}
            rows={[
              [
                "llms.txt files help AI find you",
                "Zero evidence of any effect",
                "No peer-reviewed study; no LLM provider has confirmed they use it",
              ],
              [
                "Schema markup increases citations",
                "Improves accuracy, NOT frequency",
                "Search Atlas: 748K queries show no frequency effect",
              ],
              [
                "Backlinks drive AI visibility",
                "Weak/neutral correlation",
                "Digital Bloom, Seer Interactive",
              ],
              [
                "Keyword optimization works for AI",
                "Keyword stuffing is HARMFUL (-9%)",
                "GEO paper (KDD 2024)",
              ],
              [
                "Fresh content helps",
                "TRUE — strongest myth with evidence",
                "65% of AI hits on <1yr content; 3x boost for 14-day freshness",
              ],
            ]}
          />
        </Section>

        <Section title="7. Follow-Up Papers">
          <DataTable
            headers={["Paper", "Key Finding"]}
            rows={[
              [
                "CORE (Jin et al., 2026)",
                "91.4% promotion success rate @Top-5 by targeting synthesis stage (not retrieval)",
              ],
              [
                "E-GEO (2025)",
                "GEO signals diverge substantially from SEO signals in e-commerce contexts",
              ],
              [
                "Diagnosing Citation Failures",
                "Asks WHY a document fails to be cited, rather than generic rewriting",
              ],
              [
                "Beyond Keywords (Content-Centric Agents)",
                "End-to-end GSEO framework for post-keyword era",
              ],
              [
                "Kumar & Lakkaraju (2024)",
                "Strategic text sequences can manipulate LLM recommendations (adversarial angle)",
              ],
            ]}
          />
        </Section>

        <Section title="8. Implications for Bitsy">
          <div className="space-y-4">
            <Callout type="insight">
              <strong>Build on proven strategies:</strong> Quotation addition (+41%), statistics (+32%),
              source citations (+27%), and fluency optimization (+28%) are the evidence-based GEO strategies.
              Content should be chunked into 40&ndash;60 word self-contained blocks. Freshness is the strongest
              signal (&lt;14 days = 3x boost).
            </Callout>
            <Callout type="warning">
              <strong>Avoid snake oil:</strong> Do not build features around keyword stuffing (proven harmful),
              llms.txt (zero evidence), or schema-for-frequency (disproven at scale). Do not promise universal
              strategies &mdash; effectiveness varies by domain and model. Include honest uncertainty ranges.
            </Callout>
            <Callout type="info">
              <strong>Key architectural insight:</strong> The 11% cross-platform domain overlap means per-model
              monitoring and optimization is essential. A single &ldquo;GEO score&rdquo; would be misleading.
              Track parametric vs. RAG separately &mdash; parametric is durable (18&ndash;36 months), RAG is volatile.
            </Callout>
          </div>
        </Section>

        <SourceList
          sources={[
            { label: "GEO Paper — Aggarwal et al. (KDD 2024)", url: "https://arxiv.org/abs/2311.09735" },
            { label: "GEO Paper — ACM Digital Library", url: "https://dl.acm.org/doi/10.1145/3637528.3671900" },
            { label: "CORE Paper — Jin et al. (2026)", url: "https://arxiv.org/html/2602.03608v1" },
            { label: "E-GEO Paper (2025)", url: "https://arxiv.org/pdf/2511.20867" },
            { label: "LLM Whisperer — CMU (2024)", url: "https://arxiv.org/abs/2406.04755" },
            { label: "Profound — AI Platform Citation Patterns", url: "https://www.tryprofound.com/blog/ai-platform-citation-patterns" },
            { label: "Ahrefs — 17 Million AI Citations Analysis", url: "https://ahrefs.com/blog/" },
            { label: "Brandlight — SEO vs. GEO Overlap", url: "https://sat.brandlight.ai/articles/can-brandlight-show-overlap-between-geo-and-seo" },
            { label: "a16z — GEO Over SEO (May 2025)", url: "https://a16z.com/geo-over-seo/" },
            { label: "Gartner — Search Volume Decline Prediction", url: "https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots-and-other-virtual-agents" },
            { label: "Digital Bloom — 2025 AI Citation Report", url: "https://thedigitalbloom.com/learn/2025-ai-citation-llm-visibility-report/" },
            { label: "Genezio — Content Types Driving LLM Mentions", url: "https://genezio.com/blog/content-types-that-drive-llm-mentions/" },
            { label: "Search Atlas — LLM Citation Behavior Comparison", url: "https://searchatlas.com/blog/comparative-analysis-of-llm-citation-behavior/" },
          ]}
        />
      </div>
    </div>
  );
}
