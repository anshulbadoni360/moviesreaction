from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional, Sequence

import cv2
import numpy as np

from models.cv import CVFeatures, CVResult
from services.exceptions import MediaEncodingError, VideoReadError

try:
    from scenedetect import ContentDetector, detect

    HAVE_SCENEDETECT = True
except ImportError:
    HAVE_SCENEDETECT = False

logger = logging.getLogger(__name__)

HOOK_LIMIT_SEC = 5.0
DEFAULT_KEYFRAME_OFFSETS = (0.5, 2.5, 5.0)


def _safe_stats(
    data: Sequence[float],
    stat_type: str = "mean",
    default: float = 0.0,
    precision: int = 2,
) -> float:
    if not data:
        return default
    val = np.std(data) if stat_type == "std" else np.mean(data)
    return round(float(val), precision)


def _get_face_cascade() -> Optional[object]:
    if not hasattr(cv2, "CascadeClassifier"):
        logger.info("cv2.CascadeClassifier is not present in this OpenCV build; facial telemetry will default safely.")
        return None

    candidates = [
        Path(getattr(cv2.data, "haarcascades", "")) / "haarcascade_frontalface_default.xml",
        Path(__file__).parent.parent / "data" / "haarcascade_frontalface_default.xml",
        Path("data/haarcascade_frontalface_default.xml"),
        Path("../data/haarcascade_frontalface_default.xml"),
    ]
    for p in candidates:
        if p.is_file():
            try:
                cascade = cv2.CascadeClassifier(str(p))
                if not cascade.empty():
                    return cascade
            except Exception:
                pass

    logger.warning("Haar Cascade face XML not found; facial telemetry will default safely.")
    return None


def _detect_scene_cuts(video_path: Path) -> list[float]:
    if not HAVE_SCENEDETECT:
        logger.warning("PySceneDetect is not installed; bypass cut tracking.")
        return []

    try:
        detected_scenes = detect(str(video_path), ContentDetector())
        return [round(scene[0].get_seconds(), 2) for scene in detected_scenes]
    except Exception as exc:
        logger.error("Failed to run scene cut detection: %s", exc)
        return []


def _extract_keyframes(
    video_path: Path, timestamps: list[float], fps: float, output_dir: Path
) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    paths: list[str] = []

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise VideoReadError(
            f"Failed to open video for keyframe extraction: {video_path}"
        )

    try:
        for idx, ts in enumerate(timestamps, start=1):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(ts * fps))
            ok, frame = cap.read()
            if not ok or frame is None:
                continue

            name = f"scene_{idx:02d}_{ts:.1f}s.jpg"
            dest = output_dir / name

            if not cv2.imwrite(str(dest), frame):
                raise MediaEncodingError(
                    f"Failed to write keyframe image to disk: {dest}"
                )
            paths.append(str(dest))
    finally:
        cap.release()

    return paths


def extract_cv_features(
    video_path: str | Path,
    sample_fps: float = 3.0,
    max_dim: int = 320,
    output_keyframes_dir: str | Path | None = None,
) -> CVResult:
    video_path = Path(video_path)
    if not video_path.is_file():
        raise VideoReadError(f"Media file target does not exist: {video_path}")

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise VideoReadError(f"Failed to initialize video capture: {video_path}")

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    total_frames = float(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0.0)

    if fps <= 0.0 or total_frames <= 0.0:
        cap.release()
        raise VideoReadError(
            f"Invalid duration metrics (FPS={fps}, Frames={total_frames})"
        )

    duration_s = total_frames / fps
    step = max(1, int(round(fps / sample_fps)))
    face_cascade = _get_face_cascade()

    bright, contrast, sat, motion = [], [], [], []
    hook_bright, hook_motion = [], []

    face_hits = 0
    hook_faces = 0
    face_area_max = 0.0

    n_sampled = 0
    n_hook_sampled = 0

    prev_gray: np.ndarray | None = None
    frame_idx = 0

    try:
        while True:
            ok = cap.grab()
            if not ok:
                break

            if frame_idx % step == 0:
                ok, frame = cap.retrieve()
                if not ok or frame is None:
                    frame_idx += 1
                    continue

                ts = frame_idx / fps
                h, w = frame.shape[:2]
                scale = max_dim / max(h, w) if max(h, w) > max_dim else 1.0

                small = (
                    cv2.resize(
                        frame,
                        (int(w * scale), int(h * scale)),
                        interpolation=cv2.INTER_AREA,
                    )
                    if scale < 1.0
                    else frame
                )

                gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
                hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)

                b_mean = float(gray.mean())
                bright.append(b_mean)
                contrast.append(float(gray.std()))
                sat.append(float(hsv[..., 1].mean()))

                mv_delta = None
                if prev_gray is not None:
                    mv_delta = float(
                        np.abs(
                            gray.astype(np.int16) - prev_gray.astype(np.int16)
                        ).mean()
                    )
                    motion.append(mv_delta)
                prev_gray = gray

                has_faces = False
                if face_cascade is not None and hasattr(face_cascade, "detectMultiScale"):
                    faces = face_cascade.detectMultiScale(
                        gray, scaleFactor=1.2, minNeighbors=4, minSize=(24, 24)
                    )
                    has_faces = len(faces) > 0
                    if has_faces:
                        face_hits += 1
                        max_raw_area = max((fw * fh) for (_, _, fw, fh) in faces)
                        area_ratio = max_raw_area / (gray.shape[0] * gray.shape[1])
                        face_area_max = max(face_area_max, area_ratio)

                n_sampled += 1

                if ts <= HOOK_LIMIT_SEC:
                    n_hook_sampled += 1
                    hook_bright.append(b_mean)
                    if mv_delta is not None:
                        hook_motion.append(mv_delta)
                    if has_faces:
                        hook_faces += 1

            frame_idx += 1
    finally:
        cap.release()

    scene_cuts = _detect_scene_cuts(video_path)
    cuts_count = max(0, len(scene_cuts) - 1) if scene_cuts else 0
    hook_cuts = sum(1 for sec in scene_cuts if sec <= HOOK_LIMIT_SEC)

    kf_paths: list[str] = []
    if output_keyframes_dir:
        targets = (
            scene_cuts
            if scene_cuts
            else [o for o in DEFAULT_KEYFRAME_OFFSETS if o < duration_s]
            + [round(duration_s / 2, 1)]
        )
        kf_paths = _extract_keyframes(
            video_path, targets, fps, Path(output_keyframes_dir)
        )

    cuts_per_s = cuts_count / duration_s
    shot_len_mean = duration_s / max(cuts_count + 1, 1)

    features = CVFeatures(
        duration_s=round(duration_s, 2),
        hook_motion=_safe_stats(hook_motion, "mean"),
        hook_cuts=hook_cuts,
        hook_bright_mean=_safe_stats(hook_bright, "mean", default=128.0),
        hook_face_frac=round(hook_faces / max(n_hook_sampled, 1), 3),
        motion_mean=_safe_stats(motion, "mean"),
        motion_std=_safe_stats(motion, "std"),
        cuts=cuts_count,
        cuts_per_s=round(cuts_per_s, 3),
        shot_len_mean=round(shot_len_mean, 2),
        bright_mean=_safe_stats(bright, "mean", default=128.0),
        contrast_mean=_safe_stats(contrast, "mean"),
        sat_mean=_safe_stats(sat, "mean"),
        face_frac=round(face_hits / max(n_sampled, 1), 3),
        face_area_max=round(face_area_max, 3),
    )

    return CVResult(features=features, keyframe_paths=kf_paths, scene_cuts=scene_cuts)
