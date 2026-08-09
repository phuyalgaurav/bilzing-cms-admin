"use client";

import { LogOut, RefreshCw, UserRound } from "lucide-react";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { useAuth, useTenant } from "@/components/providers/app-providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { roleLabel } from "@/lib/auth";

export default function ProfilePage() {
  const { role, logout } = useAuth();
  const { config, loading, refresh } = useTenant();

  return (
    <>
      <PageHeading title="Account" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">{config.name}</p>
            <Button variant="outline" onClick={() => refresh()} disabled={loading}>
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <p className="font-medium">Sign out</p>
            <Button variant="outline" onClick={logout}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
