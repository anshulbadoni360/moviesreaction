#!/usr/bin/env python3
"""
CLI Runner for the Monet Video Intelligence Pipeline.

Usage:
    python monet_pipeline/run_pipeline.py \
        --video sample.mp4 \
        --title "My Film" \
        --genre "Action" \
        --studio "Indie" \
        --franchise "Original"
"""

import argparse
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from models.pipeline import CampaignMetadata
from services.ml_engine import MonetKPIPredictor, find_dataset_file
from services.pipeline import MonetPipeline


def main():
    parser = argparse.ArgumentParser(description="Monet Labs Video KPI Pipeline")

    parser.add_argument("--video", required=False, default=None, help="Path to video file")
    parser.add_argument("--title", default="Untitled Creative", help="Movie or Ad Title")
    parser.add_argument("--genre", default="Action", help="Genre (Action, Horror, Comedy, Drama, Animation, Sci-Fi)")
    parser.add_argument("--studio", default="Independent / Other", help="Studio / Brand (e.g. Disney, Warner Bros, Indie)")
    parser.add_argument("--platform", default="YouTube", help="Platform (YouTube, TikTok, Instagram Reels)")
    parser.add_argument("--ad-type", default="Teaser", help="Format (Official Trailer, Teaser, Ad Spot, Social Cutdown)")
    parser.add_argument("--franchise", default="Original", choices=["Franchise", "Original"], help="Franchise Sequel or Original IP")
    parser.add_argument("--cohort", default="Total", help="Audience Demographic (Total, Male 18-34, Female 18-34, Teens 13-17)")
    parser.add_argument("--country", default="US", help="Market Country (US, UK, Global)")
    parser.add_argument("--sample-type", default="General", help="Audience Type (General vs Core)")
    parser.add_argument("--sample-age", default="18-34", help="Age bracket (18-34, <35, 35-54)")
    parser.add_argument("--train-only", action="store_true", help="Force retrain models from dataset.csv or norms_data.csv")

    args = parser.parse_args()

    if args.train_only:
        dataset_path = find_dataset_file()
        print(f"Training full 13-KPI model bundle from: {dataset_path}...")
        predictor = MonetKPIPredictor(model_save_path="monet_kpi_bundle.joblib")
        predictor.train_from_csv(dataset_path)
        return

    if not args.video:
        print("Please provide a video file path using --video (e.g. --video my_video.mp4)")
        return

    pipeline = MonetPipeline()

    user_metadata = CampaignMetadata(
        movie_title=args.title,
        genre=args.genre,
        studio=args.studio,
        platform=args.platform,
        ad_type=args.ad_type,
        franchise_vs_original=args.franchise,
        cohort=args.cohort,
        country=args.country,
        sample_type=args.sample_type,
        sample_age=args.sample_age,
    )

    result = pipeline.analyze_video_sync(
        video_path=args.video,
        metadata=user_metadata,
        output_keyframes_dir="keyframes_output",
    )

    meta = result.metadata
    print("\n" + "=" * 75)
    print("                      MONET LABS AUDIENCE SCORECARD")
    print("=" * 75)
    print(f" Title     : {meta.movie_title}")
    print(f" Video     : {result.video_path}")
    print(f" Campaign  : {meta.genre} | Studio: {meta.studio} | IP: {meta.franchise_vs_original}")
    print(f" Targeting : {meta.platform} ({meta.ad_type}) | Cohort: {meta.cohort} ({meta.country})")
    print("-" * 75)
    print(f"{'KPI Metric':<22} | {'Predicted Score':<16} | {'80% Range':<16} | {'vs Genre Norm'}")
    print("-" * 75)

    for kpi, data in result.predictions.items():
        score_str = f"{data.score}%" if kpi != "ViewingDuration" else f"{data.score}s"
        range_str = f"[{data.interval[0]} - {data.interval[1]}]"
        norm_str = f"{data.genre_norm}% ({data.trend})"
        print(f"{kpi:<22} | {score_str:<16} | {range_str:<16} | {norm_str}")

    print("\n" + "=" * 75)
    print("                   ACTIONABLE EDITORIAL RECOMMENDATIONS")
    print("=" * 75)
    for rec in result.recommendations:
        tag = "[+]" if rec.type == "success" else "[!]" if rec.type == "warning" else "[i]"
        print(f"{tag} {rec.area}: {rec.message}")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    main()
