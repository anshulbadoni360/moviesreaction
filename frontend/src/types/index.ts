export type VideoStatus = "Completed" | "Running" | "Uploading" | "Failed";

export interface VideoItem {
  id: string;
  title: string;
  campaign: string;
  status: VideoStatus;
  overallScore?: number;
  percentileRank?: string;
  uploadedAt: string;
  duration: string;
  topStrength?: string;
  topOpportunity?: string;
  thumbnailUrl: string;
}

export interface KPIMetric {
  id: string;
  label: string;
  score: number;
  delta: number;
  isPositive: boolean;
  benchmark?: number;
}

export interface ScoreDistributionItem {
  range: string;
  percentage: number;
  isHighlighted?: boolean;
}

export interface DimensionScoreItem {
  dimension: string;
  thisVideo: number;
  datasetAverage: number;
}

export interface TrendPoint {
  dimension: string;
  thisVideo: number;
  datasetAverage: number;
}
