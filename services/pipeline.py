from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, List, Optional, Union

from models.pipeline import (
    CampaignMetadata,
    EditorialRecommendation,
    MultimodalFeatures,
    PipelineResult,
)
from models.vlm import VLMConfig
from services.audio_extractor import extract_audio_features
from services.cv_extractor import extract_cv_features
from services.exceptions import VideoReadError
from services.ml_engine import MonetKPIPredictor
from services.vlm_extractor import extract_vlm_features

logger = logging.getLogger(__name__)

# KPI user-friendly names and actionable editorial advice
KPI_PRESCRIPTION_GUIDE = {
    "BREAKTHROUGH_OLD": {
        "label": "Breakthrough & Memorability",
        "strength": "Visual spectacle and distinctive branding create massive audience retention and recall.",
        "fix": "Creative lacks distinctive visual signatures. Introduce a high-contrast hero motif or iconic sound effect to stick in memory.",
    },
    "ACTION": {
        "label": "Action & Visual Intensity",
        "strength": "High-octane visual motion and rapid cutting drive strong audience pulse and engagement.",
        "fix": "Pacing feels flat or static. Elevate shot tempo and introduce kinetic camera moves in the mid-trailer crescendo.",
    },
    "UnaidedRecall": {
        "label": "Unaided Brand & Title Recall",
        "strength": "Audience clearly connects the story and visuals directly to the movie title.",
        "fix": "Title is easily forgotten. Display the title card for at least 2.5 seconds and have a character voice the title aloud.",
    },
    "AidedRecall": {
        "label": "Aided Recognition",
        "strength": "High brand and IP familiarity across general demographics.",
        "fix": "Low recognition. Connect the teaser more explicitly to recognizable franchise lore, actors, or signature characters.",
    },
    "Interest": {
        "label": "Audience Interest & Curiosity",
        "strength": "Narrative premise sparks deep intrigue and desire to discover the plot.",
        "fix": "Premise feels generic or unclear. Clarify the central conflict or stakes earlier in the trailer.",
    },
    "Interest_T2B": {
        "label": "High-Intent Interest (Top-2-Box)",
        "strength": "Significant portion of viewers rate this in their top-tier must-watch list.",
        "fix": "Fails to convert casual interest into must-watch urgency. Add a surprising plot twist or cliffhanger in the final 10 seconds.",
    },
    "BuyTicket": {
        "label": "Ticket Conversion & Purchase Intent",
        "strength": "Compelling call-to-action drives immediate box office and streaming conversion.",
        "fix": "Low purchase intent. Add clear booking dates ('In Theaters November') and a direct call-to-action button.",
    },
    "TheatricalUrgency": {
        "label": "Theatrical Urgency & Big-Screen Pull",
        "strength": "Cinematic scale and sound design make audiences demand seeing this in theaters rather than waiting for streaming.",
        "fix": "Lacks big-screen urgency. Emphasize IMAX / 3D cinematic scale, booming audio, and 'Experience It on the Biggest Screen'.",
    },
    "Platform_Linkage": {
        "label": "Platform & Channel Linkage",
        "strength": "Creative format fits native platform mechanics (YouTube/TikTok) seamlessly.",
        "fix": "Weak platform attribution. Add platform-native end screens, subscribe cues, or ticket booking links in the final 5s.",
    },
    "ViewThruRate": {
        "label": "View-Through Retention (VTR)",
        "strength": "Smooth pacing prevents drop-off and holds attention through to the end credits.",
        "fix": "Mid-trailer viewer drop-off detected. Trim slow dialogue scenes around the 50% mark to sustain momentum.",
    },
    "ViewingDuration": {
        "label": "Viewing Duration",
        "strength": "Strong story rhythm maintains viewer watch time across the full duration.",
        "fix": "Viewer attention wanes quickly. Increase scene transition speed and layer background music to drive forward momentum.",
    },
    "location": {
        "label": "Location & Worldbuilding Clarity",
        "strength": "Atmospheric environments and worldbuilding transport the audience immediately.",
        "fix": "Setting feels disjointed or confusing. Include establishing wide shots to ground the audience in the world.",
    },
}


