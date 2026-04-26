import {
  PageHeader,
  Section,
  SubSection,
  KeyStat,
  DataTable,
  Callout,
  SourceList,
  Prose,
} from "@/components/ResearchPage";

export const metadata = {
  title: "The Competitive Landscape — Bitsy Research",
};

export default function LandscapePage() {
  return (
    <div>
      <PageHeader
        task="2.4"
        title="The Competitive Landscape"
        subtitle="40+ GEO/LLMO tools mapped across 6 tiers: enterprise platforms, mid-market tools, budget options, SEO incumbents, free/freemium, and API infrastructure."
      />

      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          <KeyStat value="40+" label="Dedicated GEO/LLMO tools" />
          <KeyStat value="$155M+" label="Profound total funding" />
          <KeyStat value="$1B" label="Profound valuation (Feb 2026)" />
          <KeyStat value="$77M+" label="Sector funding May-Aug 2025" />
        </div>

        <Section title="Market Overview">
          <Prose>
            <p>
              The GEO/LLMO market emerged in 2023&ndash;2024 and exploded in 2025&ndash;2026. Key signals:
              Gartner predicts 25% search volume drop by 2026. AI-referred sessions jumped{" "}
              <strong>527% YoY</strong> in H1 2025. Traffic from AI sources to U.S. retail sites exploded by{" "}
              <strong>3,500%</strong> between July 2024 and May 2025. Profound reached unicorn status ($1B) in
              February 2026 &mdash; just 18 months after founding.
            </p>
          </Prose>
          <DataTable
            headers={["Category", "Description", "Examples"]}
            rows={[
              ["Pure-play monitors", "Track brand mentions/citations across LLMs", "Otterly.ai, LLM Pulse, Trackerly, Rankscale"],
              ["Full-stack GEO", "Monitor + optimize + content generation", "Profound, Peec AI, Scrunch, Evertune"],
              ["Content-first GEO", "Optimize content for AI citation", "Writesonic, Frase.io, Goodie AI"],
              ["SEO incumbents", "Traditional SEO tools adding AI features", "Ahrefs, Semrush, SE Ranking"],
              ["API/infrastructure", "APIs for building GEO tools", "Sellm, DataForSEO, Bright Data"],
              ["Free/freemium", "One-time audits or free checkers", "HubSpot AEO Grader, Adobe LLMO"],
              ["Pre-publish simulation", "Test content before publishing", "Tryscope (Scope)"],
            ]}
          />
        </Section>

        <Section title="Tier 1: Enterprise ($2,000+/mo)">
          <SubSection title="Profound — $1B Unicorn">
            <DataTable
              headers={["Attribute", "Detail"]}
              rows={[
                ["URL", "tryprofound.com"],
                ["Founded", "2024"],
                ["Funding", "$155M+ (Kleiner Perkins, Sequoia, Lightspeed)"],
                ["Valuation", "$1 billion (Feb 2026)"],
                ["Team", "~165 employees"],
                ["Pricing", "$499/mo Lite → $2,000-5,000+ Enterprise"],
                ["Clients", "Target, Figma, Walmart, Ramp, MongoDB, IBM (10%+ Fortune 500)"],
                ["Coverage", "10+ engines, 400M+ anonymized conversations"],
              ]}
            />
          </SubSection>

          <SubSection title="Evertune">
            <DataTable
              headers={["Attribute", "Detail"]}
              rows={[
                ["URL", "evertune.ai"],
                ["Founded", "April 2024 (Trade Desk veterans)"],
                ["Funding", "$19M (Felicis Ventures)"],
                ["Pricing", "$3,000/mo for 1.25M monthly prompts per brand"],
                ["Coverage", "11+ engines, 25M user behavior data"],
                ["Unique", "AI Retargeting via partnerships with Index Exchange & The Trade Desk"],
              ]}
            />
          </SubSection>

          <SubSection title="Bluefish AI">
            <DataTable
              headers={["Attribute", "Detail"]}
              rows={[
                ["URL", "bluefishai.com"],
                ["Founded", "2024 (ex-PromoteIQ/Microsoft, ex-LiveRail/Facebook)"],
                ["Funding", "$24M (NEA, Salesforce Ventures, Bloomberg Beta)"],
                ["Pricing", "~$4,000+/mo (quote-based)"],
                ["Focus", "GEO Measurement → ROI; 80% Fortune 500 clients"],
              ]}
            />
          </SubSection>

          <SubSection title="Brandlight">
            <DataTable
              headers={["Attribute", "Detail"]}
              rows={[
                ["URL", "brandlight.ai"],
                ["Founded", "2024 (stealth → April 2025)"],
                ["Funding", "$35.75M (Cardumen Capital, G20Ventures)"],
                ["Coverage", "11 AI engines (broadest)"],
                ["Unique", "GA4/revenue linkage, HIPAA/SOC 2, multi-language"],
              ]}
            />
          </SubSection>

          <SubSection title="BrightEdge (Legacy SEO + GEO)">
            <Prose>
              <p>
                Founded 2007, $62M+ funded (Insight Partners, Battery, Intel). Pricing: $30,000&ndash;$100,000+/year.
                Added AI Catalyst for AI search visibility. Primarily Google AI Overviews focused.
              </p>
            </Prose>
          </SubSection>
        </Section>

        <Section title="Tier 2: Mid-Market ($200-$2,000/mo)">
          <DataTable
            headers={["Tool", "Pricing", "Funding", "Key Feature"]}
            rows={[
              [<strong key="p">Peec AI</strong>, "EUR 89-499+/mo", "$29M", "32 employees, Berlin; 5+ engine coverage"],
              ["Scrunch AI", "$250+/mo", "Self-funded", "4-9 LLMs, content optimization"],
              ["Goodie AI", "$495/mo", "Not disclosed", "AI-generated content optimization"],
              ["AthenaHQ", "$295/mo", "Not disclosed", "8+ LLMs, 3,600 credits at entry"],
              ["Knowatoa", "Custom", "Not disclosed", "AI visibility analytics"],
              ["Writesonic", "$39-499/mo", "$2.6M", "Content-first GEO optimization"],
              ["Frase.io", "$15-115/mo", "$2.3M", "AI content briefs for GEO"],
              ["Relixir", "Custom", "Not disclosed", "AI authority metrics"],
            ]}
          />
        </Section>

        <Section title="Tier 3: Budget (&lt;$200/mo)">
          <DataTable
            headers={["Tool", "Pricing", "Users/Traction", "Models"]}
            rows={[
              [<strong key="o">Otterly.ai</strong>, "$29-489/mo", "20K+ users", "ChatGPT, Perplexity, AI Overviews, Copilot"],
              ["LLM Pulse", "EUR 49-299/mo", "Growing", "5 models"],
              ["Rankscale", "$20-780/mo", "New", "8 models"],
              ["Trackerly", "$29-499/mo", "Not disclosed", "Multiple"],
              ["AI Clicks", "$49-249/mo", "Not disclosed", "ChatGPT, Perplexity, Gemini"],
              ["Prompt Monitor", "$29-299/mo", "Not disclosed", "Multiple"],
              ["LLMrefs", "$15-79/mo", "Not disclosed", "ChatGPT, Perplexity"],
              ["AI Peekaboo", "Free-$99/mo", "Not disclosed", "ChatGPT focused"],
            ]}
          />
        </Section>

        <Section title="Tier 4: SEO Incumbents Adding GEO">
          <DataTable
            headers={["Tool", "GEO Feature", "Status"]}
            rows={[
              [<strong key="a">Ahrefs</strong>, "Brand Radar — AI brand monitoring", "Released 2025-2026"],
              ["Semrush", "AI Visibility Index", "Beta/Early"],
              ["SE Ranking", "AI visibility tracking", "Released"],
              ["Ubersuggest", "AI search features", "Planned"],
              ["SearchAtlas", "LLM citation analysis", "Research published"],
            ]}
          />
          <Callout type="info">
            Ahrefs analyzed <strong>17 million AI citations</strong> across platforms. Semrush reports{" "}
            <strong>$10M AI product ARR</strong> in Q3 2025, doubling quarter-over-quarter. These incumbents have
            distribution advantage but are late to dedicated GEO.
          </Callout>
        </Section>

        <Section title="Tier 5: Free / Freemium">
          <DataTable
            headers={["Tool", "Price", "What It Does"]}
            rows={[
              ["HubSpot AEO Grader", "Free", "One-time AI visibility audit"],
              ["Adobe LLM Optimizer", "Free (beta)", "Content optimization for AI"],
              ["GEO Monitor", "Free tier", "Basic AI mention tracking"],
              ["Gumshoe AI", "Free tier", "AI search analytics"],
              ["Metricus", "Free tier", "AI platform brand comparison"],
            ]}
          />
        </Section>

        <Section title="Tier 6: API / Infrastructure">
          <DataTable
            headers={["Tool", "Pricing", "What It Provides"]}
            rows={[
              [<strong key="s">Sellm</strong>, "<$0.01/prompt", "Direct API for brand monitoring (cheapest)"],
              ["DataForSEO", "Usage-based", "SEO + AI search data APIs"],
              ["Bright Data", "Usage-based", "Web scraping infrastructure for LLM monitoring"],
            ]}
          />
        </Section>

        <Section title="Market Gaps & Opportunities">
          <Callout type="insight">
            <strong>Key gaps identified:</strong>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>No tool offers affordable pre-publish simulation (Tryscope is demo-only, custom pricing)</li>
              <li>500x&ndash;1,000x markup over raw API costs suggests room for a transparent, API-cost-plus-margin model</li>
              <li>Most tools track 4&ndash;5 engines; Brandlight&rsquo;s 11-engine coverage is the exception</li>
              <li>No open-source full-stack GEO monitoring solution exists</li>
              <li>Parametric vs. RAG distinction is not tracked by any tool</li>
              <li>Third-party &ldquo;Best of&rdquo; list monitoring is manual everywhere</li>
            </ul>
          </Callout>
          <Callout type="warning">
            <strong>Risks:</strong> Market consolidation is likely &mdash; Profound&rsquo;s $155M war chest will
            pressure smaller players. SEO incumbents (Ahrefs, Semrush) have massive distribution advantages.
            The free-tier race (HubSpot, Adobe) could commoditize basic monitoring.
          </Callout>
        </Section>

        <SourceList
          sources={[
            { label: "Fortune — Profound $96M Series C (Feb 2026)", url: "https://fortune.com/2026/02/24/exclusive-as-ai-threatens-search-profound-raises-96-million-to-help-brands-stay-visible/" },
            { label: "AdExchanger — Evertune Profile", url: "https://www.adexchanger.com/marketers/meet-evertune-a-gen-ai-startup-founded-by-trade-desk-vets/" },
            { label: "Bluefish AI Series A PR", url: "https://www.prnewswire.com/news-releases/bluefish-raises-20m-to-power-ai-marketing-for-the-fortune-500-302534342.html" },
            { label: "Otterly.AI Pricing", url: "https://otterly.ai/pricing" },
            { label: "Peec AI Pricing", url: "https://peec.ai/pricing" },
            { label: "Rankscale Pricing", url: "https://rankscale.ai/pricing" },
            { label: "Profound Pricing", url: "https://www.tryprofound.com/pricing" },
            { label: "Sellm Pricing Guide", url: "https://sellm.io/post/ai-search-api-pricing-guide" },
            { label: "Best GEO Tools 2026 (Geoptie)", url: "https://geoptie.com/blog/best-geo-tools" },
            { label: "Best LLMO Tools 2026 (ZipTie.dev)", url: "https://ziptie.dev/blog/best-llmo-tools/" },
            { label: "SitePoint — Best GEO Tools", url: "https://www.sitepoint.com/best-generative-engine-optimization-tools/" },
            { label: "SurferSEO — Best LLM Optimization Tools", url: "https://surferseo.com/blog/best-llm-optimization-tools/" },
          ]}
        />
      </div>
    </div>
  );
}
