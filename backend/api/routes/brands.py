"""
Brands endpoints
"""

from fastapi import APIRouter
from api.models import BrandCreate, BrandResponse

router = APIRouter()

# In-memory storage (replace with database later)
BRANDS = {}


@router.post("/", response_model=BrandResponse)
async def create_brand(brand: BrandCreate):
    """Create a new brand"""
    brand_id = f"brand_{len(BRANDS) + 1}"
    BRANDS[brand_id] = {
        "id": brand_id,
        "name": brand.name,
        "category": brand.category,
        "website_url": brand.website_url,
        "current_mention_rate": 35.0,  # Mock data
        "week_avg_mention_rate": 35.5,
    }
    return BRANDS[brand_id]


@router.get("/{brand_id}", response_model=BrandResponse)
async def get_brand(brand_id: str):
    """Get brand details"""
    if brand_id not in BRANDS:
        # Return mock brand for demo
        return BrandResponse(
            id=brand_id,
            name="Sample Brand",
            category="SaaS",
            website_url="https://example.com",
            current_mention_rate=35.0,
            week_avg_mention_rate=35.5,
        )

    return BRANDS[brand_id]
