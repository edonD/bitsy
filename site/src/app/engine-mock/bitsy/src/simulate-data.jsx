// Simulate — data, fan-outs, plays.
// Lift values are central estimates from: GEO/KDD '24 (Aggarwal et al.),
// AirOps citation studies, Princeton/Stanford LLM-source-bias work.

/* ── Query fan-out: the sub-queries an LLM actually runs ─────
   Real LLMs decompose a user query into 3-8 sub-queries and run them
   in parallel before synthesizing. We infer plausible fan-outs from
   the surface query. This is the most novel thing in the simulator. */

function fanOutQuery(query, brand, competitors) {
  const q = query.toLowerCase();
  const comp = competitors[0] || "alternatives";
  const comp2 = competitors[1] || "the leader";

  // Comparison fan-out
  if (q.includes("best") || q.includes("top")) {
    const topic = query.replace(/best|top/i, "").trim() || "category";
    return [
      { sub: `${brand} review`,                       you: 38, source: "review-site" },
      { sub: `${comp} vs ${comp2}`,                   you:  8, source: "listicle"   },
      { sub: `${topic} comparison 2024`,              you: 22, source: "blog"       },
      { sub: `${topic} reddit`,                       you:  4, source: "reddit"     },
      { sub: `${comp} alternatives`,                  you: 18, source: "review-site"},
      { sub: `${topic} pricing`,                      you: 12, source: "owned"      },
    ];
  }

  if (q.includes("vs") || q.includes("compare")) {
    return [
      { sub: `${brand} pricing`,                      you: 32, source: "owned"      },
      { sub: `${comp} pricing`,                       you:  6, source: "owned"      },
      { sub: `${brand} review`,                       you: 28, source: "review-site"},
      { sub: `${comp} review`,                        you:  4, source: "review-site"},
      { sub: `${brand} vs ${comp} reddit`,            you: 10, source: "reddit"     },
    ];
  }

  if (q.includes("how") || q.includes("rank") || q.includes("optimize")) {
    return [
      { sub: query.replace(/^how (to|do)\s*/i, "") + " guide", you: 42, source: "blog" },
      { sub: `${brand} ${query.toLowerCase().includes("rank") ? "ranking" : "guide"}`, you: 50, source: "owned" },
      { sub: query + " 2024",                         you: 18, source: "blog"       },
      { sub: `${query} reddit`,                       you:  6, source: "reddit"     },
      { sub: `${query} case study`,                   you: 14, source: "case-study" },
    ];
  }

  if (q.includes("price") || q.includes("cost")) {
    return [
      { sub: `${brand} pricing page`,                 you: 62, source: "owned"       },
      { sub: `${brand} cost reddit`,                  you:  8, source: "reddit"      },
      { sub: `${brand} vs ${comp} cost`,              you: 22, source: "listicle"    },
      { sub: `${brand} discount`,                     you: 18, source: "blog"        },
    ];
  }

  // Generic fallback
  return [
    { sub: `${brand} overview`,                       you: 48, source: "owned"      },
    { sub: `${brand} review`,                         you: 24, source: "review-site"},
    { sub: query + " comparison",                     you: 12, source: "listicle"   },
    { sub: query + " reddit",                         you:  6, source: "reddit"     },
  ];
}

/* ── Owned content assets (the "edit a page" lever) ─────────── */

function makeOwnedAssets(brand, website, queries) {
  const host = (website || `https://${brand.toLowerCase().replace(/\s+/g, "")}.com`).replace(/\/$/, "");
  return [
    {
      id: "homepage",
      url: `${host}/`,
      role: "Homepage hero",
      lastUpdated: "5 mo ago",
      currentSnippet: `${brand} helps teams understand how AI search engines see their brand. Run a check in minutes and find what to change.`,
      strengths: ["clear category language"],
      weaknesses: ["no statistics", "no quotes", "no comparison"],
      relevantQueries: queries.slice(0, 2),
    },
    {
      id: "comparison",
      url: `${host}/vs/alternatives`,
      role: "Comparison page",
      lastUpdated: "missing — not yet published",
      missing: true,
      currentSnippet: `(no page yet — competitors own this surface)`,
      strengths: [],
      weaknesses: ["page does not exist", "competitors rank for it"],
      relevantQueries: queries.filter((q) => /best|top|vs|compare/i.test(q)),
    },
    {
      id: "blog-howto",
      url: `${host}/blog/ai-visibility-guide`,
      role: "How-to / guide",
      lastUpdated: "14 mo ago",
      currentSnippet: `Most teams have no idea whether ChatGPT or Perplexity actually mentions them. ${brand} fixes that. We poll the major assistants and show you where you appear and where you don't.`,
      strengths: ["covers the topic"],
      weaknesses: ["stale", "no expert quote", "no schema"],
      relevantQueries: queries.filter((q) => /how|rank|guide/i.test(q)).slice(0, 2),
    },
    {
      id: "pricing",
      url: `${host}/pricing`,
      role: "Pricing page",
      lastUpdated: "2 mo ago",
      currentSnippet: `Plans starting from $49/mo. Pro at $149/mo. Enterprise on request. 14-day trial.`,
      strengths: ["concrete numbers", "fresh"],
      weaknesses: ["no comparison to alternatives"],
      relevantQueries: queries.filter((q) => /price|cost|plan/i.test(q)),
    },
  ];
}

