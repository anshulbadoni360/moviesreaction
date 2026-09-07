from pydantic import BaseModel, ConfigDict, Field


class AudioSegment(BaseModel):
    model_config = ConfigDict(frozen=True)

    start: float = Field(ge=0.0)
    end: float = Field(ge=0.0)
    text: str = ""


class AudioFeatures(BaseModel):
    has_dialogue: bool = False
    word_count: int = Field(default=0, ge=0)
    speech_dur_s: float = Field(default=0.0, ge=0.0)
    speech_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    words_per_sec: float = Field(default=0.0, ge=0.0)
    language: str = "en"
    full_text: str = ""
    segments: list[AudioSegment] = Field(default_factory=list)
