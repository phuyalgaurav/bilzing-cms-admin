"use client";

import Link from "next/link";
import { ExternalLink, FileText, ListChecks, Send, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Json = Record<string, unknown>;

export type SiteFeature = {
  path: string;
  module: string;
  read?: string | null;
  create?: string | null;
  title: string;
  description: string;
  enabled: boolean;
  available: boolean;
  readAvailable: boolean;
  createAvailable: boolean;
  showRead: boolean;
  showCreate: boolean;
  showInNavigation: boolean;
  navigationLabel: string;
};

type Props = {
  features: SiteFeature[];
  layout: Json;
  publicBaseUrl?: string;
  onChange: (layout: Json) => void;
};

function pageConfig(layout: Json, path: string) {
  const pages = layout.pages && typeof layout.pages === "object" ? layout.pages as Json : {};
  const page = pages[path];
  return page && typeof page === "object" ? page as Json : {};
}

function introBody(config: Json) {
  const sections = Array.isArray(config.sections) ? config.sections : [];
  const intro = sections.find((item) => item && typeof item === "object" && (item as Json).id === "visitor-page-introduction") as Json | undefined;
  return typeof intro?.body === "string" ? intro.body : "";
}

function moduleLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function VisitorPagesEditor({ features, layout, publicBaseUrl, onChange }: Props) {
  const livePageCount = features.filter((feature) => pageConfig(layout, feature.path).enabled !== false && feature.available).length;

  function updatePage(path: string, patch: Json) {
    const pages = layout.pages && typeof layout.pages === "object" ? layout.pages as Json : {};
    onChange({ ...layout, pages: { ...pages, [path]: { ...pageConfig(layout, path), ...patch } } });
  }

  function updateIntroduction(path: string, body: string) {
    const config = pageConfig(layout, path);
    const sections = Array.isArray(config.sections)
      ? config.sections.filter((item) => !(item && typeof item === "object" && (item as Json).id === "visitor-page-introduction"))
      : [];
    updatePage(path, {
      sections: body.trim()
        ? [{ id: "visitor-page-introduction", type: "rich_text", body }, ...sections]
        : sections,
    });
  }

  if (!features.length) {
    return <section className="rounded-lg border bg-card p-5"><h2 className="font-semibold">Visitor pages</h2><p className="mt-2 text-sm text-muted-foreground">No visitor-facing module capabilities are enabled for this site.</p></section>;
  }

  return <section className="rounded-lg border bg-card p-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="font-semibold">Visitor pages</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Every safe public module journey has a specific route. Control its visibility, page copy, published collection and submission form here.</p></div>
      <Badge variant="brand">{livePageCount} live</Badge>
    </div>
    <div className="mt-5 space-y-3">
      {features.map((feature) => {
        const config = pageConfig(layout, feature.path);
        const enabled = config.enabled !== false && feature.available;
        const title = typeof config.title === "string" ? config.title : feature.title;
        const description = typeof config.description === "string" ? config.description : feature.description;
        const body = introBody(config);
        const previewHref = publicBaseUrl ? `${publicBaseUrl}${feature.path}` : "";
        return <details className="group rounded-lg border bg-background open:shadow-sm" key={feature.path}>
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className={`size-2.5 shrink-0 rounded-full ${enabled ? "bg-emerald-500" : "bg-muted-foreground/35"}`} aria-hidden="true" />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{title}</span><span className="block truncate font-mono text-xs text-muted-foreground">{feature.path}</span></span>
            <Badge className="hidden sm:inline-flex">{moduleLabel(feature.module)}</Badge>
            <span className="text-xs text-muted-foreground">{feature.available ? enabled ? "Live" : "Hidden" : "Unavailable"}</span>
          </summary>
          <div className="border-t p-4">
            {!feature.available ? <p className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800">This route needs a public read or submission capability enabled by the platform administrator.</p> : null}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-4">
                <label className="block text-sm font-medium">Page title<Input className="mt-1.5" value={title} onChange={(event) => updatePage(feature.path, { title: event.target.value })} /></label>
                <label className="block text-sm font-medium">Page description<Textarea className="mt-1.5 min-h-20" value={description} onChange={(event) => updatePage(feature.path, { description: event.target.value })} /></label>
                <label className="block text-sm font-medium">Introductory content<Textarea className="mt-1.5 min-h-28" value={body} onChange={(event) => updateIntroduction(feature.path, event.target.value)} placeholder="Optional page-specific copy shown before the module content." /></label>
              </div>
              <div className="space-y-3 rounded-md border bg-muted/25 p-4">
                <label className="flex items-start gap-3 text-sm"><input className="mt-0.5 size-4" type="checkbox" checked={enabled} disabled={!feature.available} onChange={(event) => updatePage(feature.path, { enabled: event.target.checked, ...(event.target.checked ? {} : { show_in_navigation: false }) })} /><span><strong className="block font-medium">Page is visible</strong><span className="text-xs text-muted-foreground">Turn this route on or off.</span></span></label>
                {feature.read ? <label className="flex items-start gap-3 text-sm"><input className="mt-0.5 size-4" type="checkbox" checked={config.show_read !== false && feature.readAvailable} disabled={!feature.readAvailable} onChange={(event) => updatePage(feature.path, { show_read: event.target.checked })} /><span><strong className="flex items-center gap-1.5 font-medium"><ListChecks className="size-3.5" />Published content</strong><span className="text-xs text-muted-foreground">Show the {feature.read.replaceAll("-", " ")} collection.</span></span></label> : null}
                {feature.create ? <label className="flex items-start gap-3 text-sm"><input className="mt-0.5 size-4" type="checkbox" checked={config.show_create !== false && feature.createAvailable} disabled={!feature.createAvailable} onChange={(event) => updatePage(feature.path, { show_create: event.target.checked })} /><span><strong className="flex items-center gap-1.5 font-medium"><Send className="size-3.5" />Submission form</strong><span className="text-xs text-muted-foreground">Accept {feature.create.replaceAll("-", " ")} here.</span></span></label> : null}
                <label className="flex items-start gap-3 text-sm"><input className="mt-0.5 size-4" type="checkbox" checked={config.show_in_navigation !== false} disabled={!enabled} onChange={(event) => updatePage(feature.path, { show_in_navigation: event.target.checked })} /><span><strong className="block font-medium">Show in main menu</strong><span className="text-xs text-muted-foreground">Enabled by default. Clear this to hide the route from navigation.</span></span></label>
                {config.show_in_navigation !== false ? <label className="block text-xs font-medium">Menu label<Input className="mt-1.5 h-8 text-xs" value={typeof config.navigation_label === "string" ? config.navigation_label : title} onChange={(event) => updatePage(feature.path, { navigation_label: event.target.value })} /></label> : null}
                <div className="grid gap-2 border-t pt-3">
                  {feature.read ? <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-start")} href={`/modules/${feature.module}/${feature.read}`}><Settings2 className="size-3.5" />Manage content</Link> : null}
                  {feature.create ? <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-start")} href={`/modules/${feature.module}/${feature.create}`}><FileText className="size-3.5" />View submissions</Link> : null}
                  {previewHref && enabled ? <a className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")} href={previewHref} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />Open live page</a> : null}
                </div>
              </div>
            </div>
          </div>
        </details>;
      })}
    </div>
  </section>;
}
