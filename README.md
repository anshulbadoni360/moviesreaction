# Monet Labs — Video Intelligence & KPI Prediction Pipeline

A clean, modular **Compound AI Pipeline** for predicting video ad and movie trailer performance before fielding audience tests.

---

## 📁 Pipeline Architecture & Modules

```
monet_pipeline/
 ├── __init__.py           # Package exports
 ├── cv_extractor.py       # Stage 1: OpenCV & PySceneDetect (Physics, cuts, motion, faces, keyframes)
 ├── audio_extractor.py    # Stage 2: faster-whisper (Dialogue transcription, pacing, speech density)
 ├── vlm_extractor.py      # Stage 3: Qwen2.5-VL / OpenAI (Scene semantics, tone, opening hook)
 ├── kpi_model.py          # Stage 4: HistGradientBoostingRegressor + CQR Conformal Calibration (13 KPIs)
 ├── pipeline.py           # Master Orchestrator (Coordinates all 4 stages into one clean call)
 └── run_pipeline.py       # Standalone CLI runner
```

---

## 🚀 How to Run the Pipeline

### 1. Prerequisites & Dependencies
```bash
pip install opencv-python-headless scenedetect faster-whisper scikit-learn pandas numpy joblib
```

### 2. Run via Command Line (CLI)
```bash
python monet_pipeline/run_pipeline.py --video your_video.mp4 --genre Horror --platform TikTok
```

### 3. Use Programmatically in Python / Jupyter

```python
from monet_pipeline import MonetPipeline

# Initialize the compound pipeline
pipeline = MonetPipeline(
    vlm_api_base="http://localhost:11434/v1",
    vlm_model="qwen2.5vl:7b"
)

# Analyze a video with campaign metadata
result = pipeline.analyze_video(
    video_path="my_trailer.mp4",
    metadata={
        "genre": "Horror",
        "platform": "TikTok",
        "cohort": "Total"
    },
    output_keyframes_dir="keyframes_output"
)

# Access predictions
print(result["predictions"]["HookingPower"])
# Output: {'score': 78.4, 'interval': [72.1, 83.9], 'genre_norm': 68.5, 'trend': 'above'}

# Access actionable recommendations
for rec in result["recommendations"]:
    print(rec["area"], "->", rec["message"])
```

---

## 📊 The 13 Predicted Audience KPIs
1. **`HookingPower`**: Attention capture in the first 0–5 seconds.
2. **`BREAKTHROUGH_OLD`**: Overall standout from feed clutter.
3. **`UnaidedRecall`**: Memorability without title clues.
4. **`AidedRecall`**: Recognition when prompted with title.
5. **`Interest` & `Interest_T2B`**: Content appeal and high-intent fan fraction.
6. **`BuyTicket`**: Commercial purchase / box-office intent.
7. **`ViewThruRate`**: Video completion rate.
8. **`ViewingDuration`**: Average watch time in seconds.
9. **`ACTION`**: Search, share, and buzz generation.
10. **`Platform_Linkage`**: Correct attribution to streaming/theater channel.
11. **`TheatricalUrgency`**: Motivation to watch on opening weekend.
12. **`location`**: Awareness of where to watch.