/* ── Plays — concrete actions with where + what + lift ─────── */

const PLAYS = [
  // A. Edit an owned page
  {
    id: "rewrite-page",
    category: "owned",
    catLabel: "Edit owned page",
    title: "Rewrite the page with stats + a quote",
    where: (asset) => asset ? asset.url : "Choose an owned page on the right",
    whatTitle: "What to write",
    what: (ctx) => `Open ${ctx.assetUrl}. Replace the current opener with a self-contained paragraph that:

1. Names the category in the first sentence (so the LLM can match topic)
2. States one concrete statistic (e.g. "${ctx.brand} appears in 42% of category answers across 800+ AI prompts")
3. Includes one named quotation from a customer or analyst
4. Ends with a single comparison sentence ("X works like Y but Z")

Avoid: hedging words (might / generally / sometimes), keyword stuffing, marketing fluff.`,
    lift: { low: 12, mid: 18, high: 28 },
    confidence: "high",
    effort: "low",
    timeToImpact: "1–2 weeks",
    citations: ["Aggarwal et al., GEO benchmark, KDD '24"],
    needsAsset: true,
  },
  {
    id: "ship-comparison",
    category: "owned",
    catLabel: "Edit owned page",
    title: "Ship a /vs/ comparison page",
    where: () => "/vs/<competitor>  ·  one page per major rival",
    whatTitle: "What to publish",
    what: (ctx) => `Build a dedicated comparison page at ${ctx.host}/vs/${(ctx.competitor||'competitor').toLowerCase().replace(/\\s+/g,'-')} that:

1. Title: "${ctx.brand} vs ${ctx.competitor || '<rival>'}: which to choose in 2024"
2. First 120 words: factual, even-handed verdict (LLMs cite evenhanded comparisons more)
3. Comparison TABLE with <thead>: pricing, key features, best-fit, limitations
4. Three honest "use ${ctx.competitor || 'the other'} if…" bullets
5. Outbound link to the competitor's site (yes, really — boosts trust signal)`,
    lift: { low: 18, mid: 28, high: 42 },
    confidence: "high",
    effort: "medium",
    timeToImpact: "3–6 weeks",
    citations: ["GEO benchmark · table effect", "AirOps comparison-page study"],
  },

  // B. Earn third-party citations
  {
    id: "reddit-thread",
    category: "earned",
    catLabel: "Earn third-party citation",
    title: "Seed a Reddit thread on the right subreddit",
    where: (asset, ctx) => `r/${ctx.subreddit || "SaaS"}  ·  also try r/${ctx.subreddit2 || "Entrepreneur"}, r/marketing`,
    whatTitle: "What to post",
    what: (ctx) => `Draft a question post (NOT a promotional post — Reddit will remove it):

Title: "Has anyone actually compared ${ctx.brand} vs ${ctx.competitor || '<rival>'}? Genuine question."

Body:
"I'm evaluating tools for ${ctx.useCase || 'AI search visibility'} and the marketing pages all sound the same. Looking for honest takes — what worked, what didn't, what made you switch?

(I work at a [stage] company, ~[size] team, currently using [tool/none].)"

Then engage genuinely in comments. Mention ${ctx.brand} only when natural — never first.

LLMs index Reddit heavily and quote highly-upvoted comments. One good thread = months of citations.`,
    lift: { low: 8, mid: 16, high: 32 },
    confidence: "medium",
    effort: "low",
    timeToImpact: "2–4 weeks",
    citations: ["Reddit is the #2 cited source in ChatGPT after Wikipedia (Profound, 2024)"],
  },
  {
    id: "listicle-pitch",
    category: "earned",
    catLabel: "Earn third-party citation",
    title: "Get included in a Forbes / G2 / niche listicle",
    where: () => "Targets: G2, Capterra, Forbes Advisor, niche review blogs (top 5 by domain rating)",
    whatTitle: "How to pitch",
    what: (ctx) => `Find existing listicles for "best ${ctx.useCase || 'tools in your category'}" that DON'T mention you yet. Use Ahrefs or this query in Google: "best ${ctx.useCase || 'category'}" -${ctx.brand}

For each, pitch the author with:

Subject: "Quick fact for your '${ctx.useCase || 'best X'}' roundup"

Body (keep under 150 words):
"Hi [name] — saw your roundup on [URL]. We're ${ctx.brand} and we [one-sentence differentiator with a number].

Three reasons we'd be a fit for the list:
• [concrete benchmark stat]
• [unique capability competitors lack]
• [credible customer or partner]

Happy to send screenshots, customer quotes, or a free trial. No expectation of inclusion — just thought it was worth flagging."

Pitch 12 listicles to land 2–3 inclusions. Each top-10 listicle inclusion = measurable visibility lift.`,
    lift: { low: 14, mid: 24, high: 38 },
    confidence: "high",
    effort: "medium",
    timeToImpact: "4–8 weeks",
    citations: ["Listicles are the highest-cited content type for comparison queries (AirOps)"],
  },
  {
    id: "g2-reviews",
    category: "earned",
    catLabel: "Earn third-party citation",
    title: "Drive 20+ recent G2 / Capterra reviews",
    where: () => "G2.com, Capterra, TrustRadius — all three indexed by all major LLMs",
    whatTitle: "How to drive reviews",
    what: (ctx) => `LLMs cite review-site averages and quote individual reviews verbatim. You need recency (last 90 days), volume (20+), and rating (>4.3).

Concrete plan:
1. Email your top 50 happy customers a one-paragraph ask, with a direct link to your G2 review form
2. Offer a small thank-you (G2 allows $10 gift cards as ethical incentive)
3. Provide 3 sample answer prompts so the review isn't blank: "What problem did ${ctx.brand} solve?", "What do you wish was different?", "Who would you recommend it to?"
4. Post the link in your in-app "thanks for the win" moments
5. Aim for one review per business day for a month

LLMs treat absence of recent reviews as a soft negative signal.`,
    lift: { low: 10, mid: 18, high: 28 },
    confidence: "high",
    effort: "medium",
    timeToImpact: "4–6 weeks",
    citations: ["Review aggregators are top-3 cited sources for B2B comparisons"],
  },
  {
    id: "wikipedia",
    category: "earned",
    catLabel: "Earn third-party citation",
    title: "Earn a Wikipedia mention (if eligible)",
    where: () => "The Wikipedia article for your CATEGORY, not a page about your brand",
    whatTitle: "How to qualify",
    what: (ctx) => `Wikipedia is the #1 cited source for ChatGPT and Claude. You can't write your own page — it'll be deleted. But you CAN be added to a category page if you're notable.

Eligibility:
• 2+ independent secondary sources have written substantively about you (Forbes, TechCrunch, industry trade press — not press releases)
• You represent a notable example of the category
• You have a verifiable claim (first to do X, largest by Y, partnered with Z)

Move:
1. Identify the Wikipedia article for your category
2. Find its "Notable companies" / "Examples" section
3. Edit (logged in, with a stable account) to add your company with TWO inline citations to independent sources
4. Use neutral, factual language — no marketing claims
5. Don't disclose you work there in the edit summary; the edit will be reverted

Most companies don't qualify. If you do, it's the single most durable AI visibility move.`,
    lift: { low: 6, mid: 14, high: 26 },
    confidence: "medium",
    effort: "high",
    timeToImpact: "8–16 weeks",
    citations: ["Wikipedia accounts for ~12% of all ChatGPT citations (Princeton, 2024)"],
  },

  // C. Fix structural / entity issues
  {
    id: "schema",
    category: "structural",
    catLabel: "Fix structure",
    title: "Add FAQ + Product schema markup",
    where: (asset) => asset ? asset.url : "All major content pages",
    whatTitle: "What to add",
    what: (ctx) => `Schema markup tells AI exactly what your page is. Pages with 3+ schema types get cited 30-40% more often (especially by Gemini, which uses Google's structured-data index).

Add to each major page:

\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What does ${ctx.brand} do?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "[one-sentence factual answer with the category name]"
    }
  }]
}
\`\`\`

Plus: Product schema on /pricing, Organization schema sitewide, BreadcrumbList on every page.

Validate with Google's Rich Results Test before shipping.`,
    lift: { low: 6, mid: 12, high: 20 },
    confidence: "high",
    effort: "low",
    timeToImpact: "1–2 weeks",
    citations: ["Schema effect on AI citations (SearchEngineLand, 2024)"],
  },
  {
    id: "freshness",
    category: "structural",
    catLabel: "Fix structure",
    title: "Refresh content older than 12 months",
    where: () => "All content pages with a visible date / last-updated stamp",
    whatTitle: "What to update",
    what: (ctx) => `LLMs heavily decay old content. Pages older than 12 months get cited ~40% less than equivalent fresh pages.

Concrete refresh steps for each stale page:
1. Update any year reference to the current year
2. Replace one stat with a newer one (or re-validate the current one and add "as of [month] [year]")
3. Add a visible "Last updated: [date]" line near the title
4. Add or update one quote/example to be from this year
5. Re-publish (don't just save — actually change the modified date in your CMS)

Audit your top 20 pages by traffic and refresh the oldest 5 each quarter. Compounds.`,
    lift: { low: 6, mid: 12, high: 22 },
    confidence: "medium-high",
    effort: "medium",
    timeToImpact: "2–4 weeks",
    citations: ["Content freshness decay (AirOps longitudinal study)"],
  },
  {
    id: "entity-consistency",
    category: "structural",
    catLabel: "Fix structure",
    title: "Standardize brand name + claims across the web",
    where: () => "Your site, social profiles, all directory listings (Crunchbase, LinkedIn, G2, AngelList, etc.)",
    whatTitle: "What to fix",
    what: (ctx) => `LLMs build an entity profile by triangulating mentions. If your name, tagline, or category description varies across the web, the model's confidence in the entity drops — which means fewer citations.

Audit:
1. Search "${ctx.brand}" across Crunchbase, LinkedIn, G2, Capterra, AngelList, Twitter/X bio, all your social profiles
2. Note variations: "${ctx.brand}", "${ctx.brand}.ai", "${ctx.brand} Inc", "${ctx.brand} the AI tool", etc.
3. Pick a canonical: one name, one tagline, one category descriptor (e.g. "AI search visibility platform")
4. Update every directory + profile to match exactly
5. On your own site, use the canonical phrasing in <title>, <h1>, og:title, schema "name" field

Boring but compounds. Do it once and it pays off forever.`,
    lift: { low: 4, mid: 8, high: 14 },
    confidence: "medium",
    effort: "low",
    timeToImpact: "2 weeks",
    citations: ["Entity disambiguation in retrieval-augmented generation (Stanford, 2024)"],
  },

  // D. Off-platform proof
  {
    id: "original-stat",
    category: "earned",
    catLabel: "Earn third-party citation",
    title: "Publish an original benchmark or stat others will cite",
    where: () => "Your blog + a press push to 5 trade publications + a LinkedIn post",
    whatTitle: "What to publish",
    what: (ctx) => `LLMs love specific, citeable numbers. Original research is the most durable visibility move — every time someone cites your stat, the LLM strengthens the (you → category) association.

Design:
1. Pick a question your audience genuinely wonders about ("How much does AI visibility actually move pipeline?")
2. Run a real analysis with sample size (n=400 brands, last 90 days, etc.)
3. Publish the methodology and the raw data — credibility lives or dies here
4. Headline finding: ONE bold, attributable stat (e.g. "B2B brands appear in 23% of category-relevant ChatGPT answers on average")
5. Press push: pitch to 5 trade publications with a 100-word summary + the raw data
6. LinkedIn: 3 separate posts dripped over 2 weeks, each highlighting a different finding

Cost: ~3 weeks of one analyst's time. Citation half-life: 18+ months.`,
    lift: { low: 16, mid: 28, high: 44 },
    confidence: "medium-high",
    effort: "high",
    timeToImpact: "8–14 weeks",
    citations: ["Original-research citations have the longest half-life (AirOps)"],
  },
  {
    id: "podcast",
    category: "earned",
    catLabel: "Earn third-party citation",
    title: "Get the founder on 3 niche podcasts",
    where: () => "Top-10 podcasts in your category by listener count (use Listen Notes)",
    whatTitle: "How to land it",
    what: (ctx) => `Podcasts get transcribed → indexed → cited. A founder appearance with a few quotable claims becomes searchable LLM evidence.

Move:
1. List 20 podcasts where your buyers actually listen (not the biggest — the most relevant)
2. Pitch each host with: ONE specific story angle (NOT a generic "I'd love to come on"), TWO contrarian or data-backed claims you'll make, ONE concrete outcome they can promise listeners
3. On the show, DROP a memorable phrase — a coined term, a counterintuitive stat, a bold claim — that gets clipped and quoted
4. After the episode airs, write a 600-word summary post on your blog, link the episode, embed the transcript (this is what the LLM indexes)

Goal: 3 appearances in 6 months. Each one becomes a citation surface.`,
    lift: { low: 8, mid: 14, high: 22 },
    confidence: "low-medium",
    effort: "medium",
    timeToImpact: "8–12 weeks",
    citations: ["Audio-source contributions to citation graphs (early-stage research)"],
  },
];

