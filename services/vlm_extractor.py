from __future__ import annotations

import asyncio
import base64
import logging
from collections import Counter
from contextlib import contextmanager
from pathlib import Path
from typing import Callable, List, Optional, Tuple

import cv2
import httpx
import numpy as np

from models.vlm import HookFeatures, SceneFeatures, VideoVLMResult, VLMConfig
from services.exceptions import (
    MediaEncodingError,
    ModelConnectionError,
    ModelParseError,
    ModelRateLimitError,
    VideoReadError,
)
from util.helper import safe_json_parse, to_bool

logger = logging.getLogger(__name__)

DEFAULT_VLM_CONFIG = VLMConfig()
MAX_VLM_SCENE_SAMPLES = 4  # 4 representative scenes across video duration

SYSTEM_PROMPT = (
    "You are a media research analyst examining advertising and movie-trailer "
    "frames. Respond ONLY with a single minified JSON object and no other text."
)

SCENE_PROMPT = (
    "This is a keyframe from one scene of an ad/trailer. Return JSON with: "
    "description (one sentence), setting (indoor/outdoor/urban/nature/studio/abstract), "
    "scene_type (action/dialogue/product_shot/logo_card/establishing/montage/crowd/other), "
    "people_count (int), has_face_closeup (bool), has_brand_or_logo (bool), "
    "emotional_tone (exciting/tense/happy/somber/neutral/scary/funny/romantic/other), "
    "action_level (low/medium/high), is_title_or_end_card (bool)."
)

HOOK_PROMPT = (
    "This frame represents the opening hook of a video ad. "
    "Return JSON with: opens_with (action/face/product/logo/text/dialogue/scenery), "
    "brand_or_title_shown (bool), attention_grab (low/medium/high), pace (slow/medium/fast)."
)


def _share(scenes: List[SceneFeatures], predicate: Callable[[SceneFeatures], bool]) -> float:
    n = len(scenes)
    return round(sum(1 for s in scenes if predicate(s)) / max(n, 1), 3)


@contextmanager
def _open_video(path: Path):
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise VideoReadError(
            f"Cannot open video source: {path}", details={"path": str(path)}
        )
    try:
        yield cap
    finally:
        cap.release()


def _encode_frame(frame: np.ndarray, config: VLMConfig) -> bytes:
    h, w = frame.shape[:2]
    max_dim = getattr(config, "max_frame_dim", 448)
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

    quality = getattr(config, "jpeg_quality", 70)
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        raise MediaEncodingError("JPEG encoding failed for video frame")
    return buf.tobytes()


def _sample_frame(cap: cv2.VideoCapture, time_s: float, fps: float, config: VLMConfig) -> Optional[bytes]:
    try:
        ts = float(time_s)
    except Exception:
        return None
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(ts * fps))
    ok, frame = cap.read()
    return _encode_frame(frame, config) if ok and frame is not None else None


def _extract_frames(
    video_path: Path,
    scene_cuts: Optional[List[float]],
    config: VLMConfig,
) -> Tuple[List[bytes], List[Tuple[float, bytes]]]:
    if not video_path.is_file():
        raise VideoReadError(
            f"Video file not found: {video_path}", details={"path": str(video_path)}
        )

    with _open_video(video_path) as cap:
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        if fps < config.min_fps:
            raise VideoReadError(f"Invalid frame rate ({fps} FPS): {video_path}")

        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total < 1:
            raise VideoReadError(f"Video contains 0 frames: {video_path}")

        duration = total / fps
        hook_times = [t for t in config.hook_times if t < duration]
        all_cuts = scene_cuts or [t for t in config.cut_times if t < duration]

        if len(all_cuts) > MAX_VLM_SCENE_SAMPLES:
            indices = np.linspace(0, len(all_cuts) - 1, MAX_VLM_SCENE_SAMPLES, dtype=int)
            cut_times = [all_cuts[i] for i in indices]
        else:
            cut_times = all_cuts

        hook_frames: List[bytes] = []
        for t in hook_times:
            fb = _sample_frame(cap, t, fps, config)
            if fb is not None:
                hook_frames.append(fb)

        scene_frames: List[Tuple[float, bytes]] = []
        for t in cut_times:
            fb = _sample_frame(cap, t, fps, config)
            if fb is not None:
                scene_frames.append((t, fb))

    if not scene_frames:
        raise VideoReadError(f"No decodable keyframes in: {video_path}")

    return hook_frames, scene_frames


