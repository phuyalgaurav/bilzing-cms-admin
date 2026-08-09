"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Gauge,
  LifeBuoy,
  Menu,
  RefreshCw,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useTenant } from "@/components/providers/app-providers";
import { roleLabel } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { moduleExperience, modulePrimaryPath } from "@/lib/module-experience";

interface NavigationLink {
  href: string;
  label: string;
  icon: LucideIcon;
  group?: NavigationGroup;
  requiredModule?: string;
}

type NavigationGroup = "Sales" | "Customers" | "Operations" | "Settings";

const links: NavigationLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/settings", label: "Settings", icon: Settings, group: "Settings" },
];

const settingsOnlyModules = new Set([
  "website_pages",
  "media_library",
  "user_management",
  "blog",
  "settings",
  "seo_management",
  "gallery",
  "faq",
  "document_management",
  "notifications",
  "analytics",
]);

const moduleGroups: Record<NavigationGroup, Set<string>> = {
  Sales: new Set([
    "product_catalog",
    "orders",
    "payments",
    "offers",
    "quotation",
    "invoice",
    "subscription",
    "membership",
  ]),
  Customers: new Set([
    "contact_management",
    "customer_management",
    "crm",
    "reviews",
  ]),
  Operations: new Set([
    "inventory",
    "delivery",
    "booking",
    "service_catalog",
    "team_management",
    "location_management",
    "events",
    "patient_records",
    "room_management",
    "admissions",
    "student_management",
    "case_management",
    "menu_management",
    "property_listings",
  ]),
  Settings: new Set(),
};

const navigationGroups = Object.keys(moduleGroups) as NavigationGroup[];

function groupForModule(moduleKey: string): NavigationGroup {
  return (
    navigationGroups.find((group) => moduleGroups[group].has(moduleKey)) ??
    "Operations"
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, access, role } = useAuth();
  const { config, error, refresh } = useTenant();
  const [open, setOpen] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  useEffect(() => {
    if (ready && !access) router.replace("/login");
  }, [ready, access, router]);
  useEffect(() => setOpen(false), [pathname]);
  if (!ready || !access)
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  const additionalModules = config.enabled_modules.filter(
    (moduleKey) => !settingsOnlyModules.has(moduleKey),
  );
  const visibleLinks = links.filter(
    (link) =>
      (!link.requiredModule ||
        config.enabled_modules.includes(link.requiredModule)),
  );
  const moduleLinks = additionalModules.map((moduleKey) => {
    const experience = moduleExperience(moduleKey);
    return {
      href: modulePrimaryPath(moduleKey),
      label: experience.label,
      icon: experience.icon,
      group: groupForModule(moduleKey),
    } satisfies NavigationLink;
  });
  const normalizedQuery = navQuery.trim().toLowerCase();
  const dashboardLink = visibleLinks.find((link) => link.href === "/dashboard");
  const groupedLinks = navigationGroups.map((group) => ({
    group,
    items: [...visibleLinks.filter((link) => link.group === group), ...moduleLinks]
      .filter((link) => link.group === group)
      .filter(
        (link) =>
          !normalizedQuery || link.label.toLowerCase().includes(normalizedQuery),
      ),
  }));
  const currentLabel = [...visibleLinks, ...moduleLinks]
    .filter(
      (link) =>
        pathname === link.href ||
        (link.href !== "/dashboard" && pathname.startsWith(link.href)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.label;

  const navigationItem = ({ href, label, icon: Icon }: NavigationLink) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
        pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          ? "bg-blue-50 text-blue-700"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      <span className="truncate">{label}</span>
    </Link>
  );
  const sidebar = (
    <>
      <div className="flex h-18 items-center gap-3 border-b px-5">
        <div className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {config.admin_theme.logo_url ? (
            <Image
              src={config.admin_theme.logo_url}
              alt={`${config.admin_theme.brand_name ?? config.name} logo`}
              fill
              sizes="36px"
              unoptimized
              className="object-contain"
            />
          ) : (
            (config.admin_theme.brand_name ?? config.name).slice(0, 1)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {config.admin_theme.brand_name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {config.name}
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="ml-auto rounded-md p-1 lg:hidden"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="border-b px-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={navQuery}
            onChange={(event) => setNavQuery(event.target.value)}
            placeholder="Find a tool"
            aria-label="Find a tool"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Main navigation">
        {!normalizedQuery && dashboardLink ? navigationItem(dashboardLink) : null}
        {groupedLinks.map(({ group, items }) =>
          items.length ? (
            <section key={group} className="mt-5 first:mt-0">
              <h2 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group}
              </h2>
              <div className="space-y-0.5">{items.map(navigationItem)}</div>
            </section>
          ) : null,
        )}
        {normalizedQuery && groupedLinks.every(({ items }) => !items.length) ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No matching tools
          </p>
        ) : null}
      </nav>
      <div className="border-t p-3">
        {config.admin_theme.support_url ? (
          <a
            href={config.admin_theme.support_url}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LifeBuoy className="size-4" />
            Help & support
          </a>
        ) : null}
        <Link
          href="/profile"
          className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"
        >
          <div className="grid size-8 place-items-center rounded-full bg-secondary text-white">
            <UserRound className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">My account</p>
            <p className="text-xs text-muted-foreground">
              {role ? roleLabel[role] : "Member"}
            </p>
          </div>
        </Link>
      </div>
    </>
  );
  const sidebarRight = config.admin_theme.sidebar_position === "right";
  const sidebarSoft = config.admin_theme.sidebar_style === "soft";
  return (
    <div
      className={cn(
        "min-h-screen lg:grid",
        sidebarRight ? "lg:grid-cols-[1fr_248px]" : "lg:grid-cols-[248px_1fr]",
      )}
    >
      <aside
        className={cn(
          "hidden h-screen flex-col lg:sticky lg:top-0 lg:flex",
          sidebarRight ? "lg:order-2 lg:border-l" : "border-r",
          sidebarSoft ? "bg-muted/60" : "bg-card",
        )}
      >
        {sidebar}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/35"
            onClick={() => setOpen(false)}
            aria-label="Close menu overlay"
          />
          <aside
            className={cn(
              "relative flex h-full w-[min(86vw,300px)] flex-col shadow-2xl",
              sidebarSoft ? "bg-muted" : "bg-card",
            )}
          >
            {sidebar}
          </aside>
        </div>
      )}
      <div className={cn("min-w-0", sidebarRight && "lg:order-1")}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {currentLabel ?? config.name}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {error && (
              <Button variant="outline" size="sm" onClick={() => refresh()}>
                <RefreshCw className="size-3.5" />
                Retry theme
              </Button>
            )}
            <Link
              href="/settings"
              aria-label="Settings"
              className="grid size-9 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-muted"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-400 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
          {children}
        </main>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-17 grid-cols-4 border-t bg-card/95 px-2 backdrop-blur lg:hidden"
        aria-label="Quick navigation"
      >
        {[
          { href: "/dashboard", label: "Home", icon: Gauge },
          { href: "/settings", label: "Settings", icon: Settings },
          { href: "/profile", label: "Account", icon: UserRound },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
              pathname === href ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4.5" />
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
        >
          <Menu className="size-4.5" />
          More
        </button>
      </nav>
    </div>
  );
}