/* ── Per-assistant lift sensitivities (which plays move which model) ── */

const ASSISTANT_PROFILES = {
  chatgpt: { owned: 0.95, earned: 1.15, structural: 0.6  }, // weights Reddit + listicles heavily
  claude:  { owned: 1.0,  earned: 1.0,  structural: 0.85 }, // most balanced
  gemini:  { owned: 0.9,  earned: 0.85, structural: 1.25 }, // schema + structured data win here
};

/* ── Volatility model — predictions are distributions ───────── */

function predictForQuery(report, targetQuery, activePlayIds, ownedAsset) {
  if (!targetQuery) return null;
  const queryScore = report.queryScores.find((q) => q.query === targetQuery) || report.queryScores[0];
  const baselineRate = queryScore.targetRate;
  const baselineRank = queryScore.targetRank;

  const active = PLAYS.filter((p) => activePlayIds.includes(p.id));

  // per-assistant lift
  const targets = report.models.map((m) => {
    const profile = ASSISTANT_PROFILES[m.key] || ASSISTANT_PROFILES.chatgpt;
    let totalLift = 0;
    active.forEach((p, i) => {
      const weight = profile[p.category] || 1;
      const decay = Math.pow(0.9, i); // diminishing returns
      totalLift += p.lift.mid * weight * decay;
    });
    // lift is in "% of target query won" — convert to mention-rate impact
    const liftPp = totalLift * 0.35;
    const before = baselineRate;
    const after = Math.max(0, Math.min(95, Math.round(before + liftPp)));
    return { ...m, before: Math.round(before), after, deltaPp: after - Math.round(before) };
  });

  const avgBefore = baselineRate;
  const avgAfter = targets.reduce((s, t) => s + t.after, 0) / targets.length;
  const lift = Math.round(avgAfter - avgBefore);

  // confidence band: more plays = wider total but each has its own confidence
  const lowSum = active.reduce((s, p) => s + p.lift.low, 0);
  const highSum = active.reduce((s, p) => s + p.lift.high, 0);
  const decayFactor = active.length > 0 ? (1 - Math.pow(0.9, active.length)) / (active.length * (1 - 0.9)) : 1;
  const rangeLow = Math.max(0, Math.round(baselineRate + lowSum * 0.35 * decayFactor));
  const rangeHigh = Math.min(95, Math.round(baselineRate + highSum * 0.35 * decayFactor));

  // expected new rank
  const rankShift = lift > 18 ? -2 : lift > 8 ? -1 : 0;
  const newRank = Math.max(1, baselineRank + rankShift);

  // citation probability (likelihood of being cited at all for this query in a typical run)
  const citeBefore = Math.min(95, baselineRate + 8);
  const citeAfter = Math.min(95, citeBefore + lift * 1.4);

  return {
    targetQuery: queryScore,
    baselineRate, baselineRank,
    targets,
    avgBefore: Math.round(avgBefore),
    avgAfter: Math.round(avgAfter),
    lift,
    rangeLow, rangeHigh,
    newRank,
    citeBefore: Math.round(citeBefore),
    citeAfter: Math.round(citeAfter),
    activeCount: active.length,
    activePlays: active,
    confidence: active.length === 0 ? "—" : active.length >= 3 ? "medium" : "low-medium",
  };
}

Object.assign(window, { fanOutQuery, makeOwnedAssets, PLAYS, predictForQuery });
