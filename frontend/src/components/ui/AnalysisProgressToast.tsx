"use client";

import React from "react";
import Link from "next/link";
import { useAnalysis } from "@/context/AnalysisContext";
import {
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export function AnalysisProgressToast() {
  const { activeJob, dismissJob } = useAnalysis();

  if (!activeJob) return null;

  const isCompleted = activeJob.stage === "completed";
  const isError = activeJob.stage === "error";
  const overallScore = activeJob.result?.predictions
    ? Math.round(
        activeJob.result.predictions.BREAKTHROUGH_OLD?.score ||
        activeJob.result.predictions.HookingPower?.score ||
        0
      )
    : null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="genesis-card p-4 shadow-xl border border-border bg-surface">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <div className="w-7 h-7 rounded-[6px] bg-emerald-50 text-status-success flex items-center justify-center shrink-0 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : isError ? (
              <div className="w-7 h-7 rounded-[6px] bg-rose-50 text-status-error flex items-center justify-center shrink-0 border border-rose-100">
                <AlertCircle className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-[6px] bg-indigo-50 text-primary flex items-center justify-center shrink-0 border border-indigo-100">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-text-primary line-clamp-1 font-display">
                {activeJob.title}
              </h4>
              <p className="text-[11px] text-text-secondary">
                {activeJob.stageMessage}
              </p>
            </div>
          </div>

          <button
            onClick={dismissJob}
            className="text-neutral hover:text-text-primary p-1 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Bar (while active) */}
        {!isCompleted && !isError && (
          <div className="mt-3 space-y-1.5">
            <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${activeJob.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-neutral font-mono">
              <span>Multimodal Pipeline</span>
              <span>{activeJob.progress}%</span>
            </div>
          </div>
        )}

        {/* Success Action */}
        {isCompleted && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-text-secondary">Score:</span>
              <span className="font-display font-bold text-xs text-primary">
                {overallScore ? `${overallScore}/100` : "Ready"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  dismissJob();
                  window.location.reload();
                }}
                className="text-[11px] font-medium text-text-secondary hover:text-text-primary"
              >
                Refresh
              </button>
              <Link
                href="/videos"
                onClick={dismissJob}
                className="genesis-btn-primary px-3 py-1 text-[11px] flex items-center gap-1"
              >
                <span>View Videos</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Error Detail */}
        {isError && (
          <div className="mt-2 text-[11px] text-status-error bg-rose-50/50 p-2 rounded-[6px] border border-rose-100">
            {activeJob.error}
          </div>
        )}
      </div>
    </div>
  );
}
