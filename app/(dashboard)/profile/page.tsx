"use client";

import { LogOut, RefreshCw, UserRound } from "lucide-react";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { useAuth, useTenant } from "@/components/providers/app-providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { roleLabel } from "@/lib/auth";

export default function ProfilePage() {
  const { role, logout } = useAuth();
  const { config, loading, refresh } = useTenant();

  return (
    <>
      <PageHeading title="Account" />
      <Card className="max-w-3xl">
        <div className="grid gap-4 border-b p-5 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div><h2 className="text-sm font-semibold">Access</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Your permissions in this workspace.</p></div>
          <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-full bg-neutral-900 text-white">
                <UserRound className="size-5" />
              </div>
              <div>
                <p className="font-medium">Workspace member</p>
                <Badge variant="brand" className="mt-1">
                  {role ? roleLabel[role] : "Member"}
                </Badge>
              </div>
          </div>
        </div>
        <div className="grid gap-4 border-b p-5 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div><h2 className="text-sm font-semibold">Workspace</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Refresh the active workspace configuration.</p></div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">{config.name}</p>
            <Button variant="outline" onClick={() => refresh()} disabled={loading}>
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div><h2 className="text-sm font-semibold">Session</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">End your current admin session.</p></div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={logout}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
