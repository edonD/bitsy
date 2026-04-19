"""
Known homepage URLs for tracked brands.

Every brand we run through the benchmark panel needs a URL for the
competitor crawler. New customer brands get their URL added here (or,
eventually, via the product — for now it's a static registry).

Match is case-insensitive and uses the full brand name as the key.
"""

BRAND_DOMAINS: dict[str, str] = {
    # AI search visibility / GEO
    "Bitsy": "https://aisplash.me",
    "Profound": "https://tryprofound.com",
    "Peec AI": "https://peec.ai",
    "Otterly.AI": "https://otterly.ai",
    "AthenaHQ": "https://athenahq.ai",
    "Scrunch": "https://scrunch.com",
    "Goodie AI": "https://goodie.ai",
    "Azoma": "https://azoma.ai",
    # CRM
    "HubSpot": "https://hubspot.com",
    "Salesforce": "https://salesforce.com",
    "Pipedrive": "https://pipedrive.com",
    "Zoho CRM": "https://zoho.com/crm",
    "Monday.com": "https://monday.com",
    "Freshsales": "https://freshworks.com/crm",
    "Keap": "https://keap.com",
    "Close": "https://close.com",
    "Insightly": "https://insightly.com",
    "Capsule": "https://capsulecrm.com",
    # E-commerce fashion
    "Zalando": "https://zalando.com",
    "ASOS": "https://asos.com",
    "H&M": "https://hm.com",
    "Zara": "https://zara.com",
    "Shein": "https://shein.com",
    "About You": "https://aboutyou.com",
    # Productivity / notes
    "Notion": "https://notion.so",
    "Evernote": "https://evernote.com",
    "Obsidian": "https://obsidian.md",
}


def get_domain(brand: str) -> str | None:
    """Case-insensitive lookup. Returns the mapped homepage URL or None."""
    if not brand:
        return None
    needle = brand.strip().lower()
    for name, url in BRAND_DOMAINS.items():
        if name.lower() == needle:
            return url
    return None
