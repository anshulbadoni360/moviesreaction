"use client";

import React, { useState } from "react";
import { X, UploadCloud, Film, ArrowRight } from "lucide-react";
import { useAnalysis } from "@/context/AnalysisContext";

interface AnalyzeVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AnalyzeVideoModal({
  isOpen,
  onClose,
  onSuccess,
}: AnalyzeVideoModalProps) {
  const { startAnalysis } = useAnalysis();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Sci-Fi");
  const [studio, setStudio] = useState("Marvel / Disney");
  const [platform, setPlatform] = useState("YouTube");
  const [adType, setAdType] = useState("Official Trailer");
  const [franchise, setFranchise] = useState<"Franchise" | "Original">("Franchise");
  const [cohort, setCohort] = useState("Total");
  const [sampleAge, setSampleAge] = useState("18-34");
  const [country, setCountry] = useState("US");
  const [vlmProvider, setVlmProvider] = useState<"local" | "nvidia" | "gemini">("local");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file to upload (.mp4, .mov, .mkv)");
      return;
    }

    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);
    formData.append("genre", genre);
    formData.append("studio", studio);
    formData.append("platform", platform);
    formData.append("ad_type", adType);
    formData.append("franchise_vs_original", franchise);
    formData.append("cohort", cohort);
    formData.append("country", country);
    formData.append("vlm_provider", vlmProvider);

    // Launch analysis in background context and close modal immediately
    const videoTitle = title || file.name;
    startAnalysis(formData, videoTitle);
    onClose();

    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-xs p-4">
      <div className="genesis-card shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 bg-surface">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[6px] bg-indigo-50 text-primary flex items-center justify-center border border-indigo-100">
              <Film className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-text-primary">
                Analyze Creative Video
              </h2>
              <p className="text-[12px] text-text-secondary">
                Configure audience demographics & multimodal AI parameters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral hover:text-text-primary rounded-[4px] hover:bg-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Video Dropzone */}
          <div className="relative border border-dashed border-border hover:border-primary rounded-[8px] p-5 text-center transition-colors cursor-pointer group bg-bg">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-7 h-7 text-neutral group-hover:text-primary mx-auto transition-colors" />
            <p className="text-xs font-semibold text-text-primary mt-1.5 font-display">
              {file ? file.name : "Click or drag video file to upload (.mp4, .mov, .mkv)"}
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                : "Up to 500 MB video files"}
            </p>
          </div>

          {/* Core Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                Creative Title
              </label>
              <input
                type="text"
                placeholder="e.g. Official Teaser 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-[6px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                Genre
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-[6px] focus:outline-none focus:border-primary transition-colors"
              >
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Action">Action</option>
                <option value="Horror">Horror</option>
                <option value="Comedy">Comedy</option>
                <option value="Drama">Drama</option>
                <option value="Animation">Animation</option>
                <option value="Thriller">Thriller</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                Ad / Creative Type
              </label>
              <select
                value={adType}
                onChange={(e) => setAdType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-[6px] focus:outline-none focus:border-primary transition-colors"
              >
                <option value="Official Trailer">Official Trailer</option>
                <option value="Teaser">Teaser</option>
                <option value="Ad Spot">Ad Spot (30s)</option>
                <option value="Social Cutdown">Social Cutdown (15s)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-[6px] focus:outline-none focus:border-primary transition-colors"
              >
                <option value="YouTube">YouTube</option>
                <option value="Theatrical">Theatrical</option>
                <option value="TikTok">TikTok</option>
                <option value="Instagram">Instagram Reels</option>
              </select>
            </div>
          </div>

          {/* Demographic & Cohort Segmentation */}
          <div className="pt-2 border-t border-border space-y-3">
            <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider font-display">
              Target Audience Cohort & Market
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                  Cohort
                </label>
                <select
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-surface border border-border rounded-[6px] focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="Total">Total Audience</option>
                  <option value="Male 18-34">Male 18-34</option>
                  <option value="Female 18-34">Female 18-34</option>
                  <option value="Core Fans">Core Fans</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                  Age Bracket
                </label>
                <select
                  value={sampleAge}
                  onChange={(e) => setSampleAge(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-surface border border-border rounded-[6px] focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="18-34">18–34 yrs</option>
                  <option value="18-49">18–49 yrs</option>
                  <option value="25-54">25–54 yrs</option>
                  <option value="All 13+">All 13+</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                  Target Market
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-surface border border-border rounded-[6px] focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="US">United States (US)</option>
                  <option value="UK">United Kingdom (UK)</option>
                  <option value="Global">Global / Worldwide</option>
                  <option value="India">India (IN)</option>
                  <option value="Germany">Germany (DE)</option>
                  <option value="Japan">Japan (JP)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                  Studio / Brand
                </label>
                <input
                  type="text"
                  placeholder="e.g. Marvel Studios"
                  value={studio}
                  onChange={(e) => setStudio(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-[6px] focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                  IP Classification
                </label>
                <select
                  value={franchise}
                  onChange={(e) => setFranchise(e.target.value as "Franchise" | "Original")}
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-[6px] focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="Franchise">Franchise Sequel / IP</option>
                  <option value="Original">Original Intellectual Property</option>
                </select>
              </div>
            </div>

            {/* AI Engine Selection */}
            <div className="pt-1">
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                Vision-Language AI Engine
              </label>
              <select
                value={vlmProvider}
                onChange={(e) => setVlmProvider(e.target.value as "local" | "nvidia" | "gemini")}
                className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-[6px] focus:outline-none focus:border-primary transition-colors font-medium"
              >
                <option value="local">⚡ Local GPU (Ollama LAN) • Auto-Failover to NVIDIA</option>
                <option value="nvidia">🚀 NVIDIA NIM Cloud AI (nvidia/ising-calibration-1.5-31b)</option>
                <option value="gemini">☁️ Google Gemini 1.5 Flash (Cloud API)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-[6px] text-status-error text-xs">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="genesis-btn-secondary px-3.5 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="genesis-btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5 shadow-btn-glow"
            >
              <span>Run Multimodal Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
