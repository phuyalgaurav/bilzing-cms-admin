"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Clock3,
  Eye,
  MousePointerClick,
  RefreshCw,
  Users,
} from "lucide-react";

import { PageHeading } from "@/components/admin-shell/page-heading";
import { useTenant } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalyticsSummary, type AnalyticsPeriod, type AnalyticsSummary } from "@/lib/analytics-api";
import { cn } from "@/lib/utils";

const TrafficChart = dynamic(
  () => import("@/components/admin/analytics-trend-chart").then((module) => module.AnalyticsTrafficChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);
const ConversionChart = dynamic(
  () => import("@/components/admin/analytics-trend-chart").then((module) => module.AnalyticsConversionChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

const periods: AnalyticsPeriod[] = [7, 30, 90, 180, 365];
const formatNumber = new Intl.NumberFormat();

function duration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">New in this period</span>;
  const positive = value > 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", positive ? "text-emerald-700" : value < 0 ? "text-amber-700" : "text-muted-foreground")}>
      {value !== 0 ? <Icon className="size-3" /> : null}{Math.abs(value)}% vs previous
    </span>
  );
}

function Metric({ label, value, note, change, icon: Icon, loading }: { label: string; value: string; note: string; change: number | null; icon: typeof Users; loading: boolean }) {
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="grid size-8 place-items-center rounded-md bg-muted"><Icon className="size-4 text-muted-foreground" /></span>
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-24" /> : <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><Change value={change} /><span className="text-xs text-muted-foreground">{note}</span></div>
    </div>
  );
}

