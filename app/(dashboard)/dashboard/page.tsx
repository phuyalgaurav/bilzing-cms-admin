"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Eye,
  MousePointerClick,
  Route,
  Users,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

import { PageHeading } from "@/components/admin-shell/page-heading";
import { useTenant } from "@/components/providers/app-providers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAnalyticsSummary,
  type AnalyticsPeriod,
  type AnalyticsSummary,
} from "@/lib/analytics-api";
import { moduleExperience, modulePrimaryPath } from "@/lib/module-experience";

const AnalyticsTrendChart = dynamic(
  () =>
    import("@/components/admin/analytics-trend-chart").then(
      (module) => module.AnalyticsTrendChart,
    ),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

const periods: AnalyticsPeriod[] = [7, 30, 90, 180, 365];
const builtInModules = new Set([
  "website_pages",
  "media_library",
  "user_management",
  "analytics",
]);

const formatNumber = new Intl.NumberFormat();

function eventLabel(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Users;
  loading: boolean;
}) {
  return (
    <div className="border-b p-4 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:last:border-r-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
        <Icon className="size-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { config } = useTenant();
  const [days, setDays] = useState<AnalyticsPeriod>(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const analyticsEnabled = config.enabled_modules.includes("analytics");
  const widgets = new Set(config.dashboard_widgets);
  const operationalModules = useMemo(
    () =>
      config.enabled_modules
        .filter((moduleKey) => !builtInModules.has(moduleKey))
        .map((moduleKey) => ({
          key: moduleKey,
          experience: moduleExperience(moduleKey),
        })),
    [config.enabled_modules],
  );

  useEffect(() => {
    if (!analyticsEnabled) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    getAnalyticsSummary(days)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Analytics could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [analyticsEnabled, days]);

  const totals = summary?.totals;

  return (
    <>
      <PageHeading
        title="Site analytics"
        description="Traffic, engagement, and CRM activity from your consumer site."
        actions={
          analyticsEnabled ? (
            <Select value={String(days)} onValueChange={(value) => setDays(Number(value) as AnalyticsPeriod)}>
              <SelectTrigger aria-label="Analytics period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period} value={String(period)}>
                    Last {period} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {!analyticsEnabled ? (
        <Card>
          <CardContent className="grid min-h-56 place-items-center text-center">
            <div className="max-w-md">
              <Activity className="mx-auto mb-3 size-7 text-muted-foreground" />
              <p className="font-medium">Analytics is not enabled</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enable the Analytics module for this tenant in Django admin to collect consumer-site activity.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">
            {error} Refresh the page or check the CMS API connection.
          </CardContent>
        </Card>
      ) : (
        <>
          {widgets.has("stats") ? (
            <section className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Visitors" value={formatNumber.format(totals?.visitors ?? 0)} note={`${formatNumber.format(totals?.sessions ?? 0)} sessions`} icon={Users} loading={loading} />
              <MetricCard label="Page views" value={formatNumber.format(totals?.page_views ?? 0)} note={`${totals?.bounce_rate ?? 0}% bounce rate`} icon={Eye} loading={loading} />
              <MetricCard label="Conversions" value={formatNumber.format(totals?.conversions ?? 0)} note="CRM actions completed" icon={MousePointerClick} loading={loading} />
              <MetricCard label="Conversion rate" value={`${totals?.conversion_rate ?? 0}%`} note="Conversions per visitor" icon={Route} loading={loading} />
            </section>
          ) : null}

          <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Visitor trend</CardTitle>
                <p className="text-sm text-muted-foreground">Daily visitors and completed conversion actions.</p>
              </CardHeader>
              <CardContent className="h-72 pl-2">
                {loading || !summary ? <Skeleton className="h-full w-full" /> : <AnalyticsTrendChart data={summary.trend} />}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Conversion actions</CardTitle>
                <p className="text-sm text-muted-foreground">What visitors did after arriving.</p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-8 w-full" />)}</div>
                ) : !summary?.funnel.length ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No conversions in this period yet.</p>
                ) : (
                  <div className="divide-y">
                    {summary.funnel.map((item) => (
                      <div key={item.event_name} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <span className="text-sm">{eventLabel(item.event_name)}</span>
                        <span className="font-medium tabular-nums">{formatNumber.format(item.count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {widgets.has("recent") ? (
            <section className="mt-5 grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Acquisition sources</CardTitle><p className="text-sm text-muted-foreground">Where sessions first came from.</p></CardHeader>
                <CardContent>
                  {loading ? <Skeleton className="h-48 w-full" /> : !summary?.sources.length ? <p className="py-16 text-center text-sm text-muted-foreground">No source data yet.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2 font-medium">Source</th><th className="pb-2 text-right font-medium">Sessions</th><th className="pb-2 text-right font-medium">Visitors</th></tr></thead>
                        <tbody>{summary.sources.map((item) => <tr key={item.source} className="border-b last:border-0"><td className="max-w-48 truncate py-3 font-medium">{item.source}</td><td className="py-3 text-right tabular-nums">{formatNumber.format(item.visits)}</td><td className="py-3 text-right tabular-nums">{formatNumber.format(item.visitors)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Top pages</CardTitle><p className="text-sm text-muted-foreground">Content that attracts the most attention.</p></CardHeader>
                <CardContent>
                  {loading ? <Skeleton className="h-48 w-full" /> : !summary?.top_pages.length ? <p className="py-16 text-center text-sm text-muted-foreground">No page views yet.</p> : (
                    <div className="divide-y">{summary.top_pages.slice(0, 6).map((page) => <div key={page.path} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{page.page_title || page.path}</p><p className="truncate text-xs text-muted-foreground">{page.path}</p></div><div className="text-right"><p className="text-sm font-medium tabular-nums">{formatNumber.format(page.views)}</p><p className="text-xs text-muted-foreground">views</p></div></div>)}</div>
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {widgets.has("recent") ? (
            <Card className="mt-5">
              <CardHeader><CardTitle>Recent CRM activity</CardTitle><p className="text-sm text-muted-foreground">High-intent actions captured by the consumer site.</p></CardHeader>
              <CardContent>
                {loading ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div> : !summary?.recent_conversions.length ? <p className="py-12 text-center text-sm text-muted-foreground">Conversion activity will appear here when visitors contact, subscribe, order, book, or use high-intent links.</p> : (
                  <div className="divide-y">{summary.recent_conversions.map((item, index) => {
                    const recordId =
                      typeof item.metadata.record_id === "string" ||
                      typeof item.metadata.record_id === "number"
                        ? String(item.metadata.record_id)
                        : null;
                    const source = item.utm_source || item.source || "Direct";
                    return <div key={`${item.occurred_at}-${index}`} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{eventLabel(item.event_name)}</p><p className="truncate text-xs text-muted-foreground">{item.path || "/"} · {source}{recordId ? ` · Record ${recordId}` : ""}</p></div><time className="shrink-0 text-xs text-muted-foreground" dateTime={item.occurred_at} title={format(parseISO(item.occurred_at), "PPpp")}>{formatDistanceToNow(parseISO(item.occurred_at), { addSuffix: true })}</time></div>;
                  })}</div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {widgets.has("tools") && operationalModules.length ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Workspace tools</h2>
          <Card className={`grid overflow-hidden sm:grid-cols-2 ${operationalModules.length === 3 ? "lg:grid-cols-3" : operationalModules.length > 3 ? "xl:grid-cols-4" : ""}`}>
            {operationalModules.map(({ key, experience }) => {
              const Icon = experience.icon;
              return <Link key={key} href={modulePrimaryPath(key)} className="flex min-w-0 items-center gap-3 border-b px-4 py-3.5 hover:bg-muted/60 sm:border-r xl:[&:nth-child(4n)]:border-r-0"><Icon className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{experience.label}</span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground" /></Link>;
            })}
          </Card>
        </section>
      ) : null}
    </>
  );
}
