"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { LoaderCircle, MoreHorizontal, Plus, ShieldCheck, ShieldX, Trash2, UserCheck, UserRoundCog, UserX } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, SortableHeader } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { useAuth } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { roleLabel } from "@/lib/auth";
import type { Paginated, Role, TenantMember } from "@/lib/types";

const assignableRoles = ["viewer", "editor", "staff", "support", "sales", "accountant", "manager", "administrator", "super_admin"] as const;
const inviteSchema = z.object({ email: z.email("Enter a valid email address."), role: z.enum(assignableRoles) });
type InviteForm = z.infer<typeof inviteSchema>;

export default function MembersPage() {
  const router = useRouter();
  const { role } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState<string>();
  const [removeTarget, setRemoveTarget] = useState<TenantMember>();
  const loadRequest = useRef(0);
  const canManage = role === "super_admin";
  const form = useForm<InviteForm>({ resolver: zodResolver(inviteSchema), defaultValues: { email: "", role: "editor" } });

  const load = useCallback(async () => {
    const requestId = ++loadRequest.current;
    if (!canManage) { setLoading(false); return; }
    setLoading(true); setError(null);
    try { const value = await apiFetch<Paginated<TenantMember> | TenantMember[]>("/api/v1/admin/members/?ordering=email"); if (requestId === loadRequest.current) setMembers(Array.isArray(value) ? value : value.results); }
    catch (cause) { if (requestId === loadRequest.current) { const message = cause instanceof Error ? cause.message : "Members could not be loaded."; setError(message); toast.error(message); } }
    finally { if (requestId === loadRequest.current) setLoading(false); }
  }, [canManage]);
  useEffect(() => { void load(); return () => { loadRequest.current += 1; }; }, [load]);

  async function invite(values: InviteForm) {
    try { const member = await apiFetch<TenantMember>("/api/v1/admin/members/", { method: "POST", body: JSON.stringify({ ...values, is_active: true }) }); setMembers((current) => [...current, member].sort((a, b) => a.email.localeCompare(b.email))); setOpen(false); form.reset(); toast.success(`Access email sent to ${member.email}`); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "The invitation could not be sent."); }
  }
  async function remove(member: TenantMember) {
    setUpdating(String(member.id));
    try { await apiFetch(`/api/v1/admin/members/${member.id}/`, { method: "DELETE" }); setMembers((current) => current.filter((item) => item.id !== member.id)); setRemoveTarget(undefined); toast.success(`${member.email} was removed`); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "The member could not be removed."); }
    finally { setUpdating(undefined); }
  }
  async function updateMember(member: TenantMember, changes: Partial<TenantMember>) {
    setUpdating(String(member.id));
    try { const updated = await apiFetch<TenantMember>(`/api/v1/admin/members/${member.id}/`, { method: "PATCH", body: JSON.stringify(changes) }); setMembers((current) => current.map((item) => item.id === updated.id ? updated : item)); toast.success(`${updated.email} updated`); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "The member could not be updated."); }
    finally { setUpdating(undefined); }
  }

  const columns = useMemo<ColumnDef<TenantMember>[]>(() => [
    { accessorKey: "email", header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>, cell: ({ row }) => <div><p className="text-sm font-medium">{row.original.email}</p><p className="mt-0.5 text-xs text-muted-foreground">Employee account</p></div> },
    { accessorKey: "role", header: "Role", cell: ({ row }) => <span className="text-sm text-muted-foreground">{roleLabel[row.original.role]}</span> },
    { accessorKey: "is_active", header: "Status", cell: ({ row }) => <StatusBadge value={row.original.is_active ? "active" : "inactive"} /> },
    { id: "actions", enableHiding: false, header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <div className="flex justify-end"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" disabled={updating === String(row.original.id)} aria-label={`Actions for ${row.original.email}`}>{updating === String(row.original.id) ? <LoaderCircle className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Change role</DropdownMenuLabel>{(assignableRoles as readonly Role[]).map((nextRole) => <DropdownMenuItem key={nextRole} disabled={row.original.role === nextRole} onSelect={() => void updateMember(row.original, { role: nextRole })}><UserRoundCog />{roleLabel[nextRole]}</DropdownMenuItem>)}<DropdownMenuSeparator /><DropdownMenuItem onSelect={() => void updateMember(row.original, { is_active: !row.original.is_active })}>{row.original.is_active ? <UserX /> : <UserCheck />}{row.original.is_active ? "Deactivate" : "Activate"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setRemoveTarget(row.original)}><Trash2 />Remove access</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div> },
  ], [updating]);
  const visibleMembers = useMemo(() => { const query = search.trim().toLowerCase(); return query ? members.filter((member) => member.email.toLowerCase().includes(query) || roleLabel[member.role].toLowerCase().includes(query)) : members; }, [members, search]);

  if (!canManage) return <><PageHeading title="Members" description="Manage employee access and workspace roles." /><div className="rounded-lg border bg-card"><EmptyState icon={ShieldX} title="Super Admin access required" description="You can continue reviewing content, but only Super Admins can view employee accounts or change workspace roles." /></div></>;

  return <>
    <PageHeading title="Members" description="Invite employees, assign roles, and control workspace access." actions={<div className="flex gap-2"><Button variant="outline" onClick={() => router.push("/role-permissions")}><ShieldCheck className="size-4" />Role permissions</Button><Button onClick={() => setOpen(true)}><Plus className="size-4" />Invite employee</Button></div>} />
    <DataTable data={visibleMembers} columns={columns} loading={loading} error={error} onRetry={() => void load()} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search members…" emptyTitle={search ? "No matching members" : "No members yet"} emptyDescription={search ? "Try a different email address or role." : "Invite the first employee to this workspace."} emptyAction={!search ? "Invite employee" : undefined} onEmptyAction={() => setOpen(true)} getRowId={(member) => String(member.id)} />
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md"><DialogTitle>Invite employee</DialogTitle><DialogDescription>They will receive an email to create a password or use their existing CMS account.</DialogDescription><form onSubmit={form.handleSubmit(invite)} className="mt-5 space-y-4"><div><Label htmlFor="invite-email">Email address</Label><Input id="invite-email" className="mt-1.5" type="email" autoComplete="email" {...form.register("email")} />{form.formState.errors.email ? <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p> : null}</div><Controller name="role" control={form.control} render={({ field }) => <div><Label>Role</Label><Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger><SelectContent>{assignableRoles.map((item) => <SelectItem key={item} value={item}>{roleLabel[item]}</SelectItem>)}</SelectContent></Select></div>} /><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}Send access email</Button></div></form></DialogContent></Dialog>
    <ConfirmDialog open={Boolean(removeTarget)} onOpenChange={(nextOpen) => !nextOpen && setRemoveTarget(undefined)} title="Remove employee access?" description={`${removeTarget?.email ?? "This employee"} will no longer be able to access this workspace. Their account is not deleted.`} confirmLabel="Remove access" onConfirm={() => removeTarget && void remove(removeTarget)} pending={Boolean(removeTarget && updating === String(removeTarget.id))} />
  </>;
}