def _build_vlm_payload(prompt: str, images: List[bytes]) -> dict[str, object]:
    content: List[dict[str, object]] = [{"type": "text", "text": prompt}]
    for jpg in images:
        b64 = base64.b64encode(jpg).decode("ascii")
        content.append(
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
        )
    return {
        "model": "",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        "max_tokens": 1024,
        "temperature": 0.1,
    }


async def _call_vlm(
    client: httpx.AsyncClient,
    url: str,
    model: str,
    prompt: str,
    images: List[bytes],
    semaphore: asyncio.Semaphore,
    max_retries: int = 2,
) -> dict[str, object]:
    payload = _build_vlm_payload(prompt, images)
    payload["model"] = model
    last_exc: Optional[Exception] = None

    async with semaphore:
        for attempt in range(1, max_retries + 1):
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 429:
                    raise ModelRateLimitError(
                        "Rate limited by VLM provider",
                        details={"status_code": 429, "url": url},
                    )
                resp.raise_for_status()
                data: object = resp.json()
                if isinstance(data, dict) and "choices" in data:
                    choices = data["choices"]
                    if isinstance(choices, list) and choices:
                        first_choice = choices[0]
                        if isinstance(first_choice, dict) and "message" in first_choice:
                            msg = first_choice["message"]
                            if isinstance(msg, dict) and "content" in msg:
                                raw_text = str(msg["content"])
                                return safe_json_parse(raw_text)
                raise ModelParseError(f"Invalid response format from VLM: {resp.text[:200]}")
            except (ModelParseError, ModelRateLimitError):
                raise
            except Exception as exc:
                last_exc = exc
                logger.warning(
                    "VLM attempt %d/%d failed (%s): %s",
                    attempt,
                    max_retries,
                    type(exc).__name__,
                    exc,
                )
                await asyncio.sleep(1.0)

    raise ModelConnectionError(
        f"VLM request failed: {last_exc}",
        details={"url": url, "model": model},
    ) from last_exc


def _parse_scene(raw: dict[str, object], idx: int, ts: float) -> SceneFeatures:
    return SceneFeatures(
        scene_idx=idx,
        timestamp_s=ts,
        description=str(raw.get("description", "")),
        setting=str(raw.get("setting", "indoor")),
        scene_type=str(raw.get("scene_type", "other")),
        people_count=int(str(raw.get("people_count", "0")) if str(raw.get("people_count", "0")).isdigit() else 0),
        has_face_closeup=to_bool(raw.get("has_face_closeup")),
        has_brand_or_logo=to_bool(raw.get("has_brand_or_logo")),
        emotional_tone=str(raw.get("emotional_tone", "neutral")),
        action_level=str(raw.get("action_level", "medium")),
        is_title_or_end_card=to_bool(raw.get("is_title_or_end_card")),
    )


def _aggregate(hook_raw: dict[str, object], scenes: List[SceneFeatures]) -> VideoVLMResult:
    tones = Counter(s.emotional_tone for s in scenes if s.emotional_tone)
    settings = Counter(s.setting for s in scenes if s.setting)
    title_cards = [s for s in scenes if s.is_title_or_end_card]

    return VideoVLMResult(
        n_scenes=len(scenes),
        dominant_tone=tones.most_common(1)[0][0] if tones else "neutral",
        dominant_setting=settings.most_common(1)[0][0] if settings else "indoor",
        brand_share=_share(scenes, lambda s: s.has_brand_or_logo),
        closeup_share=_share(scenes, lambda s: s.has_face_closeup),
        action_high_share=_share(scenes, lambda s: s.action_level == "high"),
        dialogue_share=_share(scenes, lambda s: s.scene_type == "dialogue"),
        has_title_card=bool(title_cards),
        first_title_card_s=min((s.timestamp_s for s in title_cards), default=None),
        hook=HookFeatures(
            opens_with=str(hook_raw.get("opens_with", "action")),
            brand_or_title_shown=to_bool(hook_raw.get("brand_or_title_shown")),
            attention_grab=str(hook_raw.get("attention_grab", "high")),
            pace=str(hook_raw.get("pace", "fast")),
        ),
        scenes=scenes,
    )


