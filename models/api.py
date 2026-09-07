from typing import Optional
from pydantic import BaseModel, Field

from models.pipeline import CampaignMetadata
from models.vlm import VLMProviderType


class VideoAnalysisRequest(BaseModel):
    video_path: str = Field(..., description="Path to target video file")
    metadata: Optional[CampaignMetadata] = Field(
        default=None, description="Optional user-provided campaign targeting metadata"
    )
    vlm_provider: VLMProviderType = Field(
        default="local", description="VLM backend: 'local' (Ollama PC) or 'gemini'/'openai' (Cloud)"
    )
    vlm_model: Optional[str] = Field(
        default=None, description="Optional override for VLM model name"
    )


class VLMAnalysisRequest(BaseModel):
    video_path: str = Field(..., description="Path to video file")
    vlm_provider: VLMProviderType = Field(
        default="local", description="VLM backend: 'local' (Ollama PC) or 'gemini'/'openai' (Cloud)"
    )
    vlm_model: Optional[str] = Field(
        default=None, description="Optional override for model name"
    )
