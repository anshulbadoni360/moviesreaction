import React from "react";
import { CheckCircle2, Clock, UploadCloud, AlertCircle } from "lucide-react";
import { VideoStatus } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: VideoStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "Completed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Completed
        </span>
      );
    case "Running":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          Running
        </span>
      );
    case "Uploading":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
          <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
          Uploading
        </span>
      );
    case "Failed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          Failed
        </span>
      );
    default:
      return null;
  }
}

interface ScoreBadgeProps {
  score?: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === undefined || score === null) {
    return <span className="text-slate-300 font-bold">—</span>;
  }

  const getStyle = (s: number) => {
    if (s >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s >= 70) return "bg-green-50 text-green-700 border-green-200";
    if (s >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-lg text-xs font-bold border",
        getStyle(score)
      )}
    >
      {score}
    </span>
  );
}
