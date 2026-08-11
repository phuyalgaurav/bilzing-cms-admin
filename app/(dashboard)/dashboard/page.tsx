"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Images,
  LayoutTemplate,
  Newspaper,
  Plus,
  Settings2,
} from "lucide-react";
import { getAdminModuleDirectory, getAdminModuleRecords } from "@/lib/module-api";
import type {
  ContentRecord,
} from "@/lib/types";
import { useAuth, useTenant } from "@/components/providers/app-providers";
import { canEdit } from "@/lib/auth";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { moduleExperience, modulePrimaryPath } from "@/lib/module-experience";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ContentOverviewChart = dynamic(
  () => import("@/components/admin/content-overview-chart").then((module) => module.ContentOverviewChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

const resources = [
  {
    label: "Pages",
    href: "/pages",
    resource: "pages",
    icon: FileText,
    module: "website_pages",
  },
  {
    label: "Posts",
    href: "/posts",
    resource: "posts",
    icon: Newspaper,
    module: "blog",
  },
  {
    label: "Navigation",
    href: "/navigation",
    resource: "navigations",
    icon: LayoutTemplate,
    module: "website_pages",
  },
  {
    label: "Media",
    href: "/media",
    resource: "media",
    icon: Images,
    module: "media_library",
  },
];

const builtInModules = new Set([
  "website_pages",
  "media_library",
  "user_management",
]);

export default function DashboardPage() {
  const { config } = useTenant();
  const { role } = useAuth();
  const mayEdit = canEdit(role);
  const activeResources = useMemo(
    () =>
      resources.filter((resource) =>
        config.enabled_modules.includes(resource.module),
      ),
    [config.enabled_modules],
  );
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
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [widgets, setWidgets] = useState({ stats: true, tools: true, recent: true });
  const chartData = activeResources.map(({ label }) => ({ name: label, records: stats[label] ?? 0 }));

  useEffect(() => {
    const saved = window.localStorage.getItem(`cms-dashboard:${config.tenant_key}`);
    if (saved) {
      try {
        setWidgets((current) => ({ ...current, ...JSON.parse(saved) }));
      } catch {
        window.localStorage.removeItem(`cms-dashboard:${config.tenant_key}`);
      }
    }
  }, [config.tenant_key]);

  function updateWidget(key: keyof typeof widgets, value: boolean) {
    const next = { ...widgets, [key]: value };
    setWidgets(next);
    window.localStorage.setItem(`cms-dashboard:${config.tenant_key}`, JSON.stringify(next));
  }

  useEffect(() => {
    setLoading(true);
    setError(false);
    getAdminModuleDirectory()
      .then((directory) =>
        Promise.all(
          activeResources.map((item) => {
            const endpoint = directory
              .find((module) => module.key === item.module)
              ?.resources.find((resource) => resource.key === item.resource)
              ?.admin_endpoint;
            if (!endpoint)
              throw new Error(`${item.label} is not enabled for this tenant.`);
            return getAdminModuleRecords(endpoint, { ordering: "-updated_at" });
          }),
        ),
      )
      .then((data) => {
        const counts: Record<string, number> = {};
        data.forEach((value, index) => {
          counts[activeResources[index].label] = Array.isArray(value) ? value.length : value.count;
        });
        setStats(counts);
        const pagesIndex = activeResources.findIndex(
          (resource) => resource.label === "Pages",
        );
        if (pagesIndex >= 0) {
          const pages = data[pagesIndex];
          setRecent(
            (
              (Array.isArray(pages) ? pages : pages.results) as ContentRecord[]
            ).slice(0, 4),
          );
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [activeResources]);

  return (
    <>
      <PageHeading
        title="Dashboard"
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => setCustomizing(true)} aria-label="Customize dashboard">
              <Settings2 className="size-4" />
            </Button>
            {mayEdit ? <Link href="/pages?new=true" className={cn(buttonVariants(), "h-9")}><Plus className="size-4" />New page</Link> : null}
          </>
        }
      />
      {widgets.stats ? <section className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-2 xl:grid-cols-4">
        {activeResources.map(({ label, href, icon: Icon }) => (
          <Link key={label} href={href} className="group border-b p-4 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0">
              <div className="flex items-center gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/8 text-primary">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  {loading ? (
                    <Skeleton className="mt-1 h-7 w-10" />
                  ) : (
                    <p className="text-xl font-semibold tabular-nums">
                      {stats[label] ?? "—"}
                    </p>
                  )}
                </div>
                <ArrowRight className="ml-auto hidden size-4 text-muted-foreground group-hover:text-primary sm:block" />
              </div>
          </Link>
        ))}
      </section> : null}

      {widgets.tools && operationalModules.length ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Workspace tools</h2>
          <Card
            className={`grid overflow-hidden sm:grid-cols-2 ${
              operationalModules.length === 3
                ? "lg:grid-cols-3"
                : operationalModules.length > 3
                  ? "xl:grid-cols-4"
                  : ""
            }`}
          >
            {operationalModules.map(({ key, experience }) => {
              const Icon = experience.icon;
              return (
                <Link
                  key={key}
                  href={modulePrimaryPath(key)}
                  className="flex min-w-0 items-center gap-3 border-b px-4 py-3.5 hover:bg-muted/60 sm:border-r xl:[&:nth-child(4n)]:border-r-0"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {experience.label}
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </Card>
        </section>
      ) : null}

      {widgets.recent ? <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {chartData.length > 1 ? <Card>
          <CardHeader><CardTitle>Content overview</CardTitle><p className="text-sm text-muted-foreground">Records across your website tools.</p></CardHeader>
          <CardContent className="h-64 pl-0"><ContentOverviewChart data={chartData} /></CardContent>
        </Card> : null}
        <Card className={chartData.length <= 1 ? "lg:col-span-2" : undefined}>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recently updated</CardTitle>
            </div>
            <Link
              href="/pages"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-14 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                Content couldn’t be loaded. Check the API connection and try
                again.
              </div>
            ) : recent.length === 0 ? (
              <div className="grid min-h-48 place-items-center text-center">
                <div>
                  <FileText className="mx-auto mb-3 size-6 text-muted-foreground" />
                  <p className="font-medium">No pages yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create your first page to get started.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {recent.map((item) => (
                  <Link
                    href={`/pages?edit=${item.slug}`}
                    key={item.slug}
                    className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        /{item.slug}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.status === "published" ? "success" : "warning"
                      }
                    >
                      {item.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section> : null}
      <Dialog open={customizing} onOpenChange={setCustomizing}>
        <DialogContent className="max-w-md">
          <DialogTitle>Customize dashboard</DialogTitle>
          <DialogDescription>Choose the sections you want to see. Your layout is saved for this workspace in this browser.</DialogDescription>
          <div className="mt-6 space-y-3">
            {([['stats', 'Content overview'], ['tools', 'Workspace tools'], ['recent', 'Recently updated']] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-md border px-3 py-3 text-sm font-medium">
                {label}<Checkbox checked={widgets[key]} onCheckedChange={(checked) => updateWidget(key, Boolean(checked))} />
              </label>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
