"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ScoreBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { deleteVideoAnalysis, fetchVideoHistory } from "@/lib/api";
import { VideoStatus } from "@/types";
import { Search, Film, Loader2, Trash2 } from "lucide-react";
import { useAnalysis } from "@/context/AnalysisContext";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { cn } from "@/lib/utils";

type FilterTab = "All" | VideoStatus;

export default function VideosPage() {
  const { activeJob } = useAnalysis();
  const [videos, setVideos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [videoToDelete, setVideoToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadVideos = async () => {
    setIsLoading(true);
    const data = await fetchVideoHistory();
    setVideos(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadVideos();

    const handleCompleted = () => {
      loadVideos();
    };

    window.addEventListener("monet_analysis_completed", handleCompleted);
    return () => {
      window.removeEventListener("monet_analysis_completed", handleCompleted);
    };
  }, []);

  const openDeleteModal = (video: { id: string; title: string }, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoToDelete(video);
  };

  const handleConfirmDelete = async () => {
    if (!videoToDelete) return;
    try {
      setIsDeleting(true);
      await deleteVideoAnalysis(videoToDelete.id);
      setVideos((prev) => prev.filter((v) => v.id !== videoToDelete.id));
      setVideoToDelete(null);
    } catch (err) {
      alert("Failed to delete video report. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Merge in-memory active background analysis job with persisted history
  const allVideosList = useMemo(() => {
    const list = [...videos];
    if (activeJob && activeJob.stage !== "completed" && activeJob.stage !== "error") {
      list.unshift({
        id: `running-${activeJob.id}`,
        title: activeJob.title,
        campaign: "Campaign • Processing",
        status: (activeJob.stage === "uploading" ? "Uploading" : "Running") as VideoStatus,
        overallScore: undefined,
        percentileRank: "Analyzing...",
        uploadedAt: "Just now",
        duration: "Processing...",
        topStrength: activeJob.stageMessage,
        isRunning: true,
      });
    }
    return list;
  }, [videos, activeJob]);

  const counts = {
    All: allVideosList.length,
    Completed: allVideosList.filter((v) => v.status === "Completed").length,
    Running: allVideosList.filter((v) => v.status === "Running").length,
    Uploading: allVideosList.filter((v) => v.status === "Uploading").length,
    Failed: allVideosList.filter((v) => v.status === "Failed").length,
  };

  const filteredVideos = allVideosList.filter((video) => {
    const matchesTab = activeTab === "All" || video.status === activeTab;
    const matchesSearch =
      video.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.campaign?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
          All Videos
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage all uploaded creative assets and their multimodal audience predictions
        </p>
      </div>

      <div className="genesis-card p-6 space-y-6">
        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-bg border border-border rounded-[8px] overflow-x-auto">
            {(["All", "Completed", "Running", "Uploading", "Failed"] as FilterTab[]).map(
              (tab) => {
                const count = counts[tab as keyof typeof counts] || 0;
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-surface text-primary shadow-xs border border-border font-semibold"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <span>{tab}</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-[4px] text-[10px]",
                        isActive
                          ? "bg-indigo-50 text-primary font-semibold"
                          : "bg-border text-text-secondary"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title or campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-bg border border-border rounded-[6px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-neutral transition-colors"
            />
          </div>
        </div>

        {/* Video Table */}
        {filteredVideos.length === 0 ? (
          <div className="p-12 text-center bg-bg rounded-[8px] border border-dashed border-border space-y-2">
            <Film className="w-8 h-8 text-neutral mx-auto" />
            <p className="text-sm font-semibold text-text-primary">
              No videos in this tab
            </p>
            <p className="text-xs text-text-secondary">
              Upload a creative video from the top navigation to view results.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-text-secondary border-b border-border">
                  <th className="pb-3 font-semibold">Video</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-center">Overall Score</th>
                  <th className="pb-3 font-semibold">Percentile Rank</th>
                  <th className="pb-3 font-semibold">Uploaded</th>
                  <th className="pb-3 font-semibold">Duration</th>
                  <th className="pb-3 font-semibold">Stage / Top Strength</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVideos.map((video) => (
                  <tr
                    key={video.id}
                    className={`transition-colors ${
                      video.isRunning ? "bg-indigo-50/20" : "hover:bg-bg"
                    }`}
                  >
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="font-semibold text-text-primary line-clamp-1">
                          {video.title}
                        </p>
                        <p className="text-[11px] text-text-secondary">
                          {video.campaign}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <StatusBadge status={video.status} />
                    </td>
                    <td className="py-3.5 text-center">
                      <ScoreBadge score={video.overallScore} />
                    </td>
                    <td className="py-3.5 font-medium text-text-secondary">
                      {video.percentileRank || "—"}
                    </td>
                    <td className="py-3.5 text-text-secondary whitespace-nowrap">
                      <div>
                        <p>{video.uploadedAt?.split("•")[0]}</p>
                        <p className="text-[10px] text-neutral">
                          {video.uploadedAt?.split("•")[1]}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 text-text-secondary font-mono">
                      {video.duration}
                    </td>
                    <td className="py-3.5 font-medium text-text-primary">
                      {video.isRunning ? (
                        <span className="flex items-center gap-1.5 text-primary text-[11px]">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{video.topStrength}</span>
                        </span>
                      ) : (
                        video.topStrength || "—"
                      )}
                    </td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      {video.isRunning ? (
                        <span className="text-neutral text-xs font-mono">Processing</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/reports/${video.id}`}
                            className="genesis-btn-secondary inline-block px-3 py-1 text-xs"
                          >
                            View Report
                          </Link>
                          <button
                            onClick={(e) => openDeleteModal({ id: video.id, title: video.title }, e)}
                            title="Delete Report"
                            className="p-1.5 text-neutral hover:text-rose-600 hover:bg-rose-50 rounded-[4px] transition-colors border border-transparent hover:border-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!videoToDelete}
        title="Delete Analysis Report"
        itemName={videoToDelete?.title}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setVideoToDelete(null)}
      />
    </div>
  );
}
