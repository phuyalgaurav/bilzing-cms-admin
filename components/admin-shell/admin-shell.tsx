"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Gauge, LifeBuoy, LogOut, Menu, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, Settings, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth, useTenant } from "@/components/providers/app-providers";
import { roleLabel } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/media-url";
import { moduleExperience, modulePrimaryPath } from "@/lib/module-experience";
import { cn } from "@/lib/utils";

type NavigationGroup = "Sales" | "Customers" | "Operations" | "Settings";
interface NavigationLink { href: string; label: string; icon: LucideIcon; group?: NavigationGroup; }

const baseLinks: NavigationLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/settings", label: "Settings", icon: Settings, group: "Settings" },
];
const settingsOnlyModules = new Set(["website_pages", "media_library", "user_management", "blog", "settings", "seo_management", "gallery", "faq", "document_management", "notifications", "analytics"]);
const moduleGroups: Record<NavigationGroup, Set<string>> = {
  Sales: new Set(["product_catalog", "orders", "payments", "offers", "quotation", "invoice", "subscription", "membership"]),
  Customers: new Set(["contact_management", "customer_management", "crm", "reviews"]),
  Operations: new Set(["inventory", "delivery", "booking", "service_catalog", "team_management", "location_management", "events", "patient_records", "room_management", "admissions", "student_management", "case_management", "menu_management", "property_listings"]),
  Settings: new Set(),
};
const navigationGroups = Object.keys(moduleGroups) as NavigationGroup[];
function groupForModule(moduleKey: string): NavigationGroup { return navigationGroups.find((group) => moduleGroups[group].has(moduleKey)) ?? "Operations"; }

const routeLabels: Record<string, string> = {
  pages: "Pages",
  posts: "Blog posts",
  navigation: "Menus",
  media: "Media library",
  members: "Team access",
  profile: "Profile",
  settings: "Settings",
};

function pathnameLabel(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "modules" && segments[1]) {
    return moduleExperience(segments[1]).label;
  }
  const segment = segments.at(-1) ?? "dashboard";
  return routeLabels[segment] ?? segment.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function NavItem({ item, active, collapsed, onNavigate }: { item: NavigationLink; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const link = <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors", active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground", collapsed && "justify-center px-0")}><Icon className="size-4 shrink-0" /><span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span></Link>;
  return collapsed ? <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip> : link;
}

