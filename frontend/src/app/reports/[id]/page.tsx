"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { KPICard } from "@/components/ui/KPICard";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { DistributionBarChart } from "@/components/charts/DistributionBarChart";
import { DimensionBarChart } from "@/components/charts/DimensionBarChart";
import { deleteVideoAnalysis, fetchBenchmarkNorms, fetchVideoHistory } from "@/lib/api";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Volume2,
  Eye,
  Zap,
  Trash2,
  Loader2,
} from "lucide-react";

const KPI_GUIDE: Record<string, { label: string; strength: string; fix: string }> = {
  BREAKTHROUGH_OLD: {
    label: "Breakthrough & Memorability",
    strength: "Visual spectacle and distinctive branding create massive audience retention and recall.",
    fix: "Creative lacks distinctive visual signatures. Introduce a high-contrast hero motif or iconic sound effect to stick in memory.",
  },
  ACTION: {
    label: "Action & Visual Intensity",
    strength: "High-octane visual motion and rapid cutting drive strong audience pulse and engagement.",
    fix: "Pacing feels flat or static. Elevate shot tempo and introduce kinetic camera moves in the mid-trailer crescendo.",
  },
  UnaidedRecall: {
    label: "Unaided Brand & Title Recall",
    strength: "Audience clearly connects the story and visuals directly to the movie title.",
    fix: "Title is easily forgotten. Display the title card for at least 2.5 seconds and have a character voice the title aloud.",
  },
  AidedRecall: {
    label: "Aided Recognition",
    strength: "High brand and IP familiarity across general demographics.",
    fix: "Low recognition. Connect the teaser more explicitly to recognizable franchise lore, actors, or signature characters.",
  },
  Interest: {
    label: "Audience Interest & Curiosity",
    strength: "Narrative premise sparks deep intrigue and desire to discover the plot.",
    fix: "Premise feels generic or unclear. Clarify the central conflict or stakes earlier in the trailer.",
  },
  Interest_T2B: {
    label: "High-Intent Interest (Top-2-Box)",
    strength: "Significant portion of viewers rate this in their top-tier must-watch list.",
    fix: "Fails to convert casual interest into must-watch urgency. Add a surprising plot twist or cliffhanger in the final 10 seconds.",
  },
  BuyTicket: {
    label: "Ticket Conversion & Purchase Intent",
    strength: "Compelling call-to-action drives immediate box office and streaming conversion.",
    fix: "Low purchase intent. Add clear booking dates ('In Theaters November') and a direct call-to-action button.",
  },
  TheatricalUrgency: {
    label: "Theatrical Urgency & Big-Screen Pull",
    strength: "Cinematic scale and sound design make audiences demand seeing this in theaters rather than waiting for streaming.",
    fix: "Lacks big-screen urgency. Emphasize IMAX / 3D cinematic scale, booming audio, and 'Experience It on the Biggest Screen'.",
  },
  Platform_Linkage: {
    label: "Platform & Channel Linkage",
    strength: "Creative format fits native platform mechanics (YouTube/TikTok) seamlessly.",
    fix: "Weak platform attribution. Add platform-native end screens, subscribe cues, or ticket booking links in the final 5s.",
  },
  ViewThruRate: {
    label: "View-Through Retention (VTR)",
    strength: "Smooth pacing prevents drop-off and holds attention through to the end credits.",
    fix: "Mid-trailer viewer drop-off detected. Trim slow dialogue scenes around the 50% mark to sustain momentum.",
  },
  ViewingDuration: {
    label: "Viewing Duration",
    strength: "Strong story rhythm maintains viewer watch time across the full duration.",
    fix: "Viewer attention wanes quickly. Increase scene transition speed and layer background music to drive forward momentum.",
  },
  location: {
    label: "Location & Worldbuilding Clarity",
    strength: "Atmospheric environments and worldbuilding transport the audience immediately.",
    fix: "Setting feels disjointed or confusing. Include establishing wide shots to ground the audience in the world.",
  },
};

