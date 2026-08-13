"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, LoaderCircle, RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { useAuth } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

type Option = { key: string; label: string };
type RolePolicy = {
  key: Exclude<Role, "super_admin">;
  label: string;
  modules: string[];
  actions: string[];
};
type RolePolicyResponse = {
  roles: RolePolicy[];
  available_modules: Option[];
  available_actions: Option[];
  protected_role: { key: "super_admin"; label: string; detail: string };
};

const roleDescriptions: Record<RolePolicy["key"], string> = {
  viewer: "Read-only access for people who review workspace information.",
  editor: "Create and update website content and publishing workflows.",
  staff: "Handle daily operations such as inventory, bookings, and delivery.",
  support: "Manage customer questions, cases, reviews, and service records.",
  sales: "Work with leads, customers, quotations, orders, and payments.",
  accountant: "Review and manage financial, invoice, payment, and subscription data.",
  manager: "Coordinate teams and workflows across selected business tools.",
  administrator: "Broad workspace administration without protected Super Admin powers.",
};

export function RolePermissionsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { role } = useAuth();
  const canManage = role === "super_admin";
  const [data, setData] = useState<RolePolicyResponse>();
  const [baseline, setBaseline] = useState<RolePolicyResponse>();
  const [selectedRole, setSelectedRole] = useState<RolePolicy["key"]>("viewer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    if (!canManage) { setLoading(false); return; }
    setLoading(true); setError(undefined);
    try {
      const response = await apiFetch<RolePolicyResponse>("/api/v1/admin/role-policies/");
      if (current === requestId.current) {
        setData(response);
        setBaseline(response);
        setSelectedRole(response.roles[0]?.key ?? "viewer");
      }
    } catch (cause) {
      if (current === requestId.current) {
        const message = cause instanceof Error ? cause.message : "Role permissions could not be loaded.";
        setError(message);
        toast.error(message);
      }
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [canManage]);

  useEffect(() => { void load(); return () => { requestId.current += 1; }; }, [load]);

  const selected = data?.roles.find((item) => item.key === selectedRole);
  const dirty = useMemo(
    () => Boolean(data && baseline && JSON.stringify(data.roles) !== JSON.stringify(baseline.roles)),
    [data, baseline],
  );

  function updateSelection(field: "modules" | "actions", key: string, checked: boolean) {
    setData((current) => current ? {
      ...current,
      roles: current.roles.map((item) => item.key === selectedRole ? {
        ...item,
        [field]: checked
          ? [...new Set([...item[field], key])]
          : item[field].filter((value) => value !== key),
      } : item),
    } : current);
  }

  function setAll(field: "modules" | "actions", checked: boolean) {
    if (!data) return;
    const values = checked
      ? (field === "modules" ? data.available_modules : data.available_actions).map((item) => item.key)
      : [];
    setData({
      ...data,
      roles: data.roles.map((item) => item.key === selectedRole ? { ...item, [field]: values } : item),
    });
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const response = await apiFetch<RolePolicyResponse>("/api/v1/admin/role-policies/", {
        method: "PUT",
        body: JSON.stringify({ roles: data.roles }),
      });
      setData(response);
      setBaseline(response);
      toast.success("Role permissions saved");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Role permissions could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) return <>{embedded ? null : <PageHeading title="Role permissions" description="Control what each workspace role can access and do." />}<Card><EmptyState icon={ShieldX} title="Super Admin access required" description="Only a Super Admin can view or change workspace role permissions." /></Card></>;

  return <>
    {embedded ? <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Role permissions</h2><p className="mt-1 text-sm text-muted-foreground">Choose which enabled tools each role can access and which actions it can perform.</p></div><div className="flex gap-2"><Button variant="outline" disabled={!dirty || saving} onClick={() => baseline && setData(structuredClone(baseline))}><RotateCcw className="size-4" />Discard</Button><Button disabled={!dirty || saving} onClick={() => void save()}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Save changes</Button></div></div> : <PageHeading
      title="Role permissions"
      description="Choose which enabled tools each role can access and which actions it can perform."
      actions={<div className="flex gap-2"><Button variant="outline" disabled={!dirty || saving} onClick={() => baseline && setData(structuredClone(baseline))}><RotateCcw className="size-4" />Discard</Button><Button disabled={!dirty || saving} onClick={() => void save()}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Save changes</Button></div>}
    />}

    <div className="mb-5 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
      <div><p className="text-sm font-medium">Super Admin remains protected</p><p className="mt-0.5 text-sm text-muted-foreground">It always has full workspace access, so the tenant cannot be locked out.</p></div>
    </div>

    {loading ? <div className="grid min-h-80 place-items-center rounded-lg border bg-card"><LoaderCircle className="size-5 animate-spin text-muted-foreground" /></div> : error ? <Card><EmptyState icon={ShieldX} title="Role permissions unavailable" description={error} action="Try again" onAction={() => void load()} /></Card> : data && selected ? (
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden">
          <CardHeader className="border-b pb-4"><CardTitle>Workspace roles</CardTitle><p className="text-sm text-muted-foreground">Select a role to configure.</p></CardHeader>
          <CardContent className="p-2">
            {data.roles.map((item) => <button key={item.key} type="button" onClick={() => setSelectedRole(item.key)} className={cn("w-full rounded-md px-3 py-2.5 text-left transition-colors", item.key === selectedRole ? "bg-primary/10 text-primary" : "hover:bg-muted")}><span className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{item.label}</span><span className="text-xs tabular-nums text-muted-foreground">{item.modules.length} tools</span></span><span className="mt-0.5 block text-xs text-muted-foreground">{item.actions.length} actions allowed</span></button>)}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="border-b pb-4"><CardTitle>{selected.label}</CardTitle><p className="text-sm text-muted-foreground">{roleDescriptions[selected.key]}</p></CardHeader>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Tools this role can access</h2><p className="mt-0.5 text-xs text-muted-foreground">Only modules enabled for this workspace are shown.</p></div><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setAll("modules", true)}>Select all</Button><Button size="sm" variant="ghost" onClick={() => setAll("modules", false)}>Clear</Button></div></div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{data.available_modules.map((option) => { const id = `module-${selected.key}-${option.key}`; return <label key={option.key} htmlFor={id} className="flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm hover:bg-muted/40"><Checkbox id={id} checked={selected.modules.includes(option.key)} onCheckedChange={(checked) => updateSelection("modules", option.key, checked === true)} /><span>{option.label}</span></label>; })}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-4"><CardTitle>Allowed actions</CardTitle><p className="text-sm text-muted-foreground">These actions apply only inside the tools selected above.</p></CardHeader>
            <CardContent className="p-5"><div className="mb-4 flex justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => setAll("actions", true)}>Select all</Button><Button size="sm" variant="ghost" onClick={() => setAll("actions", false)}>Clear</Button></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{data.available_actions.map((option) => { const id = `action-${selected.key}-${option.key}`; return <label key={option.key} htmlFor={id} className="flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm hover:bg-muted/40"><Checkbox id={id} checked={selected.actions.includes(option.key)} onCheckedChange={(checked) => updateSelection("actions", option.key, checked === true)} /><span>{option.label}</span></label>; })}</div></CardContent>
          </Card>
        </div>
      </div>
    ) : null}
  </>;
}

export default function RolePermissionsRoute() {
  return <RolePermissionsPage />;
}
