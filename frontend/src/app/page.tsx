"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { KPICard } from "@/components/ui/KPICard";
import { ScoreBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { DistributionBarChart } from "@/components/charts/DistributionBarChart";
import { DimensionBarChart } from "@/components/charts/DimensionBarChart";
import { fetchBenchmarkNorms, fetchVideoHistory } from "@/lib/api";
import { AnalyzeVideoModal } from "@/components/ui/AnalyzeVideoModal";
import { ArrowRight, Sparkles, TrendingUp, Target, Zap, Film, Plus } from "lucide-react";

export default function OverviewPage() {
  const [benchmarks, setBenchmarks] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [normData, histData] = await Promise.all([
        fetchBenchmarkNorms(),
        fetchVideoHistory(),
      ]);
      if (normData) setBenchmarks(normData);
      if (histData) setHistory(histData);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for background analysis completion and auto-refresh smoothly
    const handleCompleted = () => {
      loadData();
    };

    window.addEventListener("monet_analysis_completed", handleCompleted);
    return () => {
      window.removeEventListener("monet_analysis_completed", handleCompleted);
    };
  }, []);

  const latestVideo = history.length > 0 ? history[0] : null;
  const predictions = latestVideo?.details?.predictions || null;
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

  const overallScore = latestVideo
    ? Math.round(predictions?.BREAKTHROUGH_OLD?.score || predictions?.HookingPower?.score || 0)
    : null;

  // Real Dimension Chart Data
  const dimensionChartData = KPI_DEFINITIONS.map((item) => {
    const datasetAvg = kpiAverages[item.key] ? Math.round(kpiAverages[item.key]) : 50;
    const thisVideoScore = predictions && predictions[item.key]
      ? Math.round(predictions[item.key].score)
      : datasetAvg;

    return {
      dimension: item.label,
      thisVideo: thisVideoScore,
      datasetAverage: datasetAvg,
    };
  });

  // Real Trend Chart Data
  const trendChartData = [
    {
      dimension: "Hooking Power",
      thisVideo: predictions?.HookingPower ? Math.round(predictions.HookingPower.score) : Math.round(kpiAverages.HookingPower || 51),
      datasetAverage: Math.round(kpiAverages.HookingPower || 51),
    },
    {
      dimension: "Recall",
      thisVideo: predictions?.AidedRecall ? Math.round(predictions.AidedRecall.score) : Math.round(kpiAverages.AidedRecall || 54),
      datasetAverage: Math.round(kpiAverages.AidedRecall || 54),
    },
    {
      dimension: "Engagement",
      thisVideo: predictions?.Interest ? Math.round(predictions.Interest.score) : Math.round(kpiAverages.Interest || 38),
      datasetAverage: Math.round(kpiAverages.Interest || 38),
    },
    {
      dimension: "Action",
      thisVideo: predictions?.ACTION ? Math.round(predictions.ACTION.score) : Math.round(kpiAverages.ACTION || 58),
      datasetAverage: Math.round(kpiAverages.ACTION || 58),
    },
    {
      dimension: "Intent",
      thisVideo: predictions?.BuyTicket ? Math.round(predictions.BuyTicket.score) : Math.round(kpiAverages.BuyTicket || 28),
      datasetAverage: Math.round(kpiAverages.BuyTicket || 28),
    },
  ];

  if (isInitialLoading) {
    return (
      <div className="p-12 text-center text-text-secondary text-sm font-medium">
        Loading intelligence dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
            Video Intelligence Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Benchmarked against {benchmarks?.total_records?.toLocaleString() || "17,746"} real titles in <code className="text-xs bg-bg px-1.5 py-0.5 rounded-[4px] border border-border">norms_data.csv</code>
          </p>
        </div>
      </div>

      {/* Main Content: If no video is analyzed, show clean Genesis Hero Card */}
      {!latestVideo ? (
        <div className="genesis-card p-12 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-12 h-12 rounded-[12px] bg-bg border border-border flex items-center justify-center mx-auto text-primary shadow-2xs">
            <Film className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-bold text-text-primary">
              No Video Analyzed Yet
            </h2>
            <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
              Upload a video ad or movie trailer to run the multimodal AI pipeline (CV, Audio, VLM & CQR) and view live audience performance scorecards.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="genesis-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm shadow-btn-glow"
            >
              <Plus className="w-4 h-4" />
              <span>Analyze Your First Video</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Top Performance & 12 KPI Grid */}
          <div className="genesis-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-text-primary uppercase tracking-wider">
                  Overall Performance
                </span>
                <span className="text-xs text-text-secondary">
                  ({latestVideo.title})
                </span>
              </div>
              <span className="text-[12px] text-text-secondary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Monet VLM + CQR Multimodal Engine</span>
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Circular Score Gauge */}
              <div className="lg:col-span-3 flex justify-center border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pb-0">
                <ScoreGauge
                  score={overallScore || 0}
                  label={
                    (overallScore || 0) >= 80
                      ? "Exceptional"
                      : (overallScore || 0) >= 65
                      ? "Strong"
                      : (overallScore || 0) >= 50
                      ? "Moderate"
                      : "Needs Optimization"
                  }
                />
              </div>

              {/* 12 KPI Grid */}
              <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {KPI_DEFINITIONS.map((item) => {
                  const hasVal = predictions && predictions[item.key] !== undefined;
                  const val = hasVal ? Math.round(predictions[item.key].score) : null;
                  const avg = kpiAverages[item.key] || 50;
                  const delta = hasVal ? Math.round(predictions[item.key].score - avg) : 0;
                  const isPositive = delta >= 0;

                  return (
                    <KPICard
                      key={item.key}
                      label={item.label}
                      score={val}
                      delta={hasVal ? delta : 0}
                      isPositive={isPositive}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Real Graphs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TrendLineChart data={trendChartData} />
            <DistributionBarChart
              data={benchmarks?.distribution || []}
              totalRecords={benchmarks?.total_records || 17746}
              currentScore={overallScore || undefined}
            />
            <DimensionBarChart data={dimensionChartData} />
          </div>

          {/* Bottom Section: Recent Analyses + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Recent Videos Table (8 cols) */}
            <div className="lg:col-span-8 genesis-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider">
                    Recent Video Analyses
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {history.length} video analysis run(s) recorded
                  </p>
                </div>
                <Link
                  href="/videos"
                  className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
                >
                  <span>View all videos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-text-secondary border-b border-border">
                      <th className="pb-3 font-semibold">Video</th>
                      <th className="pb-3 font-semibold">Uploaded</th>
                      <th className="pb-3 font-semibold">Duration</th>
                      <th className="pb-3 font-semibold text-center">Score</th>
                      <th className="pb-3 font-semibold">Rank</th>
                      <th className="pb-3 font-semibold">Top Strength</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.slice(0, 5).map((video) => (
                      <tr key={video.id} className="hover:bg-bg transition-colors">
                        <td className="py-3">
                          <p className="font-semibold text-text-primary line-clamp-1">
                            {video.title}
                          </p>
                          <p className="text-[11px] text-text-secondary">
                            {video.campaign}
                          </p>
                        </td>
                        <td className="py-3 text-text-secondary whitespace-nowrap">
                          {video.uploadedAt?.split("•")[0]}
                        </td>
                        <td className="py-3 text-text-secondary font-mono">
                          {video.duration}
                        </td>
                        <td className="py-3 text-center">
                          <ScoreBadge score={video.overallScore} />
                        </td>
                        <td className="py-3 font-medium text-text-secondary">
                          {video.percentileRank || "—"}
                        </td>
                        <td className="py-3 font-medium text-text-primary">
                          {video.topStrength || "—"}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={video.status} />
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/reports/${video.id}`}
                            className="text-xs font-semibold text-primary hover:text-primary-hover"
                          >
                            View Report
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insights Panel (4 cols) */}
            <div className="lg:col-span-4 genesis-card p-6 space-y-4">
              <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider">
                norms_data.csv Insights
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 bg-bg border border-border rounded-[8px] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-[6px] bg-indigo-50 text-primary flex items-center justify-center shrink-0">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">
                      Norms Baseline
                    </h4>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                      Calibrated against {benchmarks?.total_records?.toLocaleString() || "17,746"} real title responses in norms_data.csv.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-bg border border-border rounded-[8px] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-[6px] bg-emerald-50 text-status-success flex items-center justify-center shrink-0">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">
                      Conformal Coverage
                    </h4>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                      CQR quantile intervals calibrated to provide mathematically guaranteed 80% coverage.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-bg border border-border rounded-[8px] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-[6px] bg-amber-50 text-status-warning flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">
                      Multimodal Telemetry
                    </h4>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                      Physics (OpenCV), Speech (faster-whisper), and Semantics (Qwen-VL on GPU).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <AnalyzeVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
