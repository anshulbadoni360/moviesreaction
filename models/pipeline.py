from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from models.audio import AudioFeatures
from models.cv import CVResult
from models.ml import KPIScoreResult, MultimodalFeatures
from models.vlm import SceneFeatures, VideoVLMResult


class CampaignMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")

    movie_title: str = Field(default="Untitled Creative", description="Movie or creative ad title")
    genre: str = Field(default="Action", description="Primary genre classification")
    studio: str = Field(default="Independent / Other", description="Studio or brand name")
    platform: str = Field(default="YouTube", description="Target distribution platform")
    ad_type: str = Field(default="Teaser", description="Creative format (Trailer, Teaser, Spot)")
    franchise_vs_original: Literal["Franchise", "Original"] = Field(
        default="Original", description="Franchise sequel/spinoff or original IP"
    )
    cohort: str = Field(default="Total", description="Target audience demographic")
    country: str = Field(default="US", description="Target geographic market")
    sample_type: str = Field(default="General", description="Audience sampling type")
    sample_age: str = Field(default="18-34", description="Audience age range")


class EditorialRecommendation(BaseModel):
    model_config = ConfigDict(frozen=True)

    type: Literal["success", "warning", "info"] = Field(..., description="Alert classification")
    area: str = Field(..., description="Editorial domain (Hook, Dialogue, Branding, Urgency)")
    message: str = Field(..., description="Actionable editorial prescription")


class PipelineResult(BaseModel):
    video_path: str = Field(..., description="Path to analyzed video file")
    metadata: CampaignMetadata = Field(..., description="Resolved campaign targeting metadata")
    predictions: dict[str, KPIScoreResult] = Field(..., description="13-KPI audience benchmark predictions")
    recommendations: List[EditorialRecommendation] = Field(
        default_factory=list, description="Actionable creative editorial recommendations"
    )
    scenes: List[SceneFeatures] = Field(default_factory=list, description="Per-scene semantic breakdown")
    extracted_features: MultimodalFeatures = Field(..., description="Unified feature row used for predictions")
    keyframes: List[str] = Field(default_factory=list, description="Extracted keyframe file paths")
