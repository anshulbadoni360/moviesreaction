from pydantic import BaseModel, ConfigDict, Field


class CVFeatures(BaseModel):
    model_config = ConfigDict(frozen=True)

    duration_s: float = Field(default=0.0, ge=0.0)
    hook_motion: float = Field(default=0.0, ge=0.0)
    hook_cuts: int = Field(default=0, ge=0)
    hook_bright_mean: float = Field(default=128.0, ge=0.0, le=255.0)
    hook_face_frac: float = Field(default=0.0, ge=0.0, le=1.0)
    motion_mean: float = Field(default=0.0, ge=0.0)
    motion_std: float = Field(default=0.0, ge=0.0)
    cuts: int = Field(default=0, ge=0)
    cuts_per_s: float = Field(default=0.0, ge=0.0)
    shot_len_mean: float = Field(default=0.0, ge=0.0)
    bright_mean: float = Field(default=128.0, ge=0.0, le=255.0)
    contrast_mean: float = Field(default=0.0, ge=0.0)
    sat_mean: float = Field(default=0.0, ge=0.0, le=255.0)
    face_frac: float = Field(default=0.0, ge=0.0, le=1.0)
    face_area_max: float = Field(default=0.0, ge=0.0, le=1.0)


class CVResult(BaseModel):
    features: CVFeatures = Field(default_factory=CVFeatures)
    keyframe_paths: list[str] = Field(default_factory=list)
    scene_cuts: list[float] = Field(default_factory=list)
