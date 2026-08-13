"use client";

import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  FileClock,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import { PageHeading } from "@/components/admin-shell/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminActivity,
  type ActivityPage,
} from "@/lib/activity-api";
import type { RecordActivity } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;
const ALL = "__all__";

function words(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function activityPresentation(event: string) {
  if (event.includes("delete")) {
    return { label: words(event), icon: Trash2, tone: "text-destructive bg-destructive/10" };
  }
  if (event === "created" || event === "imported") {
    return { label: words(event), icon: CirclePlus, tone: "text-emerald-700 bg-emerald-500/10" };
  }
  if (event === "updated") {
    return { label: "Updated", icon: Pencil, tone: "text-blue-700 bg-blue-500/10" };
  }
  return { label: words(event), icon: Activity, tone: "text-amber-700 bg-amber-500/10" };
}

function changeSummary(changes: Record<string, unknown>) {
  const fields = Object.keys(changes);
  if (!fields.length) return null;
  const shown = fields.slice(0, 3).map(words).join(", ");
  return `Changed ${shown}${fields.length > 3 ? ` and ${fields.length - 3} more` : ""}`;
}

function safeDate(value: string) {
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

function ActivityRow({ item }: { item: RecordActivity }) {
  const presentation = activityPresentation(item.event);
  const Icon = presentation.icon;
  const date = safeDate(item.created_at);
  const summary = changeSummary(item.changes);

  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[2.25rem_minmax(0,1fr)_minmax(11rem,0.55fr)_auto] sm:items-center sm:px-5">
      <span className={cn("grid size-9 place-items-center rounded-full", presentation.tone)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">{presentation.label}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {words(item.resource_path)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">{item.record_slug}</p>
        {summary ? <p className="mt-1 text-xs text-muted-foreground">{summary}</p> : null}
      </div>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted">
          <UserRound className="size-3.5 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{item.actor_email || "System"}</p>
          <p className="text-xs text-muted-foreground">Done by</p>
        </div>
      </div>
      <time
        className="text-xs text-muted-foreground sm:text-right"
        dateTime={item.created_at}
        title={date ? format(date, "PPpp") : item.created_at}
      >
        {date ? formatDistanceToNow(date, { addSuffix: true }) : item.created_at}
      </time>
    </li>
  );
}

export default function ActivityPage() {
  const [data, setData] = useState<ActivityPage | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [resourcePath, setResourcePath] = useState(ALL);
  const [event, setEvent] = useState(ALL);
  const [actorEmail, setActorEmail] = useState(ALL);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getAdminActivity(
      {
        page,
        pageSize: PAGE_SIZE,
        search,
        resourcePath: resourcePath === ALL ? undefined : resourcePath,
        event: event === ALL ? undefined : event,
        actorEmail: actorEmail === ALL ? undefined : actorEmail,
      },
      controller.signal,
    )
      .then(setData)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "The admin log could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [actorEmail, event, page, resourcePath, revision, search]);

  const pageCount = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const resultLabel = useMemo(
    () => `${data?.count ?? 0} ${data?.count === 1 ? "activity" : "activities"}`,
    [data?.count],
  );

  return (
    <>
      <PageHeading
        title="Admin log"
        description="See what changed across the workspace, who did it, and when."
        actions={
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh admin log"
            onClick={() => setRevision((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        }
      />

      <Card>
        <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(15rem,1fr)_repeat(3,minmax(10rem,0.35fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(input) => setSearchInput(input.target.value)}
              placeholder="Search action, record, or email"
              aria-label="Search admin log"
              className="pl-9"
            />
          </div>
          <Select value={resourcePath} onValueChange={(value) => { setResourcePath(value); setPage(1); }}>
            <SelectTrigger aria-label="Filter by resource"><SelectValue placeholder="All resources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All resources</SelectItem>
              {(data?.facets.resource_paths ?? []).map((value) => <SelectItem key={value} value={value}>{words(value)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={event} onValueChange={(value) => { setEvent(value); setPage(1); }}>
            <SelectTrigger aria-label="Filter by activity"><SelectValue placeholder="All activity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All activity</SelectItem>
              {(data?.facets.events ?? []).map((value) => <SelectItem key={value} value={value}>{words(value)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actorEmail} onValueChange={(value) => { setActorEmail(value); setPage(1); }}>
            <SelectTrigger aria-label="Filter by person"><SelectValue placeholder="Everyone" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Everyone</SelectItem>
              {(data?.facets.actors ?? []).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-4 border-b bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
          <span>{loading && !data ? "Loading activity…" : resultLabel}</span>
          {data?.count ? <span>Newest first</span> : null}
        </div>

        <CardContent className="p-0">
          {loading && !data ? (
            <div className="space-y-0 divide-y">
              {[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="mx-4 my-4 h-14 w-auto sm:mx-5" />)}
            </div>
          ) : error ? (
            <div className="grid min-h-64 place-items-center p-6 text-center">
              <div><p className="text-sm text-destructive">{error}</p><Button className="mt-3" variant="outline" size="sm" onClick={() => setRevision((value) => value + 1)}>Try again</Button></div>
            </div>
          ) : !data?.results.length ? (
            <div className="grid min-h-64 place-items-center p-6 text-center">
              <div><FileClock className="mx-auto mb-3 size-7 text-muted-foreground" /><p className="font-medium">No activity found</p><p className="mt-1 text-sm text-muted-foreground">Changes made in the admin will appear here.</p></div>
            </div>
          ) : (
            <ol className={cn("divide-y", loading && "opacity-60")}>
              {data.results.map((item) => <ActivityRow key={item.id} item={item} />)}
            </ol>
          )}

          {data && data.count > PAGE_SIZE ? (
            <div className="flex items-center justify-between border-t px-4 py-3 sm:px-5">
              <p className="text-xs text-muted-foreground">Page {page} of {pageCount}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="size-4" />Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight className="size-4" /></Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
