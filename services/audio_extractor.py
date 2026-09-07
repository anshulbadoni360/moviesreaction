from __future__ import annotations

import logging
import threading
from functools import lru_cache
from pathlib import Path

from models.audio import AudioFeatures, AudioSegment
from services.exceptions import VideoReadError

try:
    from faster_whisper import WhisperModel

    HAVE_WHISPER = True
except ImportError:
    HAVE_WHISPER = False

logger = logging.getLogger(__name__)

_MODEL_LOCK = threading.Lock()


@lru_cache(maxsize=4)
def _get_whisper_model(size: str, device: str, compute_type: str) -> WhisperModel:
    """Thread-safe cached loader for faster-whisper instances."""
    if not HAVE_WHISPER:
        logger.warning("faster-whisper is not installed; dialogue features will default safely.")
        return None
    with _MODEL_LOCK:
        try:
            return WhisperModel(size, device=device, compute_type=compute_type)
        except Exception as exc:
            logger.warning(f"Failed to initialize Whisper model '{size}' on {device}: {exc}")
            return None


def _merge_speech_intervals(segments: list[AudioSegment]) -> float:
    """Compute non-overlapping speech duration to prevent speech ratios > 1.0."""
    if not segments:
        return 0.0

    sorted_intervals = sorted([(s.start, s.end) for s in segments], key=lambda x: x[0])
    merged: list[tuple[float, float]] = [sorted_intervals[0]]

    for start, end in sorted_intervals[1:]:
        prev_start, prev_end = merged[-1]
        if start <= prev_end:
            merged[-1] = (prev_start, max(prev_end, end))
        else:
            merged.append((start, end))

    return sum(end - start for start, end in merged)


def extract_audio_features(
    video_path: str | Path,
    total_duration_s: float = 0.0,
    whisper_size: str = "base",
    device: str = "cpu",
    compute_type: str = "int8",
) -> AudioFeatures:
    """
    Transcribe dialogue and extract speech pacing metrics from media.
    Gracefully falls back to default AudioFeatures if no audio track exists or if decoding fails.
    """
    video_path = Path(video_path)
    if not video_path.is_file():
        raise VideoReadError(f"Media file target does not exist: {video_path}")

    model = _get_whisper_model(whisper_size, device, compute_type)
    if model is None:
        return AudioFeatures()

    segments: list[AudioSegment] = []
    lang = "unknown"

    try:
        # First attempt with vad_filter
        segments_gen, info = model.transcribe(
            str(video_path),
            vad_filter=True,
            beam_size=1,
        )
        if info and hasattr(info, "language") and info.language:
            lang = info.language

        for s in segments_gen:
            if s.text and s.text.strip():
                segments.append(
                    AudioSegment(
                        start=round(s.start, 2),
                        end=round(s.end, 2),
                        text=s.text.strip(),
                    )
                )
    except Exception as exc:
        logger.warning(
            "Primary whisper transcription encountered (%s): %s; trying without VAD filter...",
            type(exc).__name__,
            exc,
        )
        try:
            segments_gen, info = model.transcribe(
                str(video_path),
                vad_filter=False,
                beam_size=1,
            )
            if info and hasattr(info, "language") and info.language:
                lang = info.language

            for s in segments_gen:
                if s.text and s.text.strip():
                    segments.append(
                        AudioSegment(
                            start=round(s.start, 2),
                            end=round(s.end, 2),
                            text=s.text.strip(),
                        )
                    )
        except Exception as fallback_exc:
            logger.warning(
                "Audio transcription bypassed for %s (%s): %s. (Video may be silent or audio track missing).",
                video_path.name,
                type(fallback_exc).__name__,
                fallback_exc,
            )
            return AudioFeatures(
                has_dialogue=False,
                word_count=0,
                speech_dur_s=0.0,
                speech_ratio=0.0,
                words_per_sec=0.0,
                language="none",
                full_text="",
                segments=[],
            )

    full_text = " ".join(s.text for s in segments).strip()
    word_count = len(full_text.split())
    speech_dur_s = _merge_speech_intervals(segments)

    effective_duration = (
        total_duration_s
        if total_duration_s > 0
        else (segments[-1].end if segments else 0.0)
    )

    speech_ratio = (
        min(1.0, speech_dur_s / effective_duration) if effective_duration > 0 else 0.0
    )

    words_per_sec = round(word_count / speech_dur_s, 2) if speech_dur_s > 0 else 0.0

    return AudioFeatures(
        has_dialogue=word_count > 0,
        word_count=word_count,
        speech_dur_s=round(speech_dur_s, 2),
        speech_ratio=round(speech_ratio, 3),
        words_per_sec=words_per_sec,
        language=lang,
        full_text=full_text,
        segments=segments,
    )
