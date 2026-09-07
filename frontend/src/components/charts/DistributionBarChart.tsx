"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DistributionBarChartProps {
  data: Array<{ range: string; percentage: number; isHighlighted?: boolean }>;
  totalRecords: number;
  currentScore?: number;
}

export function DistributionBarChart({
  data,
  totalRecords,
  currentScore,
}: DistributionBarChartProps) {
  // Dynamically calculate which bucket corresponds to the analyzed video's score
  const isBucketActive = (range: string) => {
    if (currentScore === undefined || currentScore === null) {
      return range === "40-60"; // Default median baseline
    }
    const score = Number(currentScore);
    if (range === "0-20") return score < 20;
    if (range === "20-40") return score >= 20 && score < 40;
    if (range === "40-60") return score >= 40 && score < 60;
    if (range === "60-80") return score >= 60 && score < 80;
    if (range === "80-100") return score >= 80;
    return false;
  };

  return (
    <div className="genesis-card p-5 flex flex-col justify-between h-[300px]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-display text-sm font-bold text-text-primary">
            Score Distribution (Overall Score)
          </h3>
          <p className="text-[12px] text-text-secondary">
            Training baseline: {totalRecords.toLocaleString()} benchmark titles
          </p>
        </div>
      </div>

      <div className="w-full flex-1 min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F6" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 11, fill: "#6B6B6B" }}
              axisLine={{ stroke: "#E8E8EC" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "#6B6B6B" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(val: any) => [`${val}%`, "Videos"]}
              contentStyle={{
                backgroundColor: "#0A0A0A",
                borderRadius: "6px",
                border: "none",
                fontSize: "12px",
                color: "#FFFFFF",
              }}
            />
            <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                const active = isBucketActive(entry.range);
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={active ? "#6366F1" : "#C7D2FE"}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-border text-center">
        <span className="text-[11px] font-semibold text-primary bg-indigo-50/60 px-3 py-1 rounded-full border border-indigo-100">
          {currentScore
            ? `Analyzed video score (${currentScore}) highlighted in Indigo`
            : `Distribution across ${totalRecords.toLocaleString()} videos in norms_data.csv`}
        </span>
      </div>
    </div>
  );
}
