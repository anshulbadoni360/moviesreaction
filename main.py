import gc
import logging
import os
import shutil
import tempfile
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, File, Form, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from models.api import VideoAnalysisRequest, VLMAnalysisRequest
from models.pipeline import CampaignMetadata, PipelineResult
from models.vlm import VideoVLMResult, VLMConfig, VLMProviderType
from services.benchmark import (
    get_analysis_history,
    get_dataset_benchmarks,
    save_analysis_history,
)
from services.exceptions import (
    MediaEncodingError,
    ModelConnectionError,
    ModelParseError,
    ModelRateLimitError,
    PipelineError,
    VideoReadError,
)
from services.pipeline import MonetPipeline
from services.vlm_extractor import extract_vlm_features

logger = logging.getLogger("monet_pipeline")

KEYFRAMES_DIR = Path(__file__).parent / "data" / "keyframes"
KEYFRAMES_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Monet Labs Video Intelligence Engine...")
    pipeline_service = MonetPipeline()
    app.state.pipeline = pipeline_service
    yield
    logger.info("Executing graceful shutdown: releasing models and resources...")
    app.state.pipeline = None


app = FastAPI(
    title="Monet Labs Video Intelligence API",
    description="Multimodal backend predicting audience response, hooking power, and scene semantics.",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Keyframes Static Directory
app.mount("/keyframes", StaticFiles(directory=str(KEYFRAMES_DIR)), name="keyframes")


@app.exception_handler(PipelineError)
async def pipeline_exception_handler(request: Request, exc: PipelineError):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    if isinstance(exc, VideoReadError):
        status_code = status.HTTP_400_BAD_REQUEST
    elif isinstance(exc, ModelRateLimitError):
        status_code = status.HTTP_429_TOO_MANY_REQUESTS
    elif isinstance(exc, (ModelConnectionError, ModelParseError)):
        status_code = status.HTTP_502_BAD_GATEWAY
    elif isinstance(exc, MediaEncodingError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY

    return JSONResponse(
        status_code=status_code,
        content={
            "error_type": exc.__class__.__name__,
            "error_code": exc.error_code,
            "message": exc.message,
            "is_retryable": exc.is_retryable,
            "details": exc.details,
        },
    )


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "monet-video-pipeline",
    }


@app.get("/api/benchmark/norms", tags=["Benchmark"])
async def get_norms():
    """Retrieve computed real averages & distribution from norms_data.csv"""
    return get_dataset_benchmarks()


@app.get("/api/videos/history", tags=["History"])
async def get_history():
    """Retrieve persisted video analysis history runs"""
    return get_analysis_history()


@app.delete("/api/videos/{video_id}", tags=["History"])
async def delete_video(video_id: str):
    """Delete a single analyzed video report from history"""
    from services.benchmark import delete_analysis_history
    success = delete_analysis_history(video_id)
    if not success:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"success": False, "message": f"Video report {video_id} not found"},
        )
    return {"success": True, "message": f"Video report {video_id} deleted successfully"}


@app.post(
    "/video/analyze",
    response_model=PipelineResult,
    tags=["Pipeline"],
)
async def analyze_video_upload(
    raw_req: Request,
    file: UploadFile = File(..., description="Target creative video file"),
    title: str = Form(default="Untitled Creative"),
    genre: str = Form(default="Action"),
    studio: str = Form(default="Independent / Other"),
    platform: str = Form(default="YouTube"),
    ad_type: str = Form(default="Teaser"),
    franchise_vs_original: Literal["Franchise", "Original"] = Form(default="Original"),
    cohort: str = Form(default="Total"),
    country: str = Form(default="US"),
    vlm_provider: VLMProviderType = Form(default="local"),
    vlm_model: Optional[str] = Form(default=None),
):
    pipeline: MonetPipeline = raw_req.app.state.pipeline
    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"

    temp_dir = Path(tempfile.mkdtemp(prefix="monet_upload_"))
    tmp_path = temp_dir / f"input{suffix}"

    with open(tmp_path, "wb") as f_dest:
        shutil.copyfileobj(file.file, f_dest)

    video_id = str(uuid.uuid4())[:8]
    video_kf_dir = KEYFRAMES_DIR / video_id
    video_kf_dir.mkdir(parents=True, exist_ok=True)

    try:
        metadata = CampaignMetadata(
            movie_title=title,
            genre=genre,
            studio=studio,
            platform=platform,
            ad_type=ad_type,
            franchise_vs_original=franchise_vs_original,
            cohort=cohort,
            country=country,
        )
        custom_vlm_cfg = VLMConfig.create(
            provider=vlm_provider,
            model=vlm_model,
        )
        result = await pipeline.analyze_video(
            video_path=tmp_path,
            metadata=metadata,
            output_keyframes_dir=video_kf_dir,
            vlm_config=custom_vlm_cfg,
        )

        # Save to real analysis history log
        history_item = {
            "id": video_id,
            "title": title,
            "campaign": f"Campaign • {platform}",
            "status": "Completed",
            "overallScore": int(round(result.predictions.get("BREAKTHROUGH_OLD", result.predictions.get("HookingPower")).score)),
            "percentileRank": "Top 15%" if result.predictions.get("BREAKTHROUGH_OLD", result.predictions.get("HookingPower")).score >= 65 else "Top 35%",
            "uploadedAt": datetime.now().strftime("%b %d, %Y • %I:%M %p"),
            "duration": f"{int(result.extracted_features.duration_s // 60):02d}:{int(result.extracted_features.duration_s % 60):02d}",
            "topStrength": "Breakthrough" if result.predictions.get("BREAKTHROUGH_OLD").score >= result.predictions.get("HookingPower").score else "Hooking Power",
            "topOpportunity": "Opening Hook" if result.predictions.get("HookingPower").score < result.predictions.get("HookingPower").genre_norm else "Platform Linkage",
            "thumbnailUrl": f"/keyframes/{video_id}/scene_01_0.0s.jpg" if (video_kf_dir / "scene_01_0.0s.jpg").exists() else "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=60",
            "keyframes": [f"/keyframes/{video_id}/{f.name}" for f in video_kf_dir.glob("*.jpg")],
            "details": result.model_dump(),
        }
        save_analysis_history(history_item)

        return result
    finally:
        try:
            file.file.close()
        except Exception:
            pass

        gc.collect()

        try:
            if temp_dir.is_dir():
                shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception as exc:
            logger.warning("Failed to clean up upload temp folder %s: %s", temp_dir, exc)
