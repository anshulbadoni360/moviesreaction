"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendLineChartProps {
  data: Array<{ dimension: string; thisVideo: number; datasetAverage: number }>;
}

export function TrendLineChart({ data }: TrendLineChartProps) {
  return (
    <div className="genesis-card p-5 flex flex-col justify-between h-[300px]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-display text-sm font-bold text-text-primary">
            Score Trend vs. All Videos
          </h3>
          <p className="text-[12px] text-text-secondary">
            Multi-stage audience trajectory vs dataset norms
          </p>
        </div>
        <span className="text-[11px] font-medium text-text-secondary bg-bg px-2.5 py-1 rounded-[6px] border border-border text-nowrap">
          Model Benchmark
        </span>
      </div>

      <div className="w-full flex-1 min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F6" />
            <XAxis
              dataKey="dimension"
              tick={{ fontSize: 11, fill: "#6B6B6B" }}
              axisLine={{ stroke: "#E8E8EC" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#6B6B6B" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(val: any, name: any) => [`${val}%`, name]}
              contentStyle={{
                backgroundColor: "#0A0A0A",
                borderRadius: "6px",
                border: "none",
                fontSize: "12px",
                color: "#FFFFFF",
              }}
            />
            <Line
              type="monotone"
              dataKey="datasetAverage"
              stroke="#9C9C9C"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#9C9C9C" }}
              name="Dataset Norm"
            />
            <Line
              type="monotone"
              dataKey="thisVideo"
              stroke="#6366F1"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#6366F1" }}
              activeDot={{ r: 6 }}
              name="This Creative"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Clean Genesis Legend matching the actual chart */}
      <div className="flex items-center justify-center gap-6 pt-2 border-t border-border text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-primary rounded-full inline-block" />
          <span className="w-2 h-2 rounded-full bg-primary -ml-3.5 inline-block" />
          <span className="font-semibold text-text-primary">This Creative</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-0.5 border-t border-dashed border-neutral inline-block" />
          <span className="text-text-secondary">Dataset Norm (17,746 Titles)</span>
        </div>
      </div>
    </div>
  );
}