function RankedList({ rows, labelKey, valueKey = "sessions", valueLabel = "sessions", formatLabel = String }: { rows: Array<Record<string, string | number>>; labelKey: string; valueKey?: string; valueLabel?: string; formatLabel?: (value: string) => string }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);
  if (!rows.length) return <p className="py-12 text-center text-sm text-muted-foreground">No data in this period.</p>;
  return <div className="space-y-3">{rows.map((row, index) => <div key={`${row[labelKey]}-${index}`}><div className="mb-1.5 flex items-center justify-between gap-4 text-sm"><span className="min-w-0 truncate font-medium">{formatLabel(String(row[labelKey]))}</span><span className="shrink-0 tabular-nums">{formatNumber.format(Number(row[valueKey]))} <span className="text-xs text-muted-foreground">{valueLabel}</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/70" style={{ width: `${(Number(row[valueKey]) / max) * 100}%` }} /></div></div>)}</div>;
}

export default function AnalyticsPage() {
  const { config } = useTenant();
  const [days, setDays] = useState<AnalyticsPeriod>(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const enabled = config.enabled_modules.includes("analytics");

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getAnalyticsSummary(days, controller.signal)
      .then((data) => setSummary(data))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Analytics could not be loaded.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, enabled, revision]);

  const totals = summary?.totals;
  const comparison = summary?.comparison;
  const journeyMax = Math.max(...(summary?.journey.map((item) => item.count) ?? [1]), 1);

  const controls = enabled ? <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Refresh analytics" onClick={() => setRevision((value) => value + 1)} disabled={loading}><RefreshCw className={cn("size-4", loading && "animate-spin")} /></Button><Select value={String(days)} onValueChange={(value) => setDays(Number(value) as AnalyticsPeriod)}><SelectTrigger aria-label="Analytics period" className="w-40"><SelectValue /></SelectTrigger><SelectContent>{periods.map((period) => <SelectItem key={period} value={String(period)}>Last {period} days</SelectItem>)}</SelectContent></Select></div> : null;

  return <>
    <PageHeading title="Analytics" description="Understand who visits, what brings them in, what they view, and what converts." actions={controls} />

    {!enabled ? <Card><CardContent className="grid min-h-64 place-items-center text-center"><div className="max-w-md"><ChartNoAxesCombined className="mx-auto mb-3 size-7 text-muted-foreground" /><p className="font-medium">Analytics is not enabled</p><p className="mt-1 text-sm text-muted-foreground">Enable Analytics for this tenant in Django admin to collect site activity and reporting.</p></div></CardContent></Card> : error ? <Card><CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={() => setRevision((value) => value + 1)}>Try again</Button></CardContent></Card> : <>
      <section className="grid divide-y overflow-hidden rounded-lg border bg-card sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        <Metric label="Visitors" value={formatNumber.format(totals?.visitors ?? 0)} note={`${totals?.returning_visitors ?? 0} returning`} change={comparison?.visitors.change_percent ?? 0} icon={Users} loading={loading} />
        <Metric label="Page views" value={formatNumber.format(totals?.page_views ?? 0)} note={`${totals?.pages_per_session ?? 0} per session`} change={comparison?.page_views.change_percent ?? 0} icon={Eye} loading={loading} />
        <Metric label="Engagement rate" value={`${totals?.engagement_rate ?? 0}%`} note={`${totals?.bounce_rate ?? 0}% bounce`} change={comparison?.engagement_rate.change_percent ?? 0} icon={Activity} loading={loading} />
        <Metric label="Converted visitors" value={formatNumber.format(totals?.converted_visitors ?? 0)} note={`${totals?.conversion_rate ?? 0}% conversion`} change={comparison?.converted_visitors.change_percent ?? 0} icon={MousePointerClick} loading={loading} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Audience trend</CardTitle><p className="text-sm text-muted-foreground">Unique visitors and sessions by day.</p></CardHeader><CardContent className="h-80 pl-1">{loading || !summary ? <Skeleton className="h-full w-full" /> : <TrafficChart data={summary.trend} />}</CardContent></Card>
        <Card><CardHeader><CardTitle>Conversion trend</CardTitle><p className="text-sm text-muted-foreground">Completed actions and the daily visitor conversion rate.</p></CardHeader><CardContent className="h-80 pl-1">{loading || !summary ? <Skeleton className="h-full w-full" /> : <ConversionChart data={summary.trend} />}</CardContent></Card>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Visitor quality</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />Average session</span><strong className="tabular-nums">{duration(totals?.average_session_seconds ?? 0)}</strong></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">New visitors</span><strong className="tabular-nums">{formatNumber.format(totals?.new_visitors ?? 0)}</strong></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Returning visitors</span><strong className="tabular-nums">{formatNumber.format(totals?.returning_visitors ?? 0)}</strong></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Sessions</span><strong className="tabular-nums">{formatNumber.format(totals?.sessions ?? 0)}</strong></div></CardContent></Card>
        <Card><CardHeader><CardTitle>Devices</CardTitle><p className="text-sm text-muted-foreground">Sessions by first recorded device.</p></CardHeader><CardContent>{loading || !summary ? <Skeleton className="h-40 w-full" /> : <RankedList rows={summary.devices} labelKey="device" />}</CardContent></Card>
        <Card><CardHeader><CardTitle>Visitor journey</CardTitle><p className="text-sm text-muted-foreground">Distinct visitors progressing toward conversion.</p></CardHeader><CardContent className="space-y-4">{(summary?.journey ?? []).map((item) => <div key={item.stage}><div className="mb-1.5 flex justify-between text-sm"><span>{item.stage}</span><strong className="tabular-nums">{formatNumber.format(item.count)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(item.count / journeyMax) * 100}%` }} /></div></div>)}</CardContent></Card>
      </section>

      <section className="mt-7"><div className="mb-4"><h2 className="text-lg font-semibold">Acquisition</h2><p className="mt-1 text-sm text-muted-foreground">Where sessions begin and which campaigns attract visitors.</p></div><div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Traffic sources</CardTitle></CardHeader><CardContent>{loading || !summary ? <Skeleton className="h-56 w-full" /> : <RankedList rows={summary.sources} labelKey="source" valueKey="visits" />}</CardContent></Card><Card><CardHeader><CardTitle>Campaigns</CardTitle></CardHeader><CardContent>{loading || !summary ? <Skeleton className="h-56 w-full" /> : summary.campaigns.length ? <div className="divide-y">{summary.campaigns.map((item) => <div key={item.campaign} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.campaign}</p><p className="truncate text-xs text-muted-foreground">{item.source}</p></div><div className="text-right"><p className="text-sm font-medium tabular-nums">{formatNumber.format(item.sessions)}</p><p className="text-xs text-muted-foreground">sessions</p></div></div>)}</div> : <p className="py-12 text-center text-sm text-muted-foreground">No tagged campaigns in this period.</p>}</CardContent></Card></div></section>

      <section className="mt-7"><div className="mb-4"><h2 className="text-lg font-semibold">Content</h2><p className="mt-1 text-sm text-muted-foreground">Pages that attract traffic and the landing pages that start sessions.</p></div><div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Top pages</CardTitle></CardHeader><CardContent>{loading || !summary ? <Skeleton className="h-56 w-full" /> : <RankedList rows={summary.top_pages} labelKey="path" valueKey="views" valueLabel="views" />}</CardContent></Card><Card><CardHeader><CardTitle>Landing pages</CardTitle></CardHeader><CardContent>{loading || !summary ? <Skeleton className="h-56 w-full" /> : <RankedList rows={summary.landing_pages} labelKey="path" />}</CardContent></Card></div></section>

      <section className="mt-7"><div className="mb-4"><h2 className="text-lg font-semibold">Conversion activity</h2><p className="mt-1 text-sm text-muted-foreground">Which actions visitors complete and the total tracked value.</p></div><div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><Card><CardHeader><CardTitle>Conversion actions</CardTitle></CardHeader><CardContent>{loading || !summary ? <Skeleton className="h-52 w-full" /> : <RankedList rows={summary.funnel} labelKey="event_name" valueKey="count" valueLabel="actions" formatLabel={(value) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} />}</CardContent></Card><Card><CardHeader><CardTitle>Tracked value</CardTitle></CardHeader><CardContent>{summary?.conversion_value.length ? <div className="space-y-4">{summary.conversion_value.map((item) => <div key={item.currency || "unspecified"} className="flex items-end justify-between gap-4"><div><p className="text-xs text-muted-foreground">{item.currency || "No currency"}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber.format(Number(item.value))}</p></div><span className="text-xs text-muted-foreground">{item.conversions} valued actions</span></div>)}</div> : <div className="grid min-h-40 place-items-center text-center"><div><MousePointerClick className="mx-auto mb-2 size-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">No conversion values were sent.</p></div></div>}</CardContent></Card></div></section>

    </>}
  </>;
}