class MonetPipeline:
    def __init__(self):
        self.predictor = MonetKPIPredictor()

    def _infer_metadata_from_vlm(self, vlm_result: Any) -> CampaignMetadata:
        meta_dict: dict[str, object] = {
            "movie_title": "Untitled Creative",
            "studio": "Marvel" if getattr(vlm_result, "brand_share", 0) > 0.3 else "Other",
            "platform": "YouTube",
            "ad_type": "Teaser",
            "franchise_vs_original": "Franchise" if getattr(vlm_result, "brand_share", 0) > 0.2 else "Original",
            "cohort": "Total",
            "country": "US",
        }

        if vlm_result and hasattr(vlm_result, "dominant_tone"):
            tone = str(vlm_result.dominant_tone).lower()
            hook_opens = str(vlm_result.hook.opens_with).lower() if hasattr(vlm_result, "hook") else ""
            if "scary" in tone or "horror" in tone:
                meta_dict["genre"] = "Horror"
            elif "funny" in tone or "comedy" in tone:
                meta_dict["genre"] = "Comedy"
            elif "action" in hook_opens or "exciting" in tone:
                meta_dict["genre"] = "Action"
            elif "romantic" in tone:
                meta_dict["genre"] = "Drama"
            else:
                meta_dict["genre"] = "Action"

        return CampaignMetadata.model_validate(meta_dict)

    def _generate_recommendations(
        self,
        features: MultimodalFeatures,
        predictions: dict[str, object],
    ) -> List[EditorialRecommendation]:
        recs: List[EditorialRecommendation] = []

        # 1. PRESCRIPTION 1: OPENING HOOK (0–5s)
        hook_data = predictions.get("HookingPower")
        if hook_data and hasattr(hook_data, "score") and hasattr(hook_data, "genre_norm"):
            hook_score = getattr(hook_data, "score")
            hook_norm = getattr(hook_data, "genre_norm")
            if hook_score < hook_norm:
                recs.append(
                    EditorialRecommendation(
                        type="warning",
                        area="Opening Hook (0–5s)",
                        message=f"Hooking Power ({hook_score}%) is below genre norm ({hook_norm}%). Hook motion was {features.hook_motion:.1f}. Open with a faster character action beat or immediate visual question in sec 0–3.",
                    )
                )
            else:
                recs.append(
                    EditorialRecommendation(
                        type="success",
                        area="Opening Hook (0–5s)",
                        message=f"Strong opening hook! Score ({hook_score}%) outperforms genre norm ({hook_norm}%). Visual motion and pacing effectively capture mobile attention.",
                    )
                )

        # Calculate deltas (Score vs Genre Norm) for all other 12 KPIs
        deltas: List[tuple[str, float, float, float]] = []
        for kpi_key, data in predictions.items():
            if kpi_key == "HookingPower":
                continue
            if hasattr(data, "score") and hasattr(data, "genre_norm"):
                s = float(getattr(data, "score"))
                norm = float(getattr(data, "genre_norm"))
                delta = s - norm
                deltas.append((kpi_key, delta, s, norm))

        if deltas:
            # Sort deltas from best (highest positive) to worst (lowest negative)
            deltas.sort(key=lambda x: x[1], reverse=True)

            # 2. PRESCRIPTION 2: STRONGEST DIMENSION (Top Asset)
            best_kpi, best_delta, best_score, best_norm = deltas[0]
            best_info = KPI_PRESCRIPTION_GUIDE.get(
                best_kpi,
                {"label": best_kpi.replace("_OLD", ""), "strength": "Significant outperformance against genre benchmark.", "fix": ""}
            )
            sign = "+" if best_delta >= 0 else ""
            recs.append(
                EditorialRecommendation(
                    type="success",
                    area=f"Strongest Asset: {best_info['label']}",
                    message=f"Outperforming genre norm by {sign}{best_delta:.1f} pts ({best_score:.1f}% vs {best_norm:.1f}% norm). {best_info['strength']}",
                )
            )

            # 3. PRESCRIPTION 3: BIGGEST OPPORTUNITY (Weakest Dimension to Fix)
            worst_kpi, worst_delta, worst_score, worst_norm = deltas[-1]
            worst_info = KPI_PRESCRIPTION_GUIDE.get(
                worst_kpi,
                {"label": worst_kpi.replace("_OLD", ""), "strength": "", "fix": "Underperforming genre norm. Optimize pacing, branding cues, and call-to-actions."}
            )
            w_sign = "+" if worst_delta >= 0 else ""
            recs.append(
                EditorialRecommendation(
                    type="warning" if worst_delta < 0 else "info",
                    area=f"Key Optimization: {worst_info['label']}",
                    message=f"Score is {worst_score:.1f}% ({w_sign}{worst_delta:.1f} pts vs {worst_norm:.1f}% norm). {worst_info['fix']}",
                )
            )

        return recs

    async def analyze_video(
        self,
        video_path: str | Path,
        metadata: Optional[Union[CampaignMetadata, dict[str, object]]] = None,
        output_keyframes_dir: Optional[str | Path] = None,
        vlm_config: Optional[VLMConfig] = None,
    ) -> PipelineResult:
        path = Path(video_path)
        if not path.is_file():
            raise VideoReadError(f"Target video does not exist: {path}")

        logger.info("Step 1/4: Extracting Computer Vision Physics & Scene Cuts...")
        cv_res = extract_cv_features(
            path, output_keyframes_dir=output_keyframes_dir
        )
        cv_feats = cv_res.features
        scene_cuts = cv_res.scene_cuts
        keyframe_paths = cv_res.keyframe_paths

        logger.info("Step 2/4: Extracting Speech & Dialogue Features (faster-whisper)...")
        audio_feats = extract_audio_features(path)

        logger.info("Step 3/4: Extracting Scene Semantics with Qwen-VL...")
        vlm_result = await extract_vlm_features(path, scene_cuts, config=vlm_config)

        if metadata is None:
            final_meta = self._infer_metadata_from_vlm(vlm_result)
        elif isinstance(metadata, dict):
            final_meta = CampaignMetadata.model_validate(metadata)
        else:
            final_meta = metadata

        multimodal_feats = MultimodalFeatures.from_extractors(
            meta=final_meta,
            cv=cv_feats,
            audio=audio_feats,
            vlm=vlm_result,
        )

        logger.info("Step 4/4: Running CQR Conformal KPI Predictions...")
        predictions = self.predictor.predict(multimodal_feats)

        recommendations = self._generate_recommendations(multimodal_feats, predictions)

        return PipelineResult(
            video_path=str(path),
            metadata=final_meta,
            predictions=predictions,
            recommendations=recommendations,
            scenes=vlm_result.scenes,
            extracted_features=multimodal_feats,
            keyframes=keyframe_paths,
        )
