"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import {
  Activity,
  ArrowRight,
  Eye,
  MessageSquareText,
  MousePointerClick,
  PackageCheck,
  RefreshCw,
  Star,
  Users,
} from "lucide-react";

import { PageHeading } from "@/components/admin-shell/page-heading";
import { useTenant } from "@/components/providers/app-providers";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminActivity, type ActivityPage } from "@/lib/activity-api";
import { getAnalyticsSummary, type AnalyticsSummary } from "@/lib/analytics-api";
import { getAdminModuleRecords, getAdminResourceEndpoint } from "@/lib/module-api";
import { modulePrimaryPath } from "@/lib/module-experience";
import type { ModuleRecord, Paginated, RecordActivity } from "@/lib/types";
import { cn } from "@/lib/utils";

const TrafficChart = dynamic(
  () => import("@/components/admin/analytics-trend-chart").then((module) => module.AnalyticsTrafficChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

const number = new Intl.NumberFormat();

type ModuleSnapshot = { count: number; records: ModuleRecord[] };

function words(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function relativeTime(value: string) {
  const date = parseISO(value);
  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : value;
}

function recordsFrom(response: Paginated<ModuleRecord> | ModuleRecord[]): ModuleSnapshot {
  return Array.isArray(response)
    ? { count: response.length, records: response }
    : { count: response.count, records: response.results };
}

async function loadModule(moduleKey: string, resourceKey: string) {
  const endpoint = await getAdminResourceEndpoint(moduleKey, resourceKey);
  return recordsFrom(await getAdminModuleRecords(endpoint, { ordering: "-created_at", pageSize: 6 }));
}

function Metric({ label, value, note, icon: Icon, loading }: { label: string; value: string; note: string; icon: typeof Users; loading: boolean }) {
  return <div className="p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><span className="grid size-8 place-items-center rounded-md bg-muted"><Icon className="size-4 text-muted-foreground" /></span></div>
    {loading ? <Skeleton className="mt-3 h-8 w-24" /> : <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>}
    <p className="mt-2 text-xs text-muted-foreground">{note}</p>
  </div>;
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mr-2")}>{children}<ArrowRight className="size-3.5" /></Link>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="grid min-h-32 place-items-center px-4 text-center text-sm text-muted-foreground">{children}</p>;
}

function ActivityItem({ item }: { item: RecordActivity }) {
  return <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Activity className="size-3.5" /></span>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{words(item.event)} <span className="font-normal text-muted-foreground">{words(item.resource_path)}</span></p><p className="mt-0.5 truncate text-xs text-muted-foreground">{item.record_slug}</p><p className="mt-1 text-xs text-muted-foreground">{item.actor_email || "System"} · {relativeTime(item.created_at)}</p></div>
  </li>;
}

function statusVariant(value: string): "neutral" | "success" | "warning" | "brand" | "danger" {
  if (["completed", "approved", "published", "paid"].includes(value)) return "success";
  if (["new", "open", "draft"].includes(value)) return "brand";
  if (["cancelled", "rejected", "overdue"].includes(value)) return "danger";
  if (["pending", "in_progress"].includes(value)) return "warning";
  return "neutral";
}

function recordStatus(record: ModuleRecord) {
  return String(record.operational_status ?? record.status ?? "unknown");
}

function SiteActivity({ summary }: { summary: AnalyticsSummary }) {
  const conversions = summary.recent_conversions.slice(0, 5);
  if (conversions.length) return <ul className="divide-y">{conversions.map((item, index) => <li key={`${item.occurred_at}-${index}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-700"><MousePointerClick className="size-3.5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{words(item.event_name)}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{item.path || "Website"}{item.source ? ` · ${item.source}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{relativeTime(item.occurred_at)}</p></div></li>)}</ul>;
  if (summary.funnel.length) return <div className="space-y-4">{summary.funnel.slice(0, 5).map((item) => <div key={item.event_name} className="flex items-center justify-between gap-4"><span className="text-sm text-muted-foreground">{words(item.event_name)}</span><strong className="text-sm tabular-nums">{number.format(item.count)}</strong></div>)}<p className="pt-1 text-xs text-muted-foreground">No individual conversion events in this period. Showing action totals.</p></div>;
  return <Empty>No visitor actions have been tracked yet.</Empty>;
}

export default function DashboardPage() {
  const { config } = useTenant();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [adminActivity, setAdminActivity] = useState<ActivityPage | null>(null);
  const [orders, setOrders] = useState<ModuleSnapshot | null>(null);
  const [reviews, setReviews] = useState<ModuleSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const analyticsEnabled = config.enabled_modules.includes("analytics");
  const ordersEnabled = config.enabled_modules.includes("orders");
  const reviewsEnabled = config.enabled_modules.includes("reviews");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const jobs = [
      getAdminActivity({ pageSize: 6 }).then((value) => { if (active) setAdminActivity(value); }),
      ...(analyticsEnabled ? [getAnalyticsSummary(30).then((value) => { if (active) setAnalytics(value); })] : []),
      ...(ordersEnabled ? [loadModule("orders", "orders").then((value) => { if (active) setOrders(value); })] : []),
      ...(reviewsEnabled ? [loadModule("reviews", "reviews").then((value) => { if (active) setReviews(value); })] : []),
    ];
    Promise.allSettled(jobs).then((results) => {
      if (!active) return;
      if (results.every((result) => result.status === "rejected")) setError("The dashboard could not be loaded. Try again in a moment.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [analyticsEnabled, ordersEnabled, reviewsEnabled, revision]);

  const reviewAverage = useMemo(() => {
    const ratings = (reviews?.records ?? []).map((record) => Number(record.rating)).filter(Number.isFinite);
    return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
  }, [reviews]);
  const pendingOrders = orders?.records.filter((record) => !["completed", "cancelled"].includes(recordStatus(record))).length ?? 0;
  const totals = analytics?.totals;

  return <>
    <PageHeading title="Dashboard" description="A quick view of your website, customer activity, and team work." actions={<Button variant="outline" size="icon" aria-label="Refresh dashboard" onClick={() => setRevision((value) => value + 1)} disabled={loading}><RefreshCw className={cn("size-4", loading && "animate-spin")} /></Button>} />

    {error ? <Card className="mb-5"><CardContent className="flex min-h-32 flex-col items-center justify-center gap-3 text-center"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={() => setRevision((value) => value + 1)}>Try again</Button></CardContent></Card> : null}

    <section className="grid divide-y overflow-hidden rounded-lg border bg-card sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
      <Metric label="Visitors" value={number.format(totals?.visitors ?? 0)} note="Last 30 days" icon={Users} loading={loading && analyticsEnabled} />
      <Metric label="Page views" value={number.format(totals?.page_views ?? 0)} note={`${totals?.pages_per_session ?? 0} per session`} icon={Eye} loading={loading && analyticsEnabled} />
      <Metric label="Orders" value={number.format(orders?.count ?? 0)} note={`${pendingOrders} active in recent records`} icon={PackageCheck} loading={loading && ordersEnabled} />
      <Metric label="Reviews" value={number.format(reviews?.count ?? 0)} note={reviewAverage === null ? "No ratings yet" : `${reviewAverage.toFixed(1)} average in recent reviews`} icon={Star} loading={loading && reviewsEnabled} />
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.8fr)]">
      <Card><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Website traffic</CardTitle><p className="mt-1 text-sm text-muted-foreground">Visitors and sessions over the last 30 days.</p></div>{analyticsEnabled ? <CardLink href="/analytics">Full analytics</CardLink> : null}</CardHeader><CardContent className="h-72 pl-1">{loading && analyticsEnabled ? <Skeleton className="h-full w-full" /> : analytics ? <TrafficChart data={analytics.trend} /> : <Empty>{analyticsEnabled ? "No website traffic has been recorded yet." : "Enable Analytics to see website traffic."}</Empty>}</CardContent></Card>
      <Card><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Visitor activity</CardTitle><p className="mt-1 text-sm text-muted-foreground">Recent tracked actions on the site.</p></div>{analyticsEnabled ? <CardLink href="/analytics">Explore</CardLink> : null}</CardHeader><CardContent>{loading && analyticsEnabled ? <Skeleton className="h-48 w-full" /> : analytics ? <SiteActivity summary={analytics} /> : <Empty>No site activity is available.</Empty>}</CardContent></Card>
    </section>

    <section className="mt-5 grid gap-5 lg:grid-cols-3">
      <Card><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Admin activity</CardTitle><p className="mt-1 text-sm text-muted-foreground">Recent changes and who made them.</p></div><CardLink href="/activity">View log</CardLink></CardHeader><CardContent>{loading && !adminActivity ? <Skeleton className="h-56 w-full" /> : adminActivity?.results.length ? <ul className="divide-y">{adminActivity.results.slice(0, 5).map((item) => <ActivityItem key={item.id} item={item} />)}</ul> : <Empty>No admin changes yet.</Empty>}</CardContent></Card>

      {ordersEnabled ? <Card><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Recent orders</CardTitle><p className="mt-1 text-sm text-muted-foreground">Latest customer order requests.</p></div><CardLink href={modulePrimaryPath("orders")}>All orders</CardLink></CardHeader><CardContent>{loading && !orders ? <Skeleton className="h-56 w-full" /> : orders?.records.length ? <ul className="divide-y">{orders.records.slice(0, 5).map((record) => <li key={record.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{record.title || `Order #${record.id}`}</p><p className="mt-1 text-xs text-muted-foreground">{relativeTime(record.created_at)}</p></div><Badge variant={statusVariant(recordStatus(record))}>{words(recordStatus(record))}</Badge></li>)}</ul> : <Empty>No orders yet.</Empty>}</CardContent></Card> : null}

      {reviewsEnabled ? <Card><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Recent reviews</CardTitle><p className="mt-1 text-sm text-muted-foreground">Ratings and customer feedback.</p></div><CardLink href={modulePrimaryPath("reviews")}>All reviews</CardLink></CardHeader><CardContent>{loading && !reviews ? <Skeleton className="h-56 w-full" /> : reviews?.records.length ? <ul className="divide-y">{reviews.records.slice(0, 5).map((record) => <li key={record.id} className="py-3 first:pt-0 last:pb-0"><div className="flex items-start justify-between gap-3"><p className="truncate text-sm font-medium">{String(record.author ?? record.title)}</p>{Number.isFinite(Number(record.rating)) ? <span className="flex shrink-0 items-center gap-1 text-sm font-semibold"><Star className="size-3.5 fill-amber-400 text-amber-500" />{Number(record.rating).toFixed(1)}</span> : <MessageSquareText className="size-4 text-muted-foreground" />}</div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{String(record.comment ?? record.description ?? record.title)}</p></li>)}</ul> : <Empty>No reviews yet.</Empty>}</CardContent></Card> : null}
    </section>
  </>;
}
