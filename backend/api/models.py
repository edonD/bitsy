"""
Pydantic models for the prototype API.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class FeatureContributionResponse(BaseModel):
    """Contribution estimate for a feature in a scenario lift."""

    feature: str
    contribution: float
    percentage: float


class SimulationRequest(BaseModel):
    """Prototype what-if simulation request."""

    brand_id: str = Field(..., description="Brand identifier")
    scenario_name: Optional[str] = Field(
        default=None,
        description="Optional scenario label"
    )
    scenario_features: Dict[str, float] = Field(
        ...,
        description="Only include the features you want to modify"
    )


class SimulationResponse(BaseModel):
    """Prototype what-if simulation response."""

    brand_id: str
    base_case_prediction: float = Field(..., description="Current mention rate %")
    scenario_prediction: float = Field(
        ...,
        description="Predicted mention rate after the scenario"
    )
    predicted_lift: float = Field(..., description="Lift in percentage points")
    lift_percentage: float = Field(..., description="Relative lift %")
    confidence_lower: float = Field(..., description="95% CI lower bound")
    confidence_upper: float = Field(..., description="95% CI upper bound")
    confidence_level: str = Field(..., description="HIGH, MEDIUM, or LOW")
    shap_contributions: List[FeatureContributionResponse] = Field(
        ...,
        description="Feature contribution estimate"
    )
    sensitivity_analysis: Optional[dict] = None


class SensitivityRequest(BaseModel):
    """Sensitivity analysis request."""

    brand_id: str
    base_scenario: Dict[str, float]
    sensitive_features: List[str]
    perturbations: Optional[List[float]] = None


class SensitivityResult(BaseModel):
    feature: str
    perturbations: List[float]
    predictions: List[float]


class SensitivityResponse(BaseModel):
    brand_id: str
    sensitivity_results: List[SensitivityResult]


class BrandCreate(BaseModel):
    name: str
    category: str
    website_url: str


class BrandResponse(BaseModel):
    id: str
    name: str
    category: str
    website_url: str
    current_mention_rate: float
    week_avg_mention_rate: float


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    mode: str
    model_loaded: bool
    note: Optional[str] = None
