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
} from "recharts";

interface DimensionBarChartProps {
  data: Array<{ dimension: string; thisVideo: number; datasetAverage: number }>;
}

export function DimensionBarChart({ data }: DimensionBarChartProps) {
  return (
    <div className="genesis-card p-5 flex flex-col justify-between h-[300px]">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-display text-sm font-bold text-text-primary">
            Score by Dimension vs. Dataset
          </h3>
          <p className="text-[12px] text-text-secondary">
            Comparison against training data mean
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            <span className="text-text-primary font-medium">Video</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-neutral inline-block" />
            <span className="text-text-secondary font-medium text-nowrap">Dataset Avg</span>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 20, left: 45, bottom: 0 }}
            barCategoryGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F4F4F6" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#6B6B6B" }}
              axisLine={{ stroke: "#E8E8EC" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="dimension"
              tick={{ fontSize: 10, fill: "#0A0A0A" }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0A0A0A",
                borderRadius: "6px",
                border: "none",
                fontSize: "12px",
                color: "#FFFFFF",
              }}
            />
            <Bar
              dataKey="thisVideo"
              fill="#6366F1"
              radius={[0, 3, 3, 0]}
              barSize={6}
              name="This Video"
            />
            <Bar
              dataKey="datasetAverage"
              fill="#E8E8EC"
              radius={[0, 3, 3, 0]}
              barSize={6}
              name="Dataset Average"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
