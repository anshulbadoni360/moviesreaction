from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class MultimodalFeatures(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    # Campaign Metadata
    genre: str = "Action"
    studio: str = "NA"
    platform: str = "NA"
    ad_type: str = "NA"
    cohort: str = "NA"
    franchise_vs_original: str = "NA"
    country: str = "NA"

    # CV Features
    duration_s: float = Field(default=60.0, ge=0.0)
    hook_motion: float = Field(default=10.0, ge=0.0)
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

    # Audio Features
    speech_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    words_per_sec: float = Field(default=0.0, ge=0.0)
    word_count: int = Field(default=0, ge=0)
    has_dialogue: bool = False

    # VLM Features
    n_scenes: int = Field(default=0, ge=0)
    brand_share: float = Field(default=0.0, ge=0.0, le=1.0)
    closeup_share: float = Field(default=0.0, ge=0.0, le=1.0)
    action_high_share: float = Field(default=0.0, ge=0.0, le=1.0)
    dialogue_share: float = Field(default=0.0, ge=0.0, le=1.0)
    has_title_card: bool = False
    hook_opens_with: str = "action"
    hook_attention: Literal["low", "medium", "high"] = "high"
    hook_pace: Literal["slow", "medium", "fast"] = "fast"
    dominant_tone: str = "neutral"
    dominant_setting: str = "indoor"
    hook_brand_shown: bool = False

    @classmethod
    def from_extractors(
        cls,
        meta: Any,
        cv: Any,
        audio: Any,
        vlm: Any,
    ) -> MultimodalFeatures:
        hook_obj = getattr(vlm, "hook", None) if vlm else None

        raw_attention = str(getattr(hook_obj, "attention_grab", "high")).lower()
        attention: Literal["low", "medium", "high"] = (
            raw_attention if raw_attention in ("low", "medium", "high") else "high"
        )

        raw_pace = str(getattr(hook_obj, "pace", "fast")).lower()
        pace: Literal["slow", "medium", "fast"] = (
            raw_pace if raw_pace in ("slow", "medium", "fast") else "fast"
        )

        return cls(
            # Metadata
            genre=str(getattr(meta, "genre", "Action")),
            studio=str(getattr(meta, "studio", "NA")),
            platform=str(getattr(meta, "platform", "NA")),
            ad_type=str(getattr(meta, "ad_type", "NA")),
            cohort=str(getattr(meta, "cohort", "Total")),
            franchise_vs_original=str(getattr(meta, "franchise_vs_original", "Franchise")),
            country=str(getattr(meta, "country", "US")),
            # CV
            duration_s=float(getattr(cv, "duration_s", 60.0)),
            hook_motion=float(getattr(cv, "hook_motion", 10.0)),
            hook_cuts=int(getattr(cv, "hook_cuts", 0)),
            hook_bright_mean=float(getattr(cv, "hook_bright_mean", 128.0)),
            hook_face_frac=float(getattr(cv, "hook_face_frac", 0.0)),
            motion_mean=float(getattr(cv, "motion_mean", 0.0)),
            motion_std=float(getattr(cv, "motion_std", 0.0)),
            cuts=int(getattr(cv, "cuts", 0)),
            cuts_per_s=float(getattr(cv, "cuts_per_s", 0.0)),
            shot_len_mean=float(getattr(cv, "shot_len_mean", 0.0)),
            bright_mean=float(getattr(cv, "bright_mean", 128.0)),
            contrast_mean=float(getattr(cv, "contrast_mean", 0.0)),
            sat_mean=float(getattr(cv, "sat_mean", 0.0)),
            face_frac=float(getattr(cv, "face_frac", 0.0)),
            face_area_max=float(getattr(cv, "face_area_max", 0.0)),
            # Audio
            speech_ratio=float(getattr(audio, "speech_ratio", 0.0)),
            words_per_sec=float(getattr(audio, "words_per_sec", 0.0)),
            word_count=int(getattr(audio, "word_count", 0)),
            has_dialogue=bool(getattr(audio, "has_dialogue", False)),
            # VLM
            n_scenes=int(getattr(vlm, "n_scenes", 0)),
            brand_share=float(getattr(vlm, "brand_share", 0.0)),
            closeup_share=float(getattr(vlm, "closeup_share", 0.0)),
            action_high_share=float(getattr(vlm, "action_high_share", 0.0)),
            dialogue_share=float(getattr(vlm, "dialogue_share", 0.0)),
            has_title_card=bool(getattr(vlm, "has_title_card", False)),
            hook_opens_with=str(getattr(hook_obj, "opens_with", "action")),
            hook_attention=attention,
            hook_pace=pace,
            dominant_tone=str(getattr(vlm, "dominant_tone", "neutral")),
            dominant_setting=str(getattr(vlm, "dominant_setting", "indoor")),
            hook_brand_shown=bool(getattr(hook_obj, "brand_or_title_shown", False)),
        )


class KPIScoreResult(BaseModel):
    score: float = Field(ge=0.0)
    interval: tuple[float, float]
    genre_norm: float = Field(ge=0.0)
    trend: Literal["above", "below", "in-line"]


class PredictionBundle(BaseModel):
    results: dict[str, KPIScoreResult]
