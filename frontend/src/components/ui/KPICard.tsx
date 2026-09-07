import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  score?: number | null;
  delta?: number;
  isPositive?: boolean;
  className?: string;
}

export function KPICard({
  label,
  score,
  delta = 0,
  isPositive = true,
  className,
}: KPICardProps) {
  const hasScore = score !== undefined && score !== null && !isNaN(score);

  return (
    <div
      className={cn(
        "genesis-card p-4 flex flex-col justify-between select-none",
        className
      )}
    >
      <span className="text-[12px] font-medium text-text-secondary line-clamp-1">
        {label}
      </span>
      <div className="flex items-baseline justify-between mt-2">
        <span className="font-display text-2xl font-bold text-text-primary tracking-tight">
          {hasScore ? score : "—"}
        </span>
        {hasScore && delta !== 0 && (
          <div
            className={cn(
              "flex items-center text-[11px] font-semibold",
              isPositive ? "text-status-success" : "text-status-error"
            )}
          >
            {isPositive ? (
              <ArrowUp className="w-3 h-3 stroke-[2.5]" />
            ) : (
              <ArrowDown className="w-3 h-3 stroke-[2.5]" />
            )}
            <span>{Math.abs(delta)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
