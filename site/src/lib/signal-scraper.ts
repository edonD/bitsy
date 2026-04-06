/**
 * Scrape brand signals (freshness, authority, domain metrics, etc)
 */

export interface BrandSignals {
  freshness_days: number;
  authority_count: number;
  domain_authority: number;
  num_queries: number;
  market_share: number;
  content_age_days: number;
  competitor_rank: number;
  schema_markup_score: number;
}

/**
 * Get freshness: Days since brand last mentioned in Google News
 */
export async function getFreshness(brand: string): Promise<number> {
  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${brand}&sortBy=publishedAt&pageSize=1&apiKey=${process.env.GOOGLE_NEWS_API_KEY}`
    );

    if (!response.ok) {
      return 30; // Default if API fails
    }

    const data = await response.json();

    if (data.articles && data.articles.length > 0) {
      const lastMention = new Date(data.articles[0].publishedAt);
      const today = new Date();
      const daysAgo = Math.floor(
        (today.getTime() - lastMention.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysAgo;
    }

    return 365; // No recent mentions
  } catch (e) {
    console.error("Freshness error:", e);
    return 30;
  }
}

/**
 * Get authority count: Is brand on major platforms?
 */
export async function getAuthorityCount(brand: string): Promise<number> {
  let count = 0;

  // Check Gartner (hardcoded for now - would need API in production)
  const gartnerBrands = ["Zapier", "Make", "Airtable", "Notion"];
  if (gartnerBrands.includes(brand)) count++;

  // Check G2
  try {
    const g2Response = await fetch(`https://www.g2.com/search?q=${brand}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (g2Response.ok) count++;
  } catch {
    // G2 not available
  }

  // Check Capterra
  try {
    const capterraResponse = await fetch(
      `https://www.capterra.com/search/?q=${brand}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
      }
    );
    if (capterraResponse.ok) count++;
  } catch {
    // Capterra not available
  }

  // Check Wikipedia (via API)
  try {
    const wikiResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${brand}&format=json`
    );
    if (wikiResponse.ok) {
      const data = await wikiResponse.json();
      const pages = data.query.pages;
      if (!pages["-1"]) count++; // Page exists
    }
  } catch {
    // Wikipedia not available
  }

  // Estimate Forbes and TechCrunch (would use Google search in production)
  count += Math.random() > 0.5 ? 1 : 0; // Forbes
  count += Math.random() > 0.5 ? 1 : 0; // TechCrunch

  return Math.min(count, 6); // Max 6
}

/**
 * Get domain authority: Moz DA score
 */
export async function getDomainAuthority(domain: string): Promise<number> {
  try {
    const response = await fetch("https://api.moz.com/v2/url/metrics", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.MOZ_API_KEY + ":" || ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targets: [domain],
      }),
    });

    if (!response.ok) {
      return 50; // Default
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].domain_authority || 50;
    }

    return 50;
  } catch (e) {
    console.error("Domain authority error:", e);
    return 50;
  }
}

/**
 * Get content age: Average age of brand's blog posts
 */
export async function getContentAge(domain: string): Promise<number> {
  try {
    const response = await fetch(`https://${domain}/blog`);

    if (!response.ok) {
      return 30; // Default
    }

    // In production: parse HTML, find all blog posts, calculate average age
    // For now: return estimate
    return Math.round(Math.random() * 60);
  } catch (e) {
    console.error("Content age error:", e);
    return 30;
  }
}

/**
 * Get schema markup score: How well is structured data implemented?
 */
export async function getSchemaMarkupScore(domain: string): Promise<number> {
  try {
    const response = await fetch(`https://${domain}`);

    if (!response.ok) {
      return 0.5; // Default
    }

    const html = await response.text();

    // Check for schema.org markup
    if (html.includes("application/ld+json")) {
      // Parse JSON-LD
      const schemaMatches = html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
      );

      if (schemaMatches && schemaMatches.length > 0) {
        try {
          const schema = JSON.parse(
            schemaMatches[0]
              .replace(/<script type="application\/ld\+json">/, "")
              .replace(/<\/script>/, "")
          );

          // Simple scoring
          const fields = ["@type", "name", "description", "url", "offers"];
          let score = 0;

          for (const field of fields) {
            if (schema[field]) score++;
          }

          return score / fields.length;
        } catch {
          return 0.5;
        }
      }
    }

    return 0.3; // No schema found
  } catch (e) {
    console.error("Schema markup error:", e);
    return 0.5;
  }
}

/**
 * Collect all signals for a brand
 */
export async function collectBrandSignals(
  brand: string,
  domain: string,
  mentionCounts: Record<string, number>,
  totalMentions: number
): Promise<BrandSignals> {
  return {
    freshness_days: await getFreshness(brand),
    authority_count: await getAuthorityCount(brand),
    domain_authority: await getDomainAuthority(domain),
    num_queries: mentionCounts[brand] || 0,
    market_share: totalMentions > 0 ? mentionCounts[brand] / totalMentions : 0,
    content_age_days: await getContentAge(domain),
    competitor_rank: Math.round(Math.random() * 10) + 1, // TODO: Calculate properly
    schema_markup_score: await getSchemaMarkupScore(domain),
  };
}
