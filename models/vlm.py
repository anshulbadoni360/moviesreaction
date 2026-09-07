import os
from pathlib import Path
from typing import List, Literal, Optional, Tuple
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv

    env_path = Path(__file__).parent.parent / ".env"
    if env_path.is_file():
        load_dotenv(dotenv_path=env_path, override=True)
    else:
        load_dotenv(override=True)
except ImportError:
    pass

VLMProviderType = Literal["local", "gemini", "openai", "nvidia", "custom"]


def _get_provider_defaults() -> dict[str, dict[str, Optional[str]]]:
    ollama_base = os.getenv("OLLAMA_API_BASE", "http://192.168.0.201:11434/v1")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen3-vl:2b")
    nvidia_key = os.getenv(
        "NVIDIA_API_KEY",
        "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",
    )
    nvidia_base = os.getenv("NVIDIA_API_BASE", "https://integrate.api.nvidia.com/v1")
    nvidia_model = os.getenv("NVIDIA_MODEL", "nvidia/ising-calibration-1.5-31b")

    return {
        "local": {
            "api_base": ollama_base,
            "model": ollama_model,
            "api_key": None,
        },
        "nvidia": {
            "api_base": nvidia_base,
            "model": nvidia_model,
            "api_key": nvidia_key,
        },
        "gemini": {
            "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/",
            "model": "gemini-1.5-flash",
            "api_key": os.getenv("GEMINI_API_KEY"),
        },
        "openai": {
            "api_base": "https://api.openai.com/v1",
            "model": "gpt-4o-mini",
            "api_key": os.getenv("OPENAI_API_KEY"),
        },
    }


class VLMConfig(BaseModel):
    provider: VLMProviderType = Field(
        default="local", description="VLM backend: 'local', 'nvidia', 'gemini', 'openai'"
    )
    api_base: str = Field(
        default_factory=lambda: os.getenv("OLLAMA_API_BASE", "http://192.168.0.201:11434/v1"),
        description="OpenAI-compatible VLM endpoint",
    )
    model: str = Field(
        default_factory=lambda: os.getenv("OLLAMA_MODEL", "qwen3-vl:2b"),
        description="Model name identifier",
    )
    api_key: Optional[str] = Field(default=None, description="API key for cloud provider")
    hook_times: Tuple[float, ...] = Field(default=(2.0,), description="0-5s hook keyframe timestamp")
    cut_times: Tuple[float, ...] = Field(default=(1.0, 5.0, 10.0, 20.0), description="Default fallback scene timestamps")
    jpeg_quality: int = Field(default=70, ge=1, le=100)
    max_frame_dim: int = Field(default=448, ge=256, le=3840)  # 448px guarantees ultra-fast token generation
    min_fps: float = Field(default=1.0)
    timeout: float = Field(default=90.0, ge=5.0, le=300.0)
    max_retries: int = Field(default=2, ge=1, le=5)
    max_concurrent: int = Field(default=1, ge=1, le=20)

    @classmethod
    def create(
        cls,
        provider: VLMProviderType = "local",
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        api_base: Optional[str] = None,
    ) -> "VLMConfig":
        defaults = _get_provider_defaults()
        cfg = defaults.get(provider, defaults["local"])

        resolved_key = api_key or cfg.get("api_key") or None
        resolved_base = api_base or cfg["api_base"]
        resolved_model = model or cfg["model"]

        return cls(
            provider=provider,
            api_base=str(resolved_base),
            model=str(resolved_model),
            api_key=resolved_key,
        )


class HookFeatures(BaseModel):
    opens_with: str = Field(default="action", description="Primary visual opening element")
    brand_or_title_shown: bool = Field(default=False, description="Whether brand/title is shown in 0-5s")
    attention_grab: str = Field(default="high", description="Attention grabbing strength")
    pace: str = Field(default="fast", description="Opening pacing")


class SceneFeatures(BaseModel):
    scene_idx: int = Field(default=0, description="Sequential index of the scene")
    timestamp_s: float = Field(default=0.0, description="Timestamp of the keyframe in seconds")
    description: str = Field(default="", description="Visual summary of the scene")
    setting: str = Field(default="indoor", description="Environment/setting")
    scene_type: str = Field(default="other", description="Category of scene")
    people_count: int = Field(default=0, description="Estimated number of visible people")
    has_face_closeup: bool = Field(default=False, description="Presence of close-up human face")
    has_brand_or_logo: bool = Field(default=False, description="Presence of on-screen brand/logo/title")
    emotional_tone: str = Field(default="neutral", description="Dominant emotion")
    action_level: str = Field(default="medium", description="Physical action intensity")
    is_title_or_end_card: bool = Field(default=False, description="Whether this frame is a title or billing card")


class VideoVLMResult(BaseModel):
    n_scenes: int = Field(default=0, description="Total number of analyzed scenes")
    dominant_tone: str = Field(default="neutral", description="Most frequent emotional tone")
    dominant_setting: str = Field(default="indoor", description="Most frequent visual setting")
    brand_share: float = Field(default=0.0, description="Fraction of scenes displaying brand or logo")
    closeup_share: float = Field(default=0.0, description="Fraction of scenes featuring face closeups")
    action_high_share: float = Field(default=0.0, description="Fraction of scenes with high action level")
    dialogue_share: float = Field(default=0.0, description="Fraction of scenes focused on dialogue")
    has_title_card: bool = Field(default=False, description="Whether any title card was detected")
    first_title_card_s: Optional[float] = Field(default=None, description="Timestamp when title card first appears")
    hook: HookFeatures = Field(default_factory=HookFeatures, description="Hook semantic analysis")
    scenes: List[SceneFeatures] = Field(default_factory=list, description="Per-scene visual breakdown")