export default function VideoReportPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = (params?.id as string) || "";
  const [video, setVideo] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleConfirmDelete = async () => {
    if (!video?.id) return;
    try {
      setIsDeleting(true);
      await deleteVideoAnalysis(video.id);
      setIsDeleteModalOpen(false);
      router.push("/videos");
    } catch (err) {
      alert("Failed to delete report. Please try again.");
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [history, normData] = await Promise.all([
        fetchVideoHistory(),
        fetchBenchmarkNorms(),
      ]);
      const found = history.find((v: any) => v.id === videoId) || history[0];
      setVideo(found);
      setBenchmarks(normData);
      setIsLoading(false);
    }
    load();
  }, [videoId]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-text-secondary text-sm">
        Loading audience intelligence report...
      </div>
    );
  }

  if (!video) {
    return (
      <div className="genesis-card p-12 text-center space-y-3">
        <h2 className="font-display text-lg font-bold text-text-primary">
          No Analysis Found
        </h2>
        <p className="text-sm text-text-secondary">
          Upload a video from the top navigation to generate its scorecard.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="genesis-btn-primary inline-flex px-4 py-2 text-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const details = video.details || {};
  const predictions = details.predictions || {};
  const features = details.extracted_features || {};
  const kpiAverages = benchmarks?.kpi_averages || {};

  const KPI_DEFINITIONS = [
    { key: "HookingPower", label: "Hooking Power" },
    { key: "UnaidedRecall", label: "Unaided Recall" },
    { key: "AidedRecall", label: "Aided Recall" },
    { key: "BREAKTHROUGH_OLD", label: "Breakthrough" },
    { key: "Interest", label: "Interest" },
    { key: "BuyTicket", label: "Buy Ticket Intent" },
    { key: "ViewThruRate", label: "View-Through Rate" },
    { key: "ViewingDuration", label: "Viewing Duration" },
    { key: "ACTION", label: "Action Score" },
    { key: "Platform_Linkage", label: "Platform Linkage" },
    { key: "TheatricalUrgency", label: "Theatrical Urgency" },
    { key: "location", label: "Location Clarity" },
  ];

  // Dynamic Chart Data
  const dimensionChartData = KPI_DEFINITIONS.map((item) => {
    const datasetAvg = kpiAverages[item.key] ? Math.round(kpiAverages[item.key]) : 50;
    const thisVideoScore = predictions[item.key]
      ? Math.round(predictions[item.key].score)
      : datasetAvg;

    return {
      dimension: item.label,
      thisVideo: thisVideoScore,
      datasetAverage: datasetAvg,
    };
  });

  const trendChartData = [
    {
      dimension: "Hooking Power",
      thisVideo: predictions.HookingPower ? Math.round(predictions.HookingPower.score) : Math.round(kpiAverages.HookingPower || 51),
      datasetAverage: Math.round(kpiAverages.HookingPower || 51),
    },
    {
      dimension: "Recall",
      thisVideo: predictions.AidedRecall ? Math.round(predictions.AidedRecall.score) : Math.round(kpiAverages.AidedRecall || 54),
      datasetAverage: Math.round(kpiAverages.AidedRecall || 54),
    },
    {
      dimension: "Engagement",
      thisVideo: predictions.Interest ? Math.round(predictions.Interest.score) : Math.round(kpiAverages.Interest || 38),
      datasetAverage: Math.round(kpiAverages.Interest || 38),
    },
    {
      dimension: "Action",
      thisVideo: predictions.ACTION ? Math.round(predictions.ACTION.score) : Math.round(kpiAverages.ACTION || 58),
      datasetAverage: Math.round(kpiAverages.ACTION || 58),
    },
    {
      dimension: "Intent",
      thisVideo: predictions.BuyTicket ? Math.round(predictions.BuyTicket.score) : Math.round(kpiAverages.BuyTicket || 28),
      datasetAverage: Math.round(kpiAverages.BuyTicket || 28),
    },
  ];

  // ALWAYS generate the 3 Actionable Editorial Prescriptions (Hook, Strongest Asset, Key Optimization)
  const computedRecommendations = (() => {
    const recs: Array<{ type: "success" | "warning" | "info"; area: string; message: string }> = [];

    // 1. OPENING HOOK (0–5s)
    const hook = predictions.HookingPower;
    if (hook) {
      const hScore = Number(hook.score || 0);
      const hNorm = Number(hook.genre_norm || 51.5);
      if (hScore >= hNorm) {
        recs.push({
          type: "success",
          area: "Opening Hook (0–5s)",
          message: `Strong opening hook! Score (${hScore.toFixed(1)}%) outperforms genre norm (${hNorm.toFixed(1)}%). Visual action and motion effectively capture mobile attention.`,
        });
      } else {
        recs.push({
          type: "warning",
          area: "Opening Hook (0–5s)",
          message: `Hooking Power (${hScore.toFixed(1)}%) is below genre norm (${hNorm.toFixed(1)}%). Motion was ${features.hook_motion ? Number(features.hook_motion).toFixed(1) : "low"}. Consider opening with a faster character action beat in sec 0–3.`,
        });
      }
    }

    // Calculate all other KPI deltas vs genre norm
    const deltas: Array<{ key: string; delta: number; score: number; norm: number }> = [];
    Object.entries(predictions).forEach(([k, v]: [string, any]) => {
      if (k !== "HookingPower" && v && v.score !== undefined && v.genre_norm !== undefined) {
        const s = Number(v.score);
        const norm = Number(v.genre_norm);
        deltas.push({ key: k, delta: s - norm, score: s, norm });
      }
    });

    if (deltas.length > 0) {
      deltas.sort((a, b) => b.delta - a.delta);

      // 2. STRONGEST ASSET (Highest Positive Delta)
      const best = deltas[0];
      const bestInfo = KPI_GUIDE[best.key] || {
        label: best.key.replace("_OLD", ""),
        strength: "Significant outperformance against genre benchmark.",
        fix: "",
      };
      const bSign = best.delta >= 0 ? "+" : "";
      recs.push({
        type: "success",
        area: `Strongest Asset: ${bestInfo.label}`,
        message: `Outperforming genre norm by ${bSign}${best.delta.toFixed(1)} pts (${best.score.toFixed(1)}% vs ${best.norm.toFixed(1)}% norm). ${bestInfo.strength}`,
      });

      // 3. KEY OPTIMIZATION / WEAKEST DIMENSION (Lowest Delta)
      const worst = deltas[deltas.length - 1];
      const worstInfo = KPI_GUIDE[worst.key] || {
        label: worst.key.replace("_OLD", ""),
        strength: "",
        fix: "Underperforming genre norm. Optimize pacing, branding cues, and call-to-actions.",
      };
      const wSign = worst.delta >= 0 ? "+" : "";
      recs.push({
        type: worst.delta < 0 ? "warning" : "info",
        area: `Key Optimization: ${worstInfo.label}`,
        message: `Score is ${worst.score.toFixed(1)}% (${wSign}${worst.delta.toFixed(1)} pts vs ${worst.norm.toFixed(1)}% norm). ${worstInfo.fix}`,
      });
    }

    return recs;
  })();

  return (
    <div className="space-y-6">
      {/* Header & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href="/videos"
            className="p-2 bg-surface border border-border rounded-[6px] text-text-secondary hover:text-text-primary hover:bg-bg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
              {video.title}
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {video.campaign} • Uploaded {video.uploadedAt} • Duration {video.duration}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDeleteModalOpen(true)}
          disabled={isDeleting}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Report</span>
        </button>
      </div>

      {/* Top Banner Scorecard: Full 12 KPI Grid */}
      <div className="genesis-card p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-3 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pb-0">
          <ScoreGauge
            score={video.overallScore || 0}
            label={
              (video.overallScore || 0) >= 80
                ? "Exceptional • Top 10%"
                : (video.overallScore || 0) >= 65
                ? "Strong • Top 25%"
                : (video.overallScore || 0) >= 50
                ? "Moderate • Top 50%"
                : "Needs Optimization • Lower 50%"
            }
            size={130}
          />
        </div>

        <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {KPI_DEFINITIONS.map((item) => {
            const data = predictions[item.key];
            if (!data) return null;
            return (
              <KPICard
                key={item.key}
                label={item.label}
                score={Math.round(data.score)}
                delta={Math.round(data.score - data.genre_norm)}
                isPositive={data.score >= data.genre_norm}
              />
            );
          })}
        </div>
      </div>

      {/* 3 Real Benchmark Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TrendLineChart data={trendChartData} />
        <DistributionBarChart
          data={benchmarks?.distribution || []}
          totalRecords={benchmarks?.total_records || 17746}
          currentScore={video.overallScore || undefined}
        />
        <DimensionBarChart data={dimensionChartData} />
      </div>

      {/* Actionable Editorial Prescriptions: Exactly 3 Strategic Cards */}
      <div className="genesis-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider">
            Actionable Editorial Prescriptions (3 Key Vectors)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {computedRecommendations.map((rec, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-[8px] space-y-1.5 border ${
                rec.type === "success"
                  ? "bg-emerald-50/50 border-emerald-200/80 text-emerald-900"
                  : rec.type === "warning"
                  ? "bg-amber-50/50 border-amber-200/80 text-amber-900"
                  : "bg-indigo-50/50 border-indigo-200/80 text-indigo-900"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold font-display">
                {rec.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                ) : rec.type === "warning" ? (
                  <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-primary shrink-0" />
                )}
                <span>{rec.area}</span>
              </div>
              <p className="text-[12px] leading-relaxed opacity-90">
                {rec.message}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 13-KPI Scorecard Table with CQR Ranges & Norms */}
      <div className="genesis-card p-6 space-y-4">
        <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider">
          Full 13-KPI Benchmark Predictions vs. Genre Norm
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-text-secondary border-b border-border">
                <th className="pb-3 font-semibold">KPI Dimension</th>
                <th className="pb-3 font-semibold">Predicted Score</th>
                <th className="pb-3 font-semibold">80% Confidence Interval</th>
                <th className="pb-3 font-semibold">Genre Benchmark Norm</th>
                <th className="pb-3 font-semibold">Status vs. Norm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(predictions).map(([kpi, data]: [string, any]) => (
                <tr key={kpi} className="hover:bg-bg">
                  <td className="py-3 font-semibold text-text-primary">
                    {kpi.replace("_OLD", "")}
                  </td>
                  <td className="py-3 font-bold text-primary text-sm font-display">
                    {kpi === "ViewingDuration" ? `${data.score}s` : `${data.score}%`}
                  </td>
                  <td className="py-3 font-mono text-text-secondary">
                    [{data.interval[0]} – {data.interval[1]}]
                  </td>
                  <td className="py-3 font-medium text-text-secondary">
                    {kpi === "ViewingDuration" ? `${data.genre_norm}s` : `${data.genre_norm}%`}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-[4px] font-semibold text-[10px] ${
                        data.trend === "above"
                          ? "bg-emerald-50 text-status-success border border-emerald-200"
                          : data.trend === "below"
                          ? "bg-rose-50 text-status-error border border-rose-200"
                          : "bg-bg text-text-secondary border border-border"
                      }`}
                    >
                      {data.trend?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multimodal Telemetry Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="genesis-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-text-primary font-bold text-xs">
            <Eye className="w-4 h-4 text-primary" />
            <h4 className="font-display">Computer Vision Physics</h4>
          </div>
          <div className="space-y-2 text-xs divide-y divide-border">
            <div className="flex justify-between pt-1">
              <span className="text-text-secondary">Hook Motion (0-5s)</span>
              <span className="font-bold text-text-primary font-mono">{features.hook_motion || 0}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-text-secondary">Total Scene Cuts</span>
              <span className="font-bold text-text-primary font-mono">{features.cuts || 0} cuts</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-text-secondary">Shot Length Mean</span>
              <span className="font-bold text-text-primary font-mono">{features.shot_len_mean || 0}s</span>
            </div>
          </div>
        </div>

        <div className="genesis-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-text-primary font-bold text-xs">
            <Volume2 className="w-4 h-4 text-status-success" />
            <h4 className="font-display">Audio & Speech Pacing</h4>
          </div>
          <div className="space-y-2 text-xs divide-y divide-border">
            <div className="flex justify-between pt-1">
              <span className="text-text-secondary">Speech Ratio</span>
              <span className="font-bold text-text-primary font-mono">{Math.round((features.speech_ratio || 0) * 100)}%</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-text-secondary">Words Per Second</span>
              <span className="font-bold text-text-primary font-mono">{features.words_per_sec || 0} w/s</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-text-secondary">Total Word Count</span>
              <span className="font-bold text-text-primary font-mono">{features.word_count || 0} words</span>
            </div>
          </div>
        </div>

        <div className="genesis-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-text-primary font-bold text-xs">
            <Zap className="w-4 h-4 text-status-warning" />
            <h4 className="font-display">VLM Scene Semantics</h4>
          </div>
          <div className="space-y-2 text-xs divide-y divide-border">
            <div className="flex justify-between pt-1">
              <span className="text-text-secondary">Dominant Tone</span>
              <span className="font-bold text-text-primary capitalize">{features.dominant_tone || "neutral"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-text-secondary">Dominant Setting</span>
              <span className="font-bold text-text-primary capitalize">{features.dominant_setting || "indoor"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-text-secondary">Hook Opens With</span>
              <span className="font-bold text-text-primary capitalize">{features.hook_opens_with || "action"}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Delete Analysis Report"
        itemName={video.title}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
