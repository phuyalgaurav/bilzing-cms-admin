"use client";

import { useState } from "react";
import { ShieldCheck, UsersRound } from "lucide-react";

import { MembersPage } from "@/app/(dashboard)/members/page";
import { RolePermissionsPage } from "@/app/(dashboard)/role-permissions/page";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TeamAccessView = "people" | "permissions";

export default function TeamAccessPage() {
  const [view, setView] = useState<TeamAccessView>("people");

  return (
    <>
      <PageHeading
        title="Team access"
        description="Control who can use this CMS and what each workspace role can do."
      />

      <div className="mb-6 flex w-fit gap-1 rounded-lg border bg-muted/40 p-1" role="tablist" aria-label="Team access sections">
        <Button
          type="button"
          role="tab"
          aria-selected={view === "people"}
          variant="ghost"
          size="sm"
          className={cn(view === "people" && "bg-background shadow-xs hover:bg-background")}
          onClick={() => setView("people")}
        >
          <UsersRound className="size-4" />People
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={view === "permissions"}
          variant="ghost"
          size="sm"
          className={cn(view === "permissions" && "bg-background shadow-xs hover:bg-background")}
          onClick={() => setView("permissions")}
        >
          <ShieldCheck className="size-4" />Role permissions
        </Button>
      </div>

      <section role="tabpanel">
        {view === "people" ? (
          <MembersPage embedded onShowPermissions={() => setView("permissions")} />
        ) : (
          <RolePermissionsPage embedded />
        )}
      </section>
    </>
  );
}
