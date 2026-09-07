import React from "react";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  sublabel?: string;
  size?: number;
}

export function ScoreGauge({
  score = 0,
  label,
  sublabel = "/100",
  size = 130,
}: ScoreGaugeProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Choose stroke and label colors based on score
  const strokeColor =
    score >= 65 ? "#6366F1" : score >= 50 ? "#D97706" : "#E11D48";
  const badgeBg =
    score >= 65
      ? "bg-indigo-50 text-primary border-indigo-100"
      : score >= 50
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          className="w-full h-full -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E8E8EC"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Score */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline">
            <span className="font-display text-3xl font-bold text-text-primary tracking-tight">
              {score > 0 ? score : "—"}
            </span>
            {score > 0 && (
              <span className="text-xs font-medium text-text-secondary ml-0.5 font-mono">
                {sublabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clean Status Label Pill below the gauge (never clips) */}
      {label && (
        <div className="mt-2 text-center">
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${badgeBg}`}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