function SidebarContent({ children, collapsed, brandName, workspaceName, logoUrl, query, onQueryChange, onCollapse, supportUrl, role, onLogout, onNavigate }: { children: ReactNode; collapsed: boolean; brandName: string; workspaceName: string; logoUrl?: string; query: string; onQueryChange(value: string): void; onCollapse?: () => void; supportUrl?: string; role?: string; onLogout(): void; onNavigate?: () => void }) {
  return <>
    <div className={cn("flex h-14 shrink-0 items-center border-b px-3", collapsed ? "justify-center" : "gap-3")}>
      <div className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-primary text-sm font-semibold text-primary-foreground">{logoUrl ? <Image src={resolveMediaUrl(logoUrl)} alt={`${brandName} logo`} fill sizes="32px" unoptimized className="object-contain" /> : brandName.slice(0, 1).toUpperCase()}</div>
      {!collapsed ? <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{brandName}</p><p className="truncate text-xs text-muted-foreground">{workspaceName}</p></div> : null}
      {onCollapse ? <Button variant="ghost" size="icon" className={cn("size-8", collapsed && "hidden")} onClick={onCollapse} aria-label="Collapse sidebar"><PanelLeftClose className="size-4" /></Button> : null}
    </div>
    {!collapsed ? <div className="border-b p-3"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Find a tool" aria-label="Find a tool" className="pl-9" /></div></div> : onCollapse ? <div className="border-b p-3"><Button variant="ghost" size="icon" className="size-9" onClick={onCollapse} aria-label="Expand sidebar"><PanelLeftOpen className="size-4" /></Button></div> : null}
    {children}
    <div className="shrink-0 border-t p-2">
      {supportUrl ? <Tooltip><TooltipTrigger asChild><a href={supportUrl} className={cn("flex h-9 items-center gap-3 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground", collapsed && "justify-center px-0")}><LifeBuoy className="size-4" /><span className={cn(collapsed && "sr-only")}>Help & support</span></a></TooltipTrigger>{collapsed ? <TooltipContent side="right">Help & support</TooltipContent> : null}</Tooltip> : null}
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className={cn("mt-1 h-auto w-full justify-start gap-3 px-2 py-2", collapsed && "justify-center px-0")}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><UserRound className="size-3.5" /></span>{!collapsed ? <span className="min-w-0 text-left"><span className="block truncate text-sm font-medium text-foreground">My account</span><span className="block text-xs font-normal text-muted-foreground">{role ? roleLabel[role as keyof typeof roleLabel] : "Member"}</span></span> : null}</Button></DropdownMenuTrigger><DropdownMenuContent side={collapsed ? "right" : "top"} align="start" className="w-52"><DropdownMenuLabel>Account</DropdownMenuLabel><DropdownMenuItem asChild><Link href="/profile" onClick={onNavigate}><UserRound />Profile</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={onLogout}><LogOut />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div>
  </>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, access, role, logout } = useAuth();
  const { config, error, refresh } = useTenant();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [navQuery, setNavQuery] = useState("");

  useEffect(() => { if (ready && !access) router.replace("/login"); }, [ready, access, router]);
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => { setCollapsed(window.localStorage.getItem("cms-sidebar-collapsed") === "true"); }, []);
  function toggleCollapsed() { setCollapsed((current) => { const next = !current; window.localStorage.setItem("cms-sidebar-collapsed", String(next)); return next; }); }

  const navigation = useMemo(() => {
    const modules: NavigationLink[] = config.enabled_modules.filter((key) => !settingsOnlyModules.has(key)).map((key) => { const experience = moduleExperience(key); return { href: modulePrimaryPath(key), label: experience.label, icon: experience.icon, group: groupForModule(key) }; });
    return [...baseLinks, ...modules];
  }, [config.enabled_modules]);

  if (!ready || !access) return <div className="grid min-h-screen place-items-center"><div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /><span className="sr-only">Loading workspace</span></div>;

  const normalizedQuery = navQuery.trim().toLowerCase();
  const current = navigation.filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))).sort((a, b) => b.href.length - a.href.length)[0];
  const grouped = navigationGroups.map((group) => ({ group, items: navigation.filter((item) => item.group === group && (!normalizedQuery || item.label.toLowerCase().includes(normalizedQuery))) }));
  const dashboard = navigation.find((item) => item.href === "/dashboard");
  const nav = (isCollapsed: boolean, close?: () => void) => <nav className="flex-1 overflow-y-auto p-2" aria-label="Main navigation">{dashboard && (!normalizedQuery || dashboard.label.toLowerCase().includes(normalizedQuery)) ? <NavItem item={dashboard} active={pathname === dashboard.href} collapsed={isCollapsed} onNavigate={close} /> : null}{grouped.map(({ group, items }) => items.length ? <section key={group} className="mt-4"><h2 className={cn("mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", isCollapsed && "sr-only")}>{group}</h2><div className="space-y-0.5">{items.map((item) => <NavItem key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} collapsed={isCollapsed} onNavigate={close} />)}</div></section> : null)}{normalizedQuery && grouped.every(({ items }) => !items.length) ? <p className="px-3 py-6 text-center text-xs text-muted-foreground">No matching tools</p> : null}</nav>;
  const brandName = config.admin_theme.brand_name || config.name;
  const sidebarProps = { brandName, workspaceName: config.name, logoUrl: config.admin_theme.logo_url, query: navQuery, onQueryChange: setNavQuery, supportUrl: config.admin_theme.support_url, role, onLogout: () => void logout() };
  const sidebarRight = config.admin_theme.sidebar_position === "right";
  const desktopWidth = collapsed ? "64px" : "248px";

  return <div className="min-h-screen bg-background lg:grid" style={{ gridTemplateColumns: sidebarRight ? `minmax(0,1fr) ${desktopWidth}` : `${desktopWidth} minmax(0,1fr)` }}>
    <aside className={cn("hidden h-screen flex-col border-r bg-card lg:sticky lg:top-0 lg:flex", sidebarRight && "order-2 border-l border-r-0")}><SidebarContent {...sidebarProps} collapsed={collapsed} onCollapse={toggleCollapsed}>{nav(collapsed)}</SidebarContent></aside>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="w-[min(88vw,300px)] gap-0 p-0" showCloseButton={false}><SheetTitle className="sr-only">Workspace navigation</SheetTitle><SheetDescription className="sr-only">Navigate between admin tools</SheetDescription><SidebarContent {...sidebarProps} collapsed={false} onNavigate={() => setMobileOpen(false)}>{nav(false, () => setMobileOpen(false))}</SidebarContent></SheetContent></Sheet>
    <div className={cn("min-w-0", sidebarRight && "lg:order-1")}>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 sm:px-6"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></Button><nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm"><Link href="/dashboard" className="hidden text-muted-foreground hover:text-foreground sm:inline">Workspace</Link><ChevronRight className="hidden size-3.5 text-muted-foreground sm:inline" /><span className="truncate font-medium">{current?.label ?? pathnameLabel(pathname)}</span></nav><div className="ml-auto flex items-center gap-1">{error ? <Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="size-3.5" />Retry</Button> : null}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Account menu"><UserRound className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>{role ? roleLabel[role] : "Member"}</DropdownMenuLabel><DropdownMenuItem asChild><Link href="/profile"><UserRound />Profile</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/settings"><Settings />Settings</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => void logout()}><LogOut />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header>
      <main className="mx-auto w-full max-w-400 p-4 sm:p-6">{children}</main>
    </div>
  </div>;
}
