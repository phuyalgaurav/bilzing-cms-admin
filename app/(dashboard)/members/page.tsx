"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus, ShieldX, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { useAuth } from "@/components/providers/app-providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { roleLabel } from "@/lib/auth";
import type { Paginated, Role, TenantMember } from "@/lib/types";

export default function MembersPage() {
  const { role } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState<Role>("editor");
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string>();
  const canManage = role === "super_admin";

  const load = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const value = await apiFetch<Paginated<TenantMember> | TenantMember[]>(
        "/api/v1/admin/members/?ordering=email",
      );
      setMembers(Array.isArray(value) ? value : value.results);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Members could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const member = await apiFetch<TenantMember>("/api/v1/admin/members/", {
        method: "POST",
        body: JSON.stringify({ email, role: memberRole, is_active: true }),
      });
      setMembers((current) =>
        [...current, member].sort((a, b) => a.email.localeCompare(b.email)),
      );
      setOpen(false);
      setEmail("");
      setMemberRole("editor");
      toast.success(`Access email sent to ${member.email}`);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "The invitation could not be sent.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(member: TenantMember) {
    if (!window.confirm(`Remove ${member.email} from this workspace?`)) return;
    try {
      await apiFetch(`/api/v1/admin/members/${member.id}/`, {
        method: "DELETE",
      });
      setMembers((current) => current.filter((item) => item.id !== member.id));
      toast.success(`${member.email} was removed`);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "The member could not be removed.",
      );
    }
  }

  async function updateMember(
    member: TenantMember,
    changes: Partial<TenantMember>,
  ) {
    setUpdating(String(member.id));
    try {
      const updated = await apiFetch<TenantMember>(
        `/api/v1/admin/members/${member.id}/`,
        { method: "PATCH", body: JSON.stringify(changes) },
      );
      setMembers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(`${updated.email} updated`);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "The member could not be updated.",
      );
    } finally {
      setUpdating(undefined);
    }
  }

  if (!canManage) {
    return (
      <>
        <PageHeading
          eyebrow="Workspace"
          title="Members"
          description="Member and role management is restricted to Super Admins."
        />
        <Card>
          <EmptyState
            icon={ShieldX}
            title="Super Admin access required"
            description="You can continue reviewing content, but you cannot view employee accounts or change workspace roles."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="Workspace"
        title="Members"
        description="Invite employees by email and control their workspace role."
        actions={
          canManage ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Invite employee
            </Button>
          ) : undefined
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid min-h-56 place-items-center">
              <LoaderCircle className="size-6 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Invite the first employee to this workspace."
              action={canManage ? "Invite employee" : undefined}
              onAction={() => setOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-b bg-neutral-50/70 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-5 py-4 font-medium">{member.email}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {canManage ? (
                          <select
                            className="h-9 rounded-lg border bg-card px-2 text-sm"
                            value={member.role}
                            disabled={updating === String(member.id)}
                            onChange={(event) =>
                              updateMember(member, {
                                role: event.target.value as Role,
                              })
                            }
                            aria-label={`Role for ${member.email}`}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        ) : (
                          roleLabel[member.role]
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {canManage ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={updating === String(member.id)}
                            onClick={() =>
                              updateMember(member, {
                                is_active: !member.is_active,
                              })
                            }
                          >
                            {updating === String(member.id) && (
                              <LoaderCircle className="size-3.5 animate-spin" />
                            )}
                            <Badge
                              variant={member.is_active ? "success" : "warning"}
                            >
                              {member.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </Button>
                        ) : (
                          <Badge
                            variant={member.is_active ? "success" : "warning"}
                          >
                            {member.is_active ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(member)}
                            aria-label={`Remove ${member.email}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Invite employee</DialogTitle>
          <DialogDescription>
            They will receive an email to create a password or use their
            existing CMS account.
          </DialogDescription>
          <form onSubmit={invite} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Email address
              </span>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Role</span>
              <select
                className="h-10 w-full rounded-lg border bg-card px-3 text-sm"
                value={memberRole}
                onChange={(event) => setMemberRole(event.target.value as Role)}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 border-t pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircle className="size-4 animate-spin" />}Send
                access email
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
