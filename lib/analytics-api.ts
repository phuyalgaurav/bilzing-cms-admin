import { apiFetch } from "@/lib/api-client";

export type AnalyticsPeriod = 7 | 30 | 90 | 180 | 365;

export interface AnalyticsSummary {
  period: { days: AnalyticsPeriod; start: string; end: string };
  totals: {
    visitors: number;
    new_visitors: number;
    returning_visitors: number;
    sessions: number;
    page_views: number;
    pages_per_session: number;
    conversions: number;
    converted_visitors: number;
    conversion_rate: number;
    bounce_rate: number;
    engagement_rate: number;
    average_session_seconds: number;
  };
  previous_totals: AnalyticsSummary["totals"];
  comparison: Record<
    "visitors" | "sessions" | "page_views" | "converted_visitors" | "conversion_rate" | "engagement_rate" | "average_session_seconds",
    { current: number; previous: number; change_percent: number | null }
  >;
  trend: Array<{
    date: string;
    visitors: number;
    sessions: number;
    page_views: number;
    conversions: number;
    conversion_rate: number;
    module_activity: number;
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
  devices: Array<{ device: string; sessions: number; visitors: number }>;
  campaigns: Array<{
    campaign: string;
    source: string;
    sessions: number;
    visitors: number;
  }>;
  landing_pages: Array<{ path: string; sessions: number; visitors: number }>;
  funnel: Array<{ event_name: string; count: number }>;
  journey: Array<{ stage: string; count: number }>;
  events: Array<{ event_name: string; count: number }>;
  conversion_value: Array<{
    currency: string;
    value: number | string;
    conversions: number;
  }>;
  recent_conversions: Array<{
    event_name: string;
    occurred_at: string;
    path: string;
    source: string;
    utm_source: string;
    metadata: Record<string, unknown>;
  }>;
  module_totals: {
    records: number;
    created: number;
    active_modules: number;
  };
  modules: ModuleAnalytics[];
}

export interface ModuleAnalytics {
  key: string;
  label: string;
  description: string;
  total: number;
  created: number;
  previous_created: number;
  change_percent: number | null;
  published: number;
  statuses: Array<{ status: string; count: number }>;
  resources: Array<{ name: string; total: number; created: number }>;
  value_metric: { label: string; value: number } | null;
}

export function getAnalyticsSummary(days: AnalyticsPeriod, signal?: AbortSignal) {
  return apiFetch<AnalyticsSummary>(
    `/api/v1/admin/analytics/summary/?days=${days}`,
    { signal },
  );
}
