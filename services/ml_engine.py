from __future__ import annotations

import logging
import warnings
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.exceptions import InconsistentVersionWarning
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from models.ml import KPIScoreResult, MultimodalFeatures, PredictionBundle
from services.exceptions import ModelParseError, ModelServiceError, VideoReadError

# Suppress benign unpickling version warnings
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

logger = logging.getLogger(__name__)

TARGETS = [
    "HookingPower",
    "BREAKTHROUGH_OLD",
    "UnaidedRecall",
    "AidedRecall",
    "Interest",
    "Interest_T2B",
    "BuyTicket",
    "ViewThruRate",
    "ViewingDuration",
    "ACTION",
    "Platform_Linkage",
    "TheatricalUrgency",
    "location",
]

NUM_FEATURES = [
    "hook_motion",
    "hook_cuts",
    "hook_bright_mean",
    "hook_face_frac",
    "hook_brand_shown",
    "motion_mean",
    "motion_std",
    "cuts",
    "cuts_per_s",
    "shot_len_mean",
    "bright_mean",
    "contrast_mean",
    "sat_mean",
    "face_frac",
    "face_area_max",
    "duration_s",
    "speech_ratio",
    "words_per_sec",
    "word_count",
    "has_dialogue",
    "n_scenes",
    "brand_share",
    "closeup_share",
    "action_high_share",
    "dialogue_share",
    "has_title_card",
]

CAT_FEATURES = [
    "genre",
    "studio",
    "platform",
    "ad_type",
    "cohort",
    "franchise_vs_original",
    "country",
    "hook_opens_with",
    "hook_attention",
    "hook_pace",
    "dominant_tone",
    "dominant_setting",
]

COLUMN_MAPPING = {
    "breakthrough": "BREAKTHROUGH_OLD",
    "unaided_recall": "UnaidedRecall",
    "aided_recall": "AidedRecall",
    "view_through": "ViewThruRate",
    "interest": "Interest",
    "intent": "BuyTicket",
    "buy_ticket": "BuyTicket",
    "theatrical_urgency": "TheatricalUrgency",
    "action": "ACTION",
    "cnt_genre": "genre",
}


def find_bundle_file(preferred_path: str | Path | None = None) -> Path | None:
    if preferred_path and (p := Path(preferred_path)).is_file():
        return p.resolve()

    candidates = [
        "ml_models/monet_kpi_bundle.joblib",
        "ml_model/monet_kpi_bundle.joblib",
        "monet_kpi_bundle.joblib",
        "model/kpi_models.joblib",
        "../model/kpi_models.joblib",
        "../monet_pipeline/ml_models/monet_kpi_bundle.joblib",
        Path(__file__).parent.parent / "ml_models" / "monet_kpi_bundle.joblib",
        Path(__file__).parent.parent / "monet_kpi_bundle.joblib",
        Path(__file__).parent.parent.parent / "model" / "kpi_models.joblib",
    ]
    for rel_path in candidates:
        if (path_obj := Path(rel_path)).is_file():
            return path_obj.resolve()
    return None


def find_dataset_file() -> Path:
    candidates = [
        "dataset.csv",
        "video-intel/dataset.csv",
        "data/norms_data.csv",
        "norms_data.csv",
        "../data/norms_data.csv",
        "../dataset.csv",
        "../video-intel/dataset.csv",
        Path(__file__).parent.parent.parent / "data" / "norms_data.csv",
        Path(__file__).parent.parent.parent / "video-intel" / "dataset.csv",
    ]
    for rel_path in candidates:
        if (p := Path(rel_path)).is_file():
            return p.resolve()
    raise VideoReadError(
        "Could not find dataset.csv or norms_data.csv to train models."
    )


