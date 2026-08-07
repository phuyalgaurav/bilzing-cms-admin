"use client";

import { LogOut, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useAuth, useTenant } from "@/components/providers/app-providers";
import { roleLabel } from "@/lib/auth";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { role, logout } = useAuth(); const { config, loading, refresh } = useTenant();
  return <><PageHeading eyebrow="Account" title="Profile & session" description="Review your access and manage the current browser session." /><div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Account access</CardTitle></CardHeader><CardContent><div className="flex items-center gap-4 rounded-xl bg-muted p-4"><div className="grid size-11 place-items-center rounded-full bg-neutral-900 text-white"><UserRound className="size-5" /></div><div><p className="font-medium">Workspace member</p><Badge variant="brand" className="mt-1">{role ? roleLabel[role] : "Member"}</Badge></div></div><div className="mt-5 flex items-start gap-3 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" /><p>Your role controls which actions are visible. The CMS API always performs the final permission check.</p></div></CardContent></Card><Card><CardHeader><CardTitle>Workspace</CardTitle></CardHeader><CardContent className="space-y-4"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</p><p className="mt-1 text-sm font-medium">{config.name}</p></div><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tenant key</p><p className="mt-1 font-mono text-sm">{config.tenant_key || "Not configured"}</p></div><Button variant="outline" onClick={() => refresh()} disabled={loading}><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />Refresh branding</Button></CardContent></Card><Card className="lg:col-span-2"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-medium">Sign out of this browser</p><p className="mt-1 text-sm text-muted-foreground">Your secure refresh session will be cleared.</p></div><Button variant="outline" onClick={logout}><LogOut className="size-4" />Sign out</Button></CardContent></Card></div></>;
}
