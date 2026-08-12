"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Activity, ChartNoAxesCombined, Eye, Layers3, MousePointerClick, Search, Users } from "lucide-react";

import { ModuleAnalyticsCard } from "@/components/admin/module-analytics-card";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { useTenant } from "@/components/providers/app-providers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalyticsSummary, type AnalyticsPeriod, type AnalyticsSummary } from "@/lib/analytics-api";

const AnalyticsTrendChart = dynamic(
  () => import("@/components/admin/analytics-trend-chart").then((module) => module.AnalyticsTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

const periods: AnalyticsPeriod[] = [7, 30, 90, 180, 365];
const formatNumber = new Intl.NumberFormat();

function Metric({ label, value, note, icon: Icon, loading }: { label: string; value: string; note: string; icon: typeof Users; loading: boolean }) {
  return <div className="border-b p-4 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:last:border-r-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">{label}</p>{loading ? <Skeleton className="mt-2 h-8 w-20" /> : <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>}<p className="mt-1 text-xs text-muted-foreground">{note}</p></div><Icon className="size-4 text-muted-foreground" /></div></div>;
}

export default function AnalyticsPage() {
  const { config } = useTenant();
  const [days, setDays] = useState<AnalyticsPeriod>(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const enabled = config.enabled_modules.includes("analytics");

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getAnalyticsSummary(days)
      .then((data) => { if (!controller.signal.aborted) setSummary(data); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Analytics could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, enabled]);

  const modules = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (summary?.modules ?? []).filter((module) => !normalized || module.label.toLowerCase().includes(normalized) || module.description.toLowerCase().includes(normalized));
  }, [query, summary]);
  const totals = summary?.totals;
  const moduleTotals = summary?.module_totals;

  return <>
    <PageHeading title="Analytics" description="Website performance and operational reporting for every enabled module." actions={enabled ? <Select value={String(days)} onValueChange={(value) => setDays(Number(value) as AnalyticsPeriod)}><SelectTrigger aria-label="Analytics period"><SelectValue /></SelectTrigger><SelectContent>{periods.map((period) => <SelectItem key={period} value={String(period)}>Last {period} days</SelectItem>)}</SelectContent></Select> : null} />

    {!enabled ? <Card><CardContent className="grid min-h-64 place-items-center text-center"><div className="max-w-md"><ChartNoAxesCombined className="mx-auto mb-3 size-7 text-muted-foreground" /><p className="font-medium">Analytics is not enabled</p><p className="mt-1 text-sm text-muted-foreground">Enable Analytics for this tenant in Django admin to collect site activity and open module reporting.</p></div></CardContent></Card> : error ? <Card><CardContent className="p-5 text-sm text-destructive">{error} Refresh the page or check the CMS API connection.</CardContent></Card> : <>
      <section className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Visitors" value={formatNumber.format(totals?.visitors ?? 0)} note={`${formatNumber.format(totals?.sessions ?? 0)} sessions`} icon={Users} loading={loading} />
        <Metric label="Page views" value={formatNumber.format(totals?.page_views ?? 0)} note={`${totals?.bounce_rate ?? 0}% bounce rate`} icon={Eye} loading={loading} />
        <Metric label="Conversions" value={formatNumber.format(totals?.conversions ?? 0)} note={`${totals?.conversion_rate ?? 0}% of visitors`} icon={MousePointerClick} loading={loading} />
        <Metric label="New records" value={formatNumber.format(moduleTotals?.created ?? 0)} note={`${formatNumber.format(moduleTotals?.records ?? 0)} across ${moduleTotals?.active_modules ?? 0} modules`} icon={Layers3} loading={loading} />
      </section>

      <Card className="mt-5">
        <CardHeader><CardTitle>Activity over time</CardTitle><p className="text-sm text-muted-foreground">Traffic, conversions, and new operational records. Hover for exact daily values.</p></CardHeader>
        <CardContent className="h-80 pl-2">{loading || !summary ? <Skeleton className="h-full w-full" /> : <AnalyticsTrendChart data={summary.trend} includeModuleActivity />}</CardContent>
      </Card>

      <section className="mt-7">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Module performance</h2><p className="mt-1 text-sm text-muted-foreground">Live counts, period growth, workflow status, and module-specific value metrics.</p></div><div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a module" aria-label="Find a module" className="pl-9" /></div></div>
        {loading ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-80 w-full" />)}</div> : modules.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{modules.map((module) => <ModuleAnalyticsCard key={module.key} module={module} />)}</div> : <Card><CardContent className="grid min-h-44 place-items-center text-center text-sm text-muted-foreground"><div><Activity className="mx-auto mb-2 size-5" />No modules match this search.</div></CardContent></Card>}
      </section>
    </>}
  </>;
}
