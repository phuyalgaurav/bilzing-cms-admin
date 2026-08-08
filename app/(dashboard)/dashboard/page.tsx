"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Images,
  LayoutTemplate,
  Newspaper,
  Plus,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type {
  ContentRecord,
  MediaRecord,
  NavigationRecord,
  Paginated,
} from "@/lib/types";
import { useAuth, useTenant } from "@/components/providers/app-providers";
import { canEdit } from "@/lib/auth";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const resources = [
  {
    label: "Pages",
    href: "/pages",
    endpoint: "/api/v1/pages/?ordering=-updated_at",
    icon: FileText,
    module: "website_pages",
  },
  {
    label: "Posts",
    href: "/posts",
    endpoint: "/api/v1/posts/?ordering=-updated_at",
    icon: Newspaper,
    module: "blog",
  },
  {
    label: "Navigation",
    href: "/navigation",
    endpoint: "/api/v1/navigations/?ordering=-updated_at",
    icon: LayoutTemplate,
    module: "website_pages",
  },
  {
    label: "Media",
    href: "/media",
    endpoint: "/api/v1/media/?ordering=-created_at",
    icon: Images,
    module: "media_library",
  },
];

type DashboardRecord = ContentRecord | NavigationRecord | MediaRecord;

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
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all(
      activeResources.map((item) =>
        apiFetch<Paginated<DashboardRecord> | DashboardRecord[]>(item.endpoint),
      ),
    )
      .then((data) => {
        const counts: Record<string, number> = {};
        data.forEach((value, index) => {
          counts[activeResources[index].label] = Array.isArray(value)
            ? value.length
            : value.count;
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

  const hasBlog = config.enabled_modules.includes("blog");

  return (
    <>
      <PageHeading
        eyebrow="Overview"
        title="Your content at a glance"
        description="See what changed recently and jump back into the work that needs your attention."
        actions={
          mayEdit ? (
            <Link
              href="/pages?new=true"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-95"
            >
              <Plus className="size-4" />
              New page
            </Link>
          ) : undefined
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {activeResources.map(({ label, href, icon: Icon }) => (
          <Link key={label} href={href}>
            <Card className="group h-full transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid size-11 place-items-center rounded-xl bg-primary/8 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  {loading ? (
                    <Skeleton className="mt-1 h-7 w-10" />
                  ) : (
                    <p className="text-2xl font-semibold">
                      {stats[label] ?? "—"}
                    </p>
                  )}
                </div>
                <ArrowRight className="ml-auto size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recently updated</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Your latest page changes
              </p>
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
        <Card className="overflow-hidden">
          <div className="bg-neutral-950 p-6 text-white">
            <div className="grid size-10 place-items-center rounded-xl bg-white/10">
              <Sparkles className="size-5" />
            </div>
            <h2 className="mt-8 text-xl font-semibold">
              A calmer way to publish.
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Draft, review, and publish without touching the application code.
            </p>
          </div>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {mayEdit ? "Quick actions" : "Workspace access"}
            </p>
            {mayEdit ? (
              <div className="mt-3 space-y-1">
                {hasBlog && (
                  <Link
                    href="/posts?new=true"
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    Write a post <ArrowRight className="size-4" />
                  </Link>
                )}
                <Link
                  href="/media"
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Upload media <ArrowRight className="size-4" />
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Viewer access lets you review tenant content without changing or
                deleting records.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
