import { apiFetch } from "@/lib/api-client";

export type AnalyticsPeriod = 7 | 30 | 90 | 180 | 365;

export interface AnalyticsSummary {
  period: { days: AnalyticsPeriod; start: string; end: string };
  totals: {
    visitors: number;
    sessions: number;
    page_views: number;
    conversions: number;
    conversion_rate: number;
    bounce_rate: number;
  };
  trend: Array<{
    date: string;
    visitors: number;
    page_views: number;
    conversions: number;
  }>;
  top_pages: Array<{
    path: string;
    page_title: string;
    views: number;
    visitors: number;
  }>;
  sources: Array<{
    source: string;
    visits: number;
    visitors: number;
  }>;
  funnel: Array<{ event_name: string; count: number }>;
  recent_conversions: Array<{
    event_name: string;
    occurred_at: string;
    path: string;
    source: string;
    utm_source: string;
    metadata: Record<string, unknown>;
  }>;
}

export function getAnalyticsSummary(days: AnalyticsPeriod) {
  return apiFetch<AnalyticsSummary>(`/api/v1/admin/analytics/summary/?days=${days}`);
}
