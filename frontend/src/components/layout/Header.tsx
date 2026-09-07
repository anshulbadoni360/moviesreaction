"use client";

import React, { useState } from "react";
import { Calendar, Download, Plus, RefreshCw } from "lucide-react";
import { AnalyzeVideoModal } from "@/components/ui/AnalyzeVideoModal";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onAnalyzeSuccess?: () => void;
}

export function Header({ title, subtitle, onAnalyzeSuccess }: HeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </header>

      {/* Upload Modal */}
      <AnalyzeVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          if (onAnalyzeSuccess) onAnalyzeSuccess();
        }}
      />
    </>
  );
}