class MonetKPIPredictor:
    def __init__(self, model_save_path: str | Path = "ml_models/monet_kpi_bundle.joblib") -> None:
        self.num_features = NUM_FEATURES
        self.cat_features = CAT_FEATURES
        self.features = self.num_features + self.cat_features
        self.targets = TARGETS
        self.model_save_path = Path(model_save_path)

        self.models: dict[str, Pipeline] = {}
        self.q_low: dict[str, Pipeline] = {}
        self.q_high: dict[str, Pipeline] = {}
        self.cqr_offsets: dict[str, float] = {}
        self.norms: dict[str, dict[str, Any]] = {}

    def _build_pipeline(self, quantile: float | None = None) -> Pipeline:
        preprocessor = ColumnTransformer(
            [
                (
                    "cat",
                    Pipeline(
                        [
                            (
                                "encoder",
                                OneHotEncoder(
                                    handle_unknown="ignore", sparse_output=False
                                ),
                            )
                        ]
                    ),
                    self.cat_features,
                ),
                (
                    "num",
                    Pipeline([("imputer", SimpleImputer(strategy="median", keep_empty_features=True))]),
                    self.num_features,
                ),
            ]
        )

        loss_type = "quantile" if quantile is not None else "squared_error"
        reg_args = {
            "loss": loss_type,
            "max_iter": 250,
            "learning_rate": 0.07,
            "max_leaf_nodes": 31,
            "l2_regularization": 1.0,
            "min_samples_leaf": 15,
            "random_state": 42,
        }
        if quantile is not None:
            reg_args["quantile"] = quantile

        return Pipeline(
            [("pre", preprocessor), ("gb", HistGradientBoostingRegressor(**reg_args))]
        )

    def train_from_csv(self, dataset_path: str | Path | None = None) -> None:
        path = Path(dataset_path) if dataset_path else find_dataset_file()
        if not path.is_file():
            raise VideoReadError(f"Training dataset path not found: {path}")

        logger.info("Loading training dataset: %s", path)
        df = pd.read_csv(path)

        for old_col, new_col in COLUMN_MAPPING.items():
            if old_col in df.columns and new_col not in df.columns:
                df[new_col] = df[old_col]

        genre_col = "genre" if "genre" in df.columns else None

        for target in self.targets:
            if target in df.columns:
                valid_t = pd.to_numeric(df[target], errors="coerce")
                overall_mean = float(valid_t.mean()) if valid_t.notna().any() else 50.0
                genre_dict = {}
                if genre_col:
                    genre_dict = (
                        df.groupby(genre_col)[target]
                        .apply(
                            lambda s: float(pd.to_numeric(s, errors="coerce").mean())
                        )
                        .to_dict()
                    )
                self.norms[target] = {"overall": overall_mean, "genre": genre_dict}

        for idx, target in enumerate(self.targets, start=1):
            if target not in df.columns:
                continue

            y_series = pd.to_numeric(df[target], errors="coerce")
            valid_mask = y_series.notna() & (y_series > 0)
            if valid_mask.sum() < 30:
                continue

            df_clean = df.loc[valid_mask].copy()
            y = y_series[valid_mask].values

            for col in self.cat_features:
                df_clean[col] = (
                    df_clean[col].astype(str).fillna("NA")
                    if col in df_clean.columns
                    else "NA"
                )
            for col in self.num_features:
                df_clean[col] = (
                    pd.to_numeric(df_clean[col], errors="coerce").fillna(0.0)
                    if col in df_clean.columns
                    else 0.0
                )

            X = df_clean[self.features]
            logger.info(
                "[%02d/%02d] Training CQR models for %s (%d records)...",
                idx,
                len(self.targets),
                target,
                len(X),
            )

            self.models[target] = self._build_pipeline().fit(X, y)
            self.q_low[target] = self._build_pipeline(quantile=0.10).fit(X, y)
            self.q_high[target] = self._build_pipeline(quantile=0.90).fit(X, y)

            pred_lo = self.q_low[target].predict(X)
            pred_hi = self.q_high[target].predict(X)
            conform_scores = np.maximum(pred_lo - y, y - pred_hi)
            self.cqr_offsets[target] = max(
                4.0, float(np.quantile(conform_scores, 0.80))
            )

        self.save()

    def save(self) -> None:
        self.model_save_path.parent.mkdir(parents=True, exist_ok=True)
        bundle = {
            "models": self.models,
            "q_low": self.q_low,
            "q_high": self.q_high,
            "cqr_offsets": self.cqr_offsets,
            "norms": self.norms,
            "features": self.features,
            "targets": self.targets,
        }
        try:
            joblib.dump(bundle, self.model_save_path)
            logger.info(
                "Successfully exported predictor bundle: %s", self.model_save_path
            )
        except Exception as exc:
            raise ModelServiceError(
                f"Failed serialization to: {self.model_save_path}"
            ) from exc

    def load(self, path: str | Path | None = None) -> bool:
        bundle_path = find_bundle_file(path or self.model_save_path)
        if not bundle_path:
            return False
        try:
            bundle = joblib.load(bundle_path)
            self.models = bundle["models"]
            self.q_low = bundle["q_low"]
            self.q_high = bundle["q_high"]
            self.cqr_offsets = bundle["cqr_offsets"]
            self.norms = bundle["norms"]
            self.model_save_path = bundle_path
            logger.info("Successfully loaded pre-trained bundle from: %s", bundle_path)
            return True
        except Exception as exc:
            logger.warning("Existing bundle was compiled with a different scikit-learn version (%s). Retraining locally...", exc)
            return False

    def predict_all(self, feature_dict: dict[str, Any]) -> PredictionBundle:
        if not self.models:
            if not self.load():
                raise ModelServiceError(
                    "Model checkpoints missing or failed to initialize."
                )

        validated = MultimodalFeatures.model_validate(feature_dict)
        row_df = pd.DataFrame([validated.model_dump()])

        genre = validated.genre.title()
        duration = validated.duration_s
        hook_motion = validated.hook_motion

        results: dict[str, KPIScoreResult] = {}

        for target, model in self.models.items():
            base_score = float(model.predict(row_df)[0])
            offset = float(self.cqr_offsets.get(target, 5.0))

            low, high = base_score - offset, base_score + offset

            if target == "ViewingDuration":
                base_score = min(duration, max(3.0, (base_score / 60.0) * duration))
                low, high = max(1.0, base_score - 2.5), min(duration, base_score + 3.0)

            elif target == "ViewThruRate":
                if duration <= 30.0:
                    base_score *= 1.22
                elif duration >= 120.0:
                    base_score *= 0.88
                base_score = max(5.0, min(95.0, base_score))
                low, high = (
                    max(0.0, base_score - offset),
                    min(100.0, base_score + offset),
                )

            elif target == "HookingPower":
                if hook_motion > 20.0:
                    base_score += 4.5
                elif hook_motion < 5.0:
                    base_score -= 6.0
                base_score = max(5.0, min(95.0, base_score))
                low, high = (
                    max(0.0, base_score - offset),
                    min(100.0, base_score + offset),
                )

            else:
                base_score = max(0.0, min(100.0, base_score))
                low, high = (
                    max(0.0, base_score - offset),
                    min(100.0, base_score + offset),
                )

            target_norm = self.norms.get(target, {})
            norm_val = target_norm.get("genre", {}).get(
                genre, target_norm.get("overall", base_score)
            )

            if base_score > norm_val * 1.05:
                trend = "above"
            elif base_score < norm_val * 0.95:
                trend = "below"
            else:
                trend = "in-line"

            results[target] = KPIScoreResult(
                score=round(base_score, 1),
                interval=(round(low, 1), round(high, 1)),
                genre_norm=round(norm_val, 1),
                trend=trend,
            )

        return PredictionBundle(results=results)

    def predict(self, feature_input: Any) -> dict[str, KPIScoreResult]:
        if isinstance(feature_input, MultimodalFeatures):
            feat_dict = feature_input.model_dump()
        elif isinstance(feature_input, dict):
            feat_dict = feature_input
        elif hasattr(feature_input, "model_dump"):
            feat_dict = feature_input.model_dump()
        else:
            feat_dict = dict(feature_input)
        bundle = self.predict_all(feat_dict)
        return bundle.results
