"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  LayoutTemplate,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { adminModulePath, getAdminResourceEndpoint } from "@/lib/module-api";
import { canDelete, canEdit } from "@/lib/auth";
import type { NavigationRecord, Paginated } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { useAuth } from "@/components/providers/app-providers";
import { PageHeading } from "@/components/admin-shell/page-heading";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ErrorState } from "@/components/admin/error-state";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function NavigationManager() {
  const { role } = useAuth();
  const [items, setItems] = useState<NavigationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<NavigationRecord | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NavigationRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const loadRequest = useRef(0);
  const load = useCallback(() => {
    const requestId = ++loadRequest.current;
    setLoading(true);
    getAdminResourceEndpoint("website_pages", "navigations")
      .then((endpoint) =>
        apiFetch<Paginated<NavigationRecord> | NavigationRecord[]>(
          `${adminModulePath(endpoint)}?ordering=-updated_at`,
        ),
      )
      .then((value) => {
        if (requestId !== loadRequest.current) return;
        const records = Array.isArray(value) ? value : value.results;
        setItems(records.map((record) => ({ ...record, items: record.items ?? [] })));
        setError("");
      })
      .catch((cause) => {
        if (requestId === loadRequest.current)
          setError(cause instanceof Error ? cause.message : "Navigation could not be loaded.");
      })
      .finally(() => {
        if (requestId === loadRequest.current) setLoading(false);
      });
  }, []);
  useEffect(() => {
    load();
    return () => {
      loadRequest.current += 1;
    };
  }, [load]);
  const create = () => {
    setOriginal(null);
    setEditor({ name: "", slug: "", items: [{ label: "", href: "/" }] });
  };
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    try {
      const endpoint = await getAdminResourceEndpoint("website_pages", "navigations");
      const saved = await apiFetch<NavigationRecord>(
        adminModulePath(endpoint, original ?? undefined),
        { method: original ? "PATCH" : "POST", body: JSON.stringify(editor) },
      );
      setItems((current) =>
        original
          ? current.map((x) => (x.slug === original ? saved : x))
          : [saved, ...current],
      );
      setEditor(null);
      toast.success("Navigation saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }
  async function remove(item: NavigationRecord) {
    setDeleting(true);
    try {
      const endpoint = await getAdminResourceEndpoint("website_pages", "navigations");
      await apiFetch(adminModulePath(endpoint, item.slug), { method: "DELETE" });
      setItems((current) => current.filter((x) => x.slug !== item.slug));
      setDeleteTarget(null);
      toast.success("Navigation deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally { setDeleting(false); }
  }
  return (
    <>
      <PageHeading
        eyebrow="Structure"
        title="Navigation"
        description="Control the menus and links visitors use to move around your website."
        actions={
          canEdit(role) ? (
            <Button onClick={create}>
              <Plus className="size-4" />
              New menu
            </Button>
          ) : undefined
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((x) => (
                <Skeleton key={x} className="h-20" />
              ))}
            </div>
          ) : error ? (
            <ErrorState title="Couldn’t load navigation" description={error} retry={load} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={LayoutTemplate}
              title="No menus yet"
              description="Create a menu for your header, footer, or another area."
              action={canEdit(role) ? "Create menu" : undefined}
              onAction={create}
            />
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.slug} className="flex items-center gap-4 p-5">
                  <div className="grid size-10 place-items-center rounded-lg bg-muted">
                    <LayoutTemplate className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {(item.items ?? []).length} links · {item.slug}
                    </p>
                  </div>
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${item.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{canEdit(role) ? <DropdownMenuItem onSelect={() => { setOriginal(item.slug); setEditor({ ...item, items: item.items ?? [] }); }}><Pencil />Edit</DropdownMenuItem> : null}{canDelete(role) ? <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(item)}><Trash2 />Delete</DropdownMenuItem></> : null}</DropdownMenuContent></DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent>
          <DialogTitle>{original ? "Edit menu" : "New menu"}</DialogTitle>
          <DialogDescription>
            Add links in the order they should appear.
          </DialogDescription>
          {editor && (
            <form onSubmit={save} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium">
                    Menu name
                  </span>
                  <Input
                    value={editor.name}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        name: e.target.value,
                        slug: original ? editor.slug : slugify(e.target.value),
                      })
                    }
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium">Slug</span>
                  <Input
                    value={editor.slug}
                    onChange={(e) =>
                      setEditor({ ...editor, slug: slugify(e.target.value) })
                    }
                    required
                  />
                </label>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Links</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditor({
                        ...editor,
                        items: [...editor.items, { label: "", href: "/" }],
                      })
                    }
                  >
                    <Plus className="size-3.5" />
                    Add link
                  </Button>
                </div>
                <div className="space-y-2">
                  {editor.items.map((link, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[64px_1fr_1fr_36px] items-center gap-2 rounded-lg border p-2"
                    >
                      <div className="flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={index === 0}
                          onClick={() => {
                            const next = [...editor.items];
                            [next[index - 1], next[index]] = [
                              next[index],
                              next[index - 1],
                            ];
                            setEditor({ ...editor, items: next });
                          }}
                          aria-label={`Move link ${index + 1} up`}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={index === editor.items.length - 1}
                          onClick={() => {
                            const next = [...editor.items];
                            [next[index], next[index + 1]] = [
                              next[index + 1],
                              next[index],
                            ];
                            setEditor({ ...editor, items: next });
                          }}
                          aria-label={`Move link ${index + 1} down`}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </div>
                      <Input
                        aria-label={`Link ${index + 1} label`}
                        placeholder="Label"
                        value={link.label}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            items: editor.items.map((x, i) =>
                              i === index ? { ...x, label: e.target.value } : x,
                            ),
                          })
                        }
                        required
                      />
                      <Input
                        aria-label={`Link ${index + 1} URL`}
                        placeholder="/about"
                        value={link.href}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            items: editor.items.map((x, i) =>
                              i === index ? { ...x, href: e.target.value } : x,
                            ),
                          })
                        }
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setEditor({
                            ...editor,
                            items: editor.items.filter((_, i) => i !== index),
                          })
                        }
                        aria-label={`Remove link ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <LoaderCircle className="size-4 animate-spin" />}
                  Save menu
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={`Delete “${deleteTarget?.name ?? "menu"}”?`} description="This permanently removes the menu and its links. This action cannot be undone." confirmLabel="Delete menu" onConfirm={() => deleteTarget && void remove(deleteTarget)} pending={deleting} />
    </>
  );
}
