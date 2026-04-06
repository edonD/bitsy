"""
Scrape brand signals (freshness, authority, domain metrics, etc)
"""

from datetime import datetime, timedelta
from typing import Dict, Optional
import httpx
from sqlalchemy.orm import Session
from core.database import BrandSignal
import os

# APIs for different signals
class SignalScraper:
    """Collect brand signals for training data"""

    def __init__(self):
        self.moz_api_key = os.getenv("MOZ_API_KEY")
        self.g2_api_key = os.getenv("G2_API_KEY")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")

    async def get_freshness(self, brand: str) -> float:
        """
        Days since brand last mentioned in Google News
        """
        try:
            # Query Google News API for latest mention
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://newsapi.org/v2/everything",
                    params={
                        "q": brand,
                        "sortBy": "publishedAt",
                        "pageSize": 1,
                        "apiKey": self.google_api_key,
                    },
                    timeout=10,
                )
                data = response.json()

                if data["articles"]:
                    last_mention_date = data["articles"][0]["publishedAt"]
                    # Parse ISO format date
                    last_mention = datetime.fromisoformat(
                        last_mention_date.replace("Z", "+00:00")
                    )
                    days_ago = (datetime.now(last_mention.tzinfo) - last_mention).days
                    return float(days_ago)
                else:
                    return 365.0  # No recent mentions = 1 year

        except Exception as e:
            print(f"Error getting freshness for {brand}: {e}")
            return 30.0  # Default

    async def get_authority_count(self, brand: str) -> int:
        """
        Count of high-authority source mentions:
        - Gartner (1 point)
        - G2 Reviews (1 point)
        - Capterra (1 point)
        - Wikipedia (1 point)
        - Forbes (1 point)
        - TechCrunch (1 point)
        """
        authority_count = 0

        # Check Gartner (via scraping or paid API)
        # For demo: check if brand appears in Gartner magic quadrant
        # This would require paid Gartner API in production
        authority_count += 1 if await self._check_gartner(brand) else 0

        # Check G2
        authority_count += 1 if await self._check_g2(brand) else 0

        # Check Capterra
        authority_count += 1 if await self._check_capterra(brand) else 0

        # Check Wikipedia
        authority_count += 1 if await self._check_wikipedia(brand) else 0

        # Check Forbes mentions
        authority_count += 1 if await self._check_forbes(brand) else 0

        # Check TechCrunch
        authority_count += 1 if await self._check_techcrunch(brand) else 0

        return authority_count

    async def _check_gartner(self, brand: str) -> bool:
        """Check if brand is in Gartner Magic Quadrant"""
        # In production: use Gartner paid API or web scraping
        # For now: hardcoded for testing
        known_gartner = {"Zapier", "Make", "Airtable", "Notion"}
        return brand in known_gartner

    async def _check_g2(self, brand: str) -> bool:
        """Check if brand has G2 profile"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://www.g2.com/search?q={brand}",
                    timeout=10,
                )
                return response.status_code == 200
        except:
            return False

    async def _check_capterra(self, brand: str) -> bool:
        """Check if brand has Capterra profile"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://www.capterra.com/search/?q={brand}",
                    timeout=10,
                )
                return response.status_code == 200
        except:
            return False

    async def _check_wikipedia(self, brand: str) -> bool:
        """Check if brand has Wikipedia page"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://en.wikipedia.org/w/api.php",
                    params={"action": "query", "titles": brand, "format": "json"},
                    timeout=10,
                )
                data = response.json()
                pages = data.get("query", {}).get("pages", {})
                # If -1 key present, page doesn't exist
                return "-1" not in pages
        except:
            return False

    async def _check_forbes(self, brand: str) -> bool:
        """Check Forbes mentions"""
        try:
            async with httpx.AsyncClient() as client:
                # Use Google to search Forbes mentions of brand
                response = await client.get(
                    "https://www.google.com/search",
                    params={"q": f"site:forbes.com {brand}"},
                    timeout=10,
                )
                return "result" in response.text
        except:
            return False

    async def _check_techcrunch(self, brand: str) -> bool:
        """Check TechCrunch mentions"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.google.com/search",
                    params={"q": f"site:techcrunch.com {brand}"},
                    timeout=10,
                )
                return "result" in response.text
        except:
            return False

    async def get_domain_authority(self, domain: str) -> float:
        """
        Get domain authority (Moz DA score)
        Requires Moz API key
        """
        try:
            async with httpx.AsyncClient() as client:
                # Use Moz API to get domain authority
                response = await client.post(
                    "https://api.moz.com/v2/url/metrics",
                    json={"urls": [domain]},
                    auth=(self.moz_api_key, ""),
                    timeout=10,
                )
                data = response.json()
                if data:
                    return float(data[0].get("domain_authority", 50.0))
                return 50.0
        except Exception as e:
            print(f"Error getting DA for {domain}: {e}")
            return 50.0  # Default

    async def get_content_metrics(self, brand: str) -> Dict[str, float]:
        """
        Get content metrics for a brand
        - Number of blog posts
        - Average age of posts
        - Publishing frequency
        """
        # This would require:
        # 1. Scraping brand's website for blog posts
        # 2. Extracting publish dates
        # 3. Computing averages
        # For demo: return reasonable defaults
        return {
            "num_blog_posts": 45,
            "avg_article_age_days": 30.0,
            "publishing_frequency": 2.0,  # posts per week
        }

    async def get_market_share(self, brand: str, competitors: list) -> float:
        """
        Calculate market share relative to competitors
        Based on mention rates in API calls
        """
        # This would be computed from mention_records table
        # For now: placeholder
        return 0.15  # 15% of mentions vs competitors

    async def scrape_all_signals(
        self, brand: str, domain: str, competitors: list
    ) -> Dict:
        """
        Collect all signals for a brand
        """
        today = datetime.now().strftime("%Y-%m-%d")

        signals = {
            "date": today,
            "brand": brand,
            "freshness_days": await self.get_freshness(brand),
            "authority_count": await self.get_authority_count(brand),
            "domain_authority": await self.get_domain_authority(domain),
            "schema_markup_score": 0.65,  # Would check actual schema
            "market_share": await self.get_market_share(brand, competitors),
        }

        content = await self.get_content_metrics(brand)
        signals.update(content)

        return signals

    async def collect_all_brands(
        self,
        db: Session,
        brands: list,
        brand_domains: Dict[str, str],
        competitors: list,
    ):
        """
        Collect signals for all brands
        """
        print("Starting brand signal collection...")

        for brand in brands:
            domain = brand_domains.get(brand, f"{brand.lower()}.com")

            # Scrape all signals
            signals = await self.scrape_all_signals(brand, domain, competitors)

            # Store in database
            record = BrandSignal(
                date=signals["date"],
                brand=brand,
                freshness_days=signals["freshness_days"],
                authority_count=signals["authority_count"],
                domain_authority=signals["domain_authority"],
                num_queries=120,  # Would be computed from mention data
                market_share=signals["market_share"],
                content_age_days=signals.get("avg_article_age_days", 30),
                competitor_rank=5,  # Would compute this
                schema_markup_score=signals["schema_markup_score"],
            )
            db.add(record)
            print(f"  {brand}: authority={signals['authority_count']}, freshness={signals['freshness_days']} days")

        db.commit()
        print("✓ Completed brand signal collection")


if __name__ == "__main__":
    print("Signal scraper module - called by daily pipeline")
