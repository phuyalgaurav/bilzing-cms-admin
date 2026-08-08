"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  FileText,
  Gauge,
  Images,
  LayoutTemplate,
  LifeBuoy,
  Menu,
  Newspaper,
  RefreshCw,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, useTenant } from "@/components/providers/app-providers";
import { roleLabel } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/lib/types";

interface NavigationLink {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  requiredModule?: string;
  requiredRole?: Role;
}

const links: NavigationLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/pages", label: "Pages", icon: FileText },
  { href: "/posts", label: "Posts", icon: Newspaper, requiredModule: "blog" },
  { href: "/navigation", label: "Navigation", icon: LayoutTemplate },
  { href: "/media", label: "Media", icon: Images },
  {
    href: "/members",
    label: "Members",
    icon: Users,
    requiredModule: "user_management",
    requiredRole: "super_admin",
  },
];

const builtInModuleLinks = new Set([
  "website_pages",
  "media_library",
  "user_management",
  "blog",
]);
const moduleLabels: Record<string, string> = {
  settings: "Settings",
  contact_management: "Contacts & inquiries",
  seo_management: "SEO",
  analytics: "Analytics",
  notifications: "Notifications",
  team_management: "Team",
  service_catalog: "Services",
  product_catalog: "Products",
  customer_management: "Customers",
  document_management: "Documents",
  location_management: "Locations",
  property_listings: "Properties",
};
function moduleLabel(moduleKey: string) {
  return (
    moduleLabels[moduleKey] ??
    moduleKey
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, access, role } = useAuth();
  const { config, error, refresh } = useTenant();
  const [open, setOpen] = useState(false);
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
    (moduleKey) => !builtInModuleLinks.has(moduleKey),
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
      <nav
        className="flex-1 space-y-1 overflow-y-auto p-3"
        aria-label="Main navigation"
      >
        {links
          .filter(
            (link) =>
              (!link.requiredModule ||
                config.enabled_modules.includes(link.requiredModule)) &&
              (!link.requiredRole || link.requiredRole === role),
          )
          .map(({ href, label, icon: Icon, disabled }) =>
            disabled ? (
              <span
                key={href}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground/60"
              >
                <Icon className="size-4" />
                {label}
                <Badge className="ml-auto text-[10px]">Soon</Badge>
              </span>
            ) : (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === href ||
                    (href !== "/dashboard" && pathname.startsWith(href))
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ),
          )}
        {additionalModules.length > 0 && (
          <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Enabled modules
          </p>
        )}
        {additionalModules.map((moduleKey) => (
          <Link
            key={moduleKey}
            href={`/modules/${moduleKey}`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith(`/modules/${moduleKey}`)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Boxes className="size-4" />
            {moduleLabel(moduleKey)}
          </Link>
        ))}
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
        <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-7">
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
            <p className="truncate text-sm font-semibold">{config.name}</p>
            <p className="text-xs text-muted-foreground">Content workspace</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {error && (
              <Button variant="outline" size="sm" onClick={() => refresh()}>
                <RefreshCw className="size-3.5" />
                Retry theme
              </Button>
            )}
            <Link
              href="/profile"
              aria-label="Settings"
              className="grid size-9 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-muted"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-7 lg:p-9">
          {children}
        </main>
      </div>
    </div>
  );
}