async def _run_vlm_queries(
    active_cfg: VLMConfig,
    hook_frames: List[bytes],
    scene_frames: List[Tuple[float, bytes]],
) -> Tuple[dict[str, object], List[dict[str, object]]]:
    url = f"{active_cfg.api_base.rstrip('/')}/chat/completions"
    headers = {"Accept": "application/json"}
    if active_cfg.api_key:
        headers["Authorization"] = f"Bearer {active_cfg.api_key}"

    semaphore = asyncio.Semaphore(1)
    timeout_config = httpx.Timeout(timeout=active_cfg.timeout, connect=15.0, read=active_cfg.timeout, write=20.0)

    async with httpx.AsyncClient(headers=headers, timeout=timeout_config) as client:
        # 1. Opening Hook Prompt
        hook_raw: dict[str, object] = {}
        if hook_frames:
            hook_raw = await _call_vlm(
                client, url, active_cfg.model, HOOK_PROMPT, hook_frames, semaphore, max_retries=active_cfg.max_retries
            )

        # 2. Scene Keyframe Prompts (Sequential)
        scene_raws: List[dict[str, object]] = []
        for _, img in scene_frames:
            s_raw = await _call_vlm(
                client, url, active_cfg.model, SCENE_PROMPT, [img], semaphore, max_retries=active_cfg.max_retries
            )
            scene_raws.append(s_raw)

    return hook_raw, scene_raws


async def extract_vlm_features(
    video_path: str | Path,
    scene_cuts: Optional[List[float]] = None,
    config: Optional[VLMConfig] = None,
) -> VideoVLMResult:
    cfg = config or DEFAULT_VLM_CONFIG
    hook_frames, scene_frames = _extract_frames(Path(video_path), scene_cuts, cfg)

    hook_raw: dict[str, object] = {}
    scene_raws: List[dict[str, object]] = []

    try:
        hook_raw, scene_raws = await _run_vlm_queries(cfg, hook_frames, scene_frames)
    except Exception as primary_exc:
        # Automatic Failover to NVIDIA NIM Cloud if Local Ollama is offline or fails
        if cfg.provider == "local":
            logger.warning(
                "Local Ollama GPU server unreachable or timed out (%s: %s). Seamlessly falling back to NVIDIA NIM Cloud AI...",
                type(primary_exc).__name__,
                primary_exc,
            )
            try:
                nvidia_cfg = VLMConfig.create(provider="nvidia")
                hook_raw, scene_raws = await _run_vlm_queries(nvidia_cfg, hook_frames, scene_frames)
                logger.info("NVIDIA NIM Cloud AI successfully processed all visual keyframes!")
            except Exception as nvidia_exc:
                logger.warning(
                    "NVIDIA NIM Cloud fallback also encountered error (%s: %s); using safe heuristic defaults.",
                    type(nvidia_exc).__name__,
                    nvidia_exc,
                )
                hook_raw = {}
                scene_raws = [{} for _ in scene_frames]
        else:
            logger.warning("VLM analysis encountered error (%s); using safe defaults.", primary_exc)
            hook_raw = {}
            scene_raws = [{} for _ in scene_frames]

    # Fill any missing scene records
    while len(scene_raws) < len(scene_frames):
        scene_raws.append({})

    scenes = [
        _parse_scene(raw, idx, ts)
        for idx, ((ts, _), raw) in enumerate(zip(scene_frames, scene_raws), start=1)
    ]

    return _aggregate(hook_raw, scenes)


def extract_vlm_features_sync(
    video_path: str | Path,
    scene_cuts: Optional[List[float]] = None,
    config: Optional[VLMConfig] = None,
) -> VideoVLMResult:
    return asyncio.run(extract_vlm_features(video_path, scene_cuts, config))
