"""
Content analyzer — extract GEO-relevant features from a URL or raw text.

Grounded in the GEO paper (Aggarwal et al., KDD 2024) strategies:
  Quotations +41%, Statistics +37%, Citations +30%, Fluency +28%

Each feature is independent from LLM polling observations — these are
content signals the user controls.
"""

import json
import re
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import Optional

import requests
from bs4 import BeautifulSoup


# ── Common words list (top ~200 for technical term filtering) ───────────────

_COMMON_WORDS = set("""
the be to of and a in that have i it for not on with he as you do at this but
his by from they we say her she or an will my one all would there their what so
up out if about who get which go me when make can like time no just him know take
people into year your good some could them see other than then now look only come
its over think also back after use two how our work first well way even new want
because any these give day most us is are was were been being had has have do does
did would could should may might shall will can must need dare get got make made
take took find found know knew see saw go went come came give gave tell told say
said think thought very also just more much still already yet again often never
always sometimes usually here there where when why how what which who whom whose
each every all both few many several some any no not more most other another such
same different own before after between through during without within along
""".split())


@dataclass
class ContentAnalysis:
    # Statistics (GEO: +37%)
    statistics_count: int = 0
    statistics_density: float = 0.0  # per 1000 words

    # Quotations (GEO: +41%)
    quotation_count: int = 0

    # Citations (GEO: +30%)
    citation_count: int = 0
    external_link_count: int = 0

    # Content length (Profound: 5-10K sweet spot)
    content_length: int = 0
    word_count: int = 0

    # Readability (GEO: +28%)
    avg_sentence_length: float = 0.0
    readability_grade: float = 0.0

    # Technical terms (GEO: +18%)
    technical_term_density: float = 0.0

    # Freshness (Seer: 76.4% top-cited updated <30 days)
    last_modified: Optional[str] = None
    freshness_days: Optional[int] = None

    # Structured data
    has_schema_org: bool = False
    schema_types: Optional[list] = None

    # Heading structure
    h1_count: int = 0
    h2_count: int = 0
    h3_count: int = 0

    # Meta
    url: Optional[str] = None
    title: Optional[str] = None
    fetch_error: Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        if d["schema_types"] is None:
            d["schema_types"] = []
        return d


# ── Extraction helpers ──────────────────────────────────────────────────────

def _count_syllables(word: str) -> int:
    """Approximate syllable count using vowel groups."""
    word = word.lower().strip()
    if len(word) <= 3:
        return 1
    count = len(re.findall(r'[aeiouy]+', word))
    if word.endswith('e') and not word.endswith('le'):
        count = max(1, count - 1)
    return max(1, count)


def _extract_statistics(text: str) -> int:
    """Count statistics: numbers with context (percentages, currencies, decimals)."""
    patterns = [
        r'\d+\.?\d*\s*%',           # 45%, 3.2%
        r'\$\s*\d[\d,]*\.?\d*',     # $100, $1,000.50
        r'€\s*\d[\d,]*\.?\d*',      # €100
        r'\d[\d,]*\.?\d*\s*(million|billion|trillion|thousand)',  # 5 million
        r'\b\d+\.?\d*x\b',          # 3.5x
        r'\b\d{2,}[\d,]*\b',        # numbers with 2+ digits (not single digits)
    ]
    total = 0
    for pattern in patterns:
        total += len(re.findall(pattern, text, re.IGNORECASE))
    return total


def _extract_quotations(text: str, soup: Optional[BeautifulSoup] = None) -> int:
    """Count quotations: quoted strings + blockquotes."""
    count = 0
    # Quoted text (min 10 chars inside quotes)
    count += len(re.findall(r'[""\u201c].{10,}?[""\u201d]', text))
    count += len(re.findall(r"['\u2018].{10,}?['\u2019]", text))
    # Blockquotes from HTML
    if soup:
        count += len(soup.find_all('blockquote'))
        count += len(soup.find_all('q'))
    return count


def _extract_citations(text: str, soup: Optional[BeautifulSoup], url: Optional[str]) -> tuple[int, int]:
    """Count citations: bracket refs + external links."""
    # Bracket-style citations [1], [source], (source)
    bracket_refs = len(re.findall(r'\[\d+\]', text))
    bracket_refs += len(re.findall(r'\[source\]|\[citation\]|\[ref\]', text, re.IGNORECASE))

    # External links
    external_links = 0
    if soup and url:
        own_domain = urlparse(url).netloc.lower()
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href.startswith('http'):
                link_domain = urlparse(href).netloc.lower()
                if link_domain and link_domain != own_domain:
                    external_links += 1

    return bracket_refs + external_links, external_links


