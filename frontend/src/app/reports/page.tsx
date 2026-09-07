"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { ScoreBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { fetchVideoHistory } from "@/lib/api";
import { ArrowRight, Film } from "lucide-react";

export default function ReportsIndexPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchVideoHistory();
    setHistory(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <Header
        title="Intelligence Reports"
        subtitle="Audience response scorecards, percentile ranks, and creative prescriptions"
        onAnalyzeSuccess={loadData}
      />

      {history.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <Film className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            No intelligence reports available
          </p>
          <p className="text-xs text-slate-400">
            Upload a video via the Dashboard or click &quot;Analyze Video&quot; above to generate your first audience scorecard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((video) => (
            <div
              key={video.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={video.status} />
                  <ScoreBadge score={video.overallScore} />
                </div>

                <div className="mt-4">
                  <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                    {video.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {video.campaign} • {video.duration}
                  </p>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Percentile Rank</span>
                    <span className="font-bold text-slate-900">
                      {video.percentileRank || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Top Strength</span>
                    <span className="font-bold text-blue-600">
                      {video.topStrength || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={`/reports/${video.id}`}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>View Full Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
