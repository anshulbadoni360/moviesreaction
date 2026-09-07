"use client";

import React, { createContext, useContext, useState } from "react";

export type AnalysisStage =
  | "idle"
  | "uploading"
  | "extracting_cv"
  | "transcribing_audio"
  | "vlm_inference"
  | "predicting_kpis"
  | "completed"
  | "error";

interface AnalysisJob {
  id: string;
  title: string;
  stage: AnalysisStage;
  progress: number;
  stageMessage: string;
  result?: any;
  error?: string;
}

interface AnalysisContextType {
  activeJob: AnalysisJob | null;
  startAnalysis: (formData: FormData, title: string) => Promise<void>;
  dismissJob: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [activeJob, setActiveJob] = useState<AnalysisJob | null>(null);

  const startAnalysis = async (formData: FormData, title: string) => {
    const jobId = Math.random().toString(36).substring(7);

    setActiveJob({
      id: jobId,
      title,
      stage: "uploading",
      progress: 15,
      stageMessage: "Uploading video file...",
    });

    const stageTimer1 = setTimeout(() => {
      setActiveJob((prev) =>
        prev && prev.id === jobId
          ? { ...prev, stage: "extracting_cv", progress: 35, stageMessage: "Extracting motion, scene cuts & luminance..." }
          : prev
      );
    }, 1500);

    const stageTimer2 = setTimeout(() => {
      setActiveJob((prev) =>
        prev && prev.id === jobId
          ? { ...prev, stage: "transcribing_audio", progress: 55, stageMessage: "Transcribing speech & dialogue pacing (faster-whisper)..." }
          : prev
      );
    }, 4000);

    const stageTimer3 = setTimeout(() => {
      setActiveJob((prev) =>
        prev && prev.id === jobId
          ? { ...prev, stage: "vlm_inference", progress: 75, stageMessage: "Analyzing scene semantics on remote GPU (Qwen-VL)..." }
          : prev
      );
    }, 7000);

    const stageTimer4 = setTimeout(() => {
      setActiveJob((prev) =>
        prev && prev.id === jobId
          ? { ...prev, stage: "predicting_kpis", progress: 90, stageMessage: "Calculating 13 CQR audience KPI prediction intervals..." }
          : prev
      );
    }, 12000);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://172.28.112.1:8000";

    try {
      const response = await fetch(`${apiBase}/video/analyze`, {
        method: "POST",
        body: formData,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      clearTimeout(stageTimer4);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Server returned error (${response.status})`);
      }

      const data = await response.json();

      setActiveJob({
        id: jobId,
        title,
        stage: "completed",
        progress: 100,
        stageMessage: "Analysis complete!",
        result: data,
      });

      // Dispatch global event so all pages refresh their data smoothly without reload
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("monet_analysis_completed", { detail: data }));
      }
    } catch (err: any) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      clearTimeout(stageTimer4);

      setActiveJob({
        id: jobId,
        title,
        stage: "error",
        progress: 100,
        stageMessage: "Analysis failed",
        error: err.message || `Could not connect to backend on ${apiBase}`,
      });
    }
  };

  const dismissJob = () => {
    setActiveJob(null);
  };

  return (
    <AnalysisContext.Provider value={{ activeJob, startAnalysis, dismissJob }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