def _compute_readability(text: str) -> tuple[float, float]:
    """Compute avg sentence length and Flesch-Kincaid grade level."""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

    if not sentences:
        return 0, 0

    words = text.split()
    total_words = len(words)
    total_sentences = len(sentences)
    avg_sentence_length = total_words / total_sentences if total_sentences > 0 else 0

    total_syllables = sum(_count_syllables(w) for w in words)
    avg_syllables = total_syllables / total_words if total_words > 0 else 0

    # Flesch-Kincaid Grade Level
    grade = 0.39 * avg_sentence_length + 11.8 * avg_syllables - 15.59
    grade = max(0, min(20, grade))

    return round(avg_sentence_length, 1), round(grade, 1)


def _extract_technical_terms(text: str) -> float:
    """Count multi-syllable uncommon words per 1000 words."""
    words = re.findall(r'[a-zA-Z]{4,}', text.lower())
    if not words:
        return 0

    technical = 0
    for word in words:
        if word not in _COMMON_WORDS and _count_syllables(word) >= 3:
            technical += 1

    return round(technical / len(words) * 1000, 1)


def _extract_freshness(headers: Optional[dict], soup: Optional[BeautifulSoup]) -> tuple[Optional[str], Optional[int]]:
    """Extract content freshness from headers and meta tags."""
    date_str = None

    # HTTP Last-Modified header
    if headers and 'Last-Modified' in headers:
        date_str = headers['Last-Modified']

    # Meta tags
    if not date_str and soup:
        for attr in ['article:modified_time', 'article:published_time', 'date', 'DC.date']:
            meta = soup.find('meta', attrs={'property': attr}) or soup.find('meta', attrs={'name': attr})
            if meta and meta.get('content'):
                date_str = meta['content']
                break

    # <time> element
    if not date_str and soup:
        time_el = soup.find('time', attrs={'datetime': True})
        if time_el:
            date_str = time_el['datetime']

    if not date_str:
        return None, None

    # Parse date
    for fmt in ['%a, %d %b %Y %H:%M:%S %Z', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d', '%Y-%m-%dT%H:%M:%S%z']:
        try:
            dt = datetime.strptime(date_str[:25], fmt)
            days = (datetime.now(timezone.utc) - dt.replace(tzinfo=timezone.utc)).days
            return date_str, max(0, days)
        except (ValueError, TypeError):
            continue

    return date_str, None


def _extract_schema(soup: BeautifulSoup) -> tuple[bool, list[str]]:
    """Check for schema.org structured data."""
    types = []

    # JSON-LD
    for script in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(script.string or '')
            if isinstance(data, dict):
                t = data.get('@type', '')
                if t:
                    types.append(t if isinstance(t, str) else str(t))
            elif isinstance(data, list):
                for item in data:
                    t = item.get('@type', '') if isinstance(item, dict) else ''
                    if t:
                        types.append(t if isinstance(t, str) else str(t))
        except (json.JSONDecodeError, AttributeError):
            pass

    # Microdata
    for el in soup.find_all(attrs={'itemtype': True}):
        itemtype = el.get('itemtype', '')
        if 'schema.org' in itemtype:
            name = itemtype.split('/')[-1]
            if name and name not in types:
                types.append(name)

    return len(types) > 0, types


# ── Main analysis functions ─────────────────────────────────────────────────

def analyze_html(html: str, url: Optional[str] = None, headers: Optional[dict] = None) -> ContentAnalysis:
    """Analyze HTML content and extract GEO features."""
    soup = BeautifulSoup(html, 'html.parser')

    # Remove script/style elements
    for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
        tag.decompose()

    text = soup.get_text(separator=' ', strip=True)
    words = text.split()
    word_count = len(words)

    # Title
    title_tag = soup.find('title')
    title = title_tag.get_text(strip=True) if title_tag else None

    # Features
    stats_count = _extract_statistics(text)
    quote_count = _extract_quotations(text, soup)
    cite_count, ext_links = _extract_citations(text, soup, url)
    avg_sent, grade = _compute_readability(text)
    tech_density = _extract_technical_terms(text)
    last_mod, fresh_days = _extract_freshness(headers, soup)
    has_schema, schema_types = _extract_schema(soup)

    return ContentAnalysis(
        statistics_count=stats_count,
        statistics_density=round(stats_count / word_count * 1000, 1) if word_count > 0 else 0,
        quotation_count=quote_count,
        citation_count=cite_count,
        external_link_count=ext_links,
        content_length=len(text),
        word_count=word_count,
        avg_sentence_length=avg_sent,
        readability_grade=grade,
        technical_term_density=tech_density,
        last_modified=last_mod,
        freshness_days=fresh_days,
        has_schema_org=has_schema,
        schema_types=schema_types or [],
        h1_count=len(soup.find_all('h1')),
        h2_count=len(soup.find_all('h2')),
        h3_count=len(soup.find_all('h3')),
        url=url,
        title=title,
    )


def analyze_url(url: str, timeout: int = 10) -> ContentAnalysis:
    """Fetch a URL and analyze its content."""
    try:
        resp = requests.get(
            url,
            timeout=timeout,
            headers={'User-Agent': 'Bitsy-ContentAnalyzer/1.0'},
            allow_redirects=True,
        )
        resp.raise_for_status()

        # Cap at 2MB
        html = resp.text[:2_000_000]
        return analyze_html(html, url=url, headers=dict(resp.headers))

    except requests.exceptions.Timeout:
        return ContentAnalysis(url=url, fetch_error="Timeout: page took too long to load")
    except requests.exceptions.ConnectionError:
        return ContentAnalysis(url=url, fetch_error="Connection error: could not reach the site")
    except requests.exceptions.HTTPError as e:
        return ContentAnalysis(url=url, fetch_error=f"HTTP error: {e.response.status_code}")
    except Exception as e:
        return ContentAnalysis(url=url, fetch_error=str(e))


def analyze_text(text: str) -> ContentAnalysis:
    """Analyze raw text (no HTML parsing, no URL fetching)."""
    words = text.split()
    word_count = len(words)

    stats_count = _extract_statistics(text)
    quote_count = _extract_quotations(text)
    _, _ = 0, 0  # no citations from raw text
    avg_sent, grade = _compute_readability(text)
    tech_density = _extract_technical_terms(text)

    return ContentAnalysis(
        statistics_count=stats_count,
        statistics_density=round(stats_count / word_count * 1000, 1) if word_count > 0 else 0,
        quotation_count=quote_count,
        citation_count=0,
        external_link_count=0,
        content_length=len(text),
        word_count=word_count,
        avg_sentence_length=avg_sent,
        readability_grade=grade,
        technical_term_density=tech_density,
        h1_count=0,
        h2_count=0,
        h3_count=0,
    )


# ── Rating logic ────────────────────────────────────────────────────────────

FEATURE_RATINGS = {
    "statistics": {
        "label": "Statistics & Data Points",
        "geo_impact": "+37% visibility (GEO paper)",
        "thresholds": {"good": 5, "needs_work": 1},  # per 1K words
        "key": "statistics_density",
        "desc_good": "Strong data-backed content with specific numbers and percentages.",
        "desc_needs_work": "Some data points, but adding more statistics could improve AI citation.",
        "desc_missing": "No statistics found. Adding concrete numbers is the #2 highest-impact GEO strategy.",
    },
    "quotations": {
        "label": "Expert Quotations",
        "geo_impact": "+41% visibility (GEO paper)",
        "thresholds": {"good": 3, "needs_work": 1},
        "key": "quotation_count",
        "desc_good": "Multiple attributed quotes from credible sources.",
        "desc_needs_work": "Few quotations. Adding expert quotes is the #1 highest-impact GEO strategy.",
        "desc_missing": "No quotations found. This is the single highest-impact content change you can make.",
    },
    "citations": {
        "label": "Source Citations",
        "geo_impact": "+30% visibility (GEO paper, +115% for underdogs)",
        "thresholds": {"good": 5, "needs_work": 1},
        "key": "citation_count",
        "desc_good": "Well-sourced content with multiple external references.",
        "desc_needs_work": "Some citations, but more authoritative references would help.",
        "desc_missing": "No citations found. Citing credible sources is especially impactful for lesser-known brands.",
    },
    "content_length": {
        "label": "Content Length",
        "geo_impact": "5-10K chars = highest citation rate (Profound 680M study)",
        "thresholds": {"good": 5000, "needs_work": 2000},  # chars
        "key": "content_length",
        "desc_good": "Content length is in the optimal range for AI citation.",
        "desc_needs_work": "Content is short. Pages with 5-10K characters get significantly more citations.",
        "desc_missing": "Very little content. AI models need substance to cite.",
    },
    "readability": {
        "label": "Readability & Fluency",
        "geo_impact": "+28% visibility (GEO paper)",
        "thresholds": {"good": 12, "needs_work": 16},  # grade level (lower = more readable)
        "key": "readability_grade",
        "desc_good": "Clear, readable writing that AI models can easily extract and cite.",
        "desc_needs_work": "Writing is somewhat complex. Simpler sentences improve AI extraction.",
        "desc_missing": "Not enough text to assess readability.",
    },
    "freshness": {
        "label": "Content Freshness",
        "geo_impact": "76.4% of top-cited pages updated within 30 days (Seer Interactive)",
        "thresholds": {"good": 30, "needs_work": 90},  # days (lower = fresher)
        "key": "freshness_days",
        "desc_good": "Content is fresh. AI models strongly favor recently updated pages.",
        "desc_needs_work": "Content is aging. Consider refreshing to improve AI visibility.",
        "desc_missing": "Could not detect content date. Adding publication/update dates helps.",
    },
    "structured_data": {
        "label": "Structured Data (Schema.org)",
        "geo_impact": "Improves citation accuracy, not citation rate",
        "thresholds": {"good": 1, "needs_work": 0},
        "key": "has_schema_org",
        "desc_good": "Schema.org markup detected. Helps AI models extract accurate information.",
        "desc_needs_work": "",
        "desc_missing": "No structured data found. Adding schema.org helps accuracy of AI citations.",
    },
    "headings": {
        "label": "Heading Structure",
        "geo_impact": "Well-structured content is easier for AI to parse and cite",
        "thresholds": {"good": 3, "needs_work": 1},  # total headings
        "key": "h2_count",
        "desc_good": "Good heading structure for content extraction.",
        "desc_needs_work": "Minimal heading structure. More H2/H3 sections help AI parse your content.",
        "desc_missing": "No headings found. Structure your content with H2/H3 sections.",
    },
}


def rate_features(analysis: ContentAnalysis) -> list[dict]:
    """Rate each feature as good/needs_work/missing and return display-ready list."""
    results = []
    d = analysis.to_dict()

    for feat_id, spec in FEATURE_RATINGS.items():
        key = spec["key"]
        value = d.get(key)
        good_threshold = spec["thresholds"]["good"]
        work_threshold = spec["thresholds"]["needs_work"]

        # Special handling for inverted scales (readability, freshness: lower = better)
        if key in ("readability_grade", "freshness_days"):
            if value is None or value == 0:
                rating = "missing"
            elif value <= good_threshold:
                rating = "good"
            elif value <= work_threshold:
                rating = "needs_work"
            else:
                rating = "missing"
        elif key == "has_schema_org":
            rating = "good" if value else "missing"
        else:
            if value is None:
                rating = "missing"
            elif value >= good_threshold:
                rating = "good"
            elif value >= work_threshold:
                rating = "needs_work"
            else:
                rating = "missing"

        desc = spec[f"desc_{rating}"]

        results.append({
            "name": feat_id,
            "label": spec["label"],
            "value": value,
            "geo_impact": spec["geo_impact"],
            "rating": rating,
            "description": desc,
        })

    return results


def compute_overall_score(rated_features: list[dict]) -> float:
    """Compute 0-100 overall score from rated features."""
    scores = {"good": 100, "needs_work": 50, "missing": 0}
    total = sum(scores.get(f["rating"], 0) for f in rated_features)
    return round(total / len(rated_features), 1) if rated_features else 0


def generate_summary(analysis: ContentAnalysis, rated_features: list[dict]) -> str:
    """Generate a one-paragraph content summary."""
    good = [f for f in rated_features if f["rating"] == "good"]
    needs_work = [f for f in rated_features if f["rating"] == "needs_work"]
    missing = [f for f in rated_features if f["rating"] == "missing"]

    parts = []

    if analysis.word_count > 0:
        parts.append(f"Your page has {analysis.word_count:,} words")
    if analysis.statistics_count > 0:
        parts.append(f"{analysis.statistics_count} statistics")
    if analysis.quotation_count > 0:
        parts.append(f"{analysis.quotation_count} quotations")
    if analysis.citation_count > 0:
        parts.append(f"{analysis.citation_count} citations")

    summary = ", ".join(parts) + "." if parts else "We analyzed your content."

    if missing:
        top_missing = missing[0]
        summary += f" Priority: {top_missing['description']}"
    elif needs_work:
        top_work = needs_work[0]
        summary += f" Consider: {top_work['description']}"
    else:
        summary += " Your content is well-optimized for AI visibility."

    return summary
