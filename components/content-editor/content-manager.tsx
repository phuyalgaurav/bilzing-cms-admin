"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  LoaderCircle,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-client";
import { adminModulePath, getAdminResourceEndpoint } from "@/lib/module-api";
import { canDelete, canEdit } from "@/lib/auth";
import type { ContentRecord, Paginated } from "@/lib/types";
import { formatDate, slugify } from "@/lib/utils";
import { useAuth } from "@/components/providers/app-providers";
import { PageHeading } from "@/components/admin-shell/page-heading";
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
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaPicker } from "@/components/content-editor/media-picker";

const blank: ContentRecord = {
  title: "",
  slug: "",
  status: "draft",
  excerpt: "",
  content: { body: "" },
};

export function ContentManager({ type }: { type: "pages" | "posts" }) {
  const isPosts = type === "posts";
  const label = isPosts ? "Post" : "Page";
  const Icon = isPosts ? Newspaper : FileText;
  const { role } = useAuth();
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<ContentRecord | null>(null);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentRecord | null>(null);
  const moduleKey = isPosts ? "blog" : "website_pages";
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = await getAdminResourceEndpoint(moduleKey, type);
      const query = new URLSearchParams({ ordering: "-updated_at" });
      if (search) query.set("search", search);
      const value = await apiFetch<Paginated<ContentRecord> | ContentRecord[]>(
        `${adminModulePath(endpoint)}?${query}`,
      );
      setItems(Array.isArray(value) ? value : value.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Content couldn’t be loaded.");
    } finally {
      setLoading(false);
    }
  }, [moduleKey, type, search]);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("new") && canEdit(role)) openCreate();
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("edit");
    const record = slug ? items.find((item) => item.slug === slug) : undefined;
    if (record && canEdit(role)) openEdit(record);
  }, [items, role]);
  const body = useMemo(
    () =>
      typeof editor?.content?.body === "string" ? editor.content.body : "",
    [editor],
  );
  function openCreate() {
    setOriginalSlug(null);
    setEditor({ ...blank, author_name: isPosts ? "" : undefined });
  }
  function openEdit(item: ContentRecord) {
    setOriginalSlug(item.slug);
    setEditor({ ...item, content: item.content ?? { body: "" } });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    try {
      const endpoint = await getAdminResourceEndpoint(moduleKey, type);
      const path = adminModulePath(endpoint, originalSlug ?? undefined);
      const saved = await apiFetch<ContentRecord>(path, {
        method: originalSlug ? "PATCH" : "POST",
        body: JSON.stringify(editor),
      });
      setItems((current) =>
        originalSlug
          ? current.map((item) => (item.slug === originalSlug ? saved : item))
          : [saved, ...current],
      );
      setEditor(null);
      toast.success(`${label} ${originalSlug ? "updated" : "created"}`);
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.status === 403
          ? "You don’t have permission to make this change."
          : e instanceof Error
            ? e.message
            : "Save failed.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove() {
    if (!deleteTarget) return;
    try {
      const endpoint = await getAdminResourceEndpoint(moduleKey, type);
      await apiFetch(adminModulePath(endpoint, deleteTarget.slug), {
        method: "DELETE",
      });
      setItems((current) =>
        current.filter((item) => item.slug !== deleteTarget.slug),
      );
      toast.success(`${label} deleted`);
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="Content"
        title={isPosts ? "Posts" : "Pages"}
        description={
          isPosts
            ? "Write updates, stories, and articles for your audience."
            : "Create and maintain the core content of your website."
        }
        actions={
          canEdit(role) ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              New {label.toLowerCase()}
            </Button>
          ) : undefined
        }
      />
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={`Search ${type}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? label.toLowerCase() : type}
            </p>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4].map((x) => (
                <Skeleton key={x} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="grid min-h-64 place-items-center p-6 text-center">
              <div>
                <p className="font-medium">Couldn’t load {type}</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" className="mt-4" onClick={load}>
                  Try again
                </Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Icon}
              title={search ? `No ${type} found` : `No ${type} yet`}
              description={
                search
                  ? "Try a different search term."
                  : `Create your first ${label.toLowerCase()} to get started.`
              }
              action={
                !search && canEdit(role)
                  ? `Create ${label.toLowerCase()}`
                  : undefined
              }
              onAction={openCreate}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-175 text-left">
                <thead>
                  <tr className="border-b bg-neutral-50/70 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Updated</th>
                    <th className="px-5 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr
                      key={item.id ?? item.slug}
                      className="group hover:bg-neutral-50/60"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          /{item.slug}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            item.status === "published" ? "success" : "warning"
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {formatDate(item.updated_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {canEdit(role) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(item)}
                              aria-label={`Edit ${item.title}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                          {canDelete(role) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(item)}
                              aria-label={`Delete ${item.title}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                          {!canEdit(role) && (
                            <MoreHorizontal className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent>
          <DialogTitle>
            {originalSlug
              ? `Edit ${label.toLowerCase()}`
              : `New ${label.toLowerCase()}`}
          </DialogTitle>
          <DialogDescription>
            Manage content, publishing, and search metadata in one place.
          </DialogDescription>
          {editor && (
            <form onSubmit={save} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium">Title</span>
                  <Input
                    value={editor.title}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        title: e.target.value,
                        slug: originalSlug
                          ? editor.slug
                          : slugify(e.target.value),
                      })
                    }
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium">
                    URL slug
                  </span>
                  <Input
                    value={editor.slug}
                    onChange={(e) =>
                      setEditor({ ...editor, slug: slugify(e.target.value) })
                    }
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium">Status</span>
                  <select
                    className="h-10 w-full rounded-lg border bg-card px-3 text-sm"
                    value={editor.status}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        status: e.target.value as ContentRecord["status"],
                        published_at:
                          e.target.value === "published"
                            ? (editor.published_at ?? new Date().toISOString())
                            : null,
                      })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium">
                    Publication date
                  </span>
                  <Input
                    type="datetime-local"
                    value={editor.published_at?.slice(0, 16) ?? ""}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        published_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                </label>
                {isPosts && (
                  <>
                    <label>
                      <span className="mb-2 block text-sm font-medium">
                        Author
                      </span>
                      <Input
                        value={editor.author_name ?? ""}
                        onChange={(e) =>
                          setEditor({ ...editor, author_name: e.target.value })
                        }
                      />
                    </label>
                    <div>
                      <span className="mb-2 block text-sm font-medium">
                        Featured image
                      </span>
                      <MediaPicker
                        value={editor.featured_image ?? ""}
                        onChange={(featuredImage) =>
                          setEditor({
                            ...editor,
                            featured_image: featuredImage,
                          })
                        }
                      />
                    </div>
                    <label className="sm:col-span-2">
                      <span className="mb-2 block text-sm font-medium">
                        Tags
                      </span>
                      <Input
                        value={(editor.tags ?? []).join(", ")}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            tags: e.target.value
                              .split(",")
                              .map((tag) => tag.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="News, Company, Updates"
                      />
                    </label>
                  </>
                )}
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium">
                    Summary
                  </span>
                  <Textarea
                    className="min-h-20"
                    value={editor.excerpt ?? ""}
                    onChange={(e) =>
                      setEditor({ ...editor, excerpt: e.target.value })
                    }
                    placeholder="A short description for cards and search results."
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium">Body</span>
                  <Textarea
                    className="min-h-48"
                    value={body}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        content: { ...editor.content, body: e.target.value },
                      })
                    }
                    placeholder="Write your content here…"
                  />
                </label>
                {!isPosts && (
                  <>
                    <label>
                      <span className="mb-2 block text-sm font-medium">
                        SEO title
                      </span>
                      <Input
                        value={String(editor.seo?.title ?? "")}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            seo: { ...editor.seo, title: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label>
                      <span className="mb-2 block text-sm font-medium">
                        SEO description
                      </span>
                      <Textarea
                        className="min-h-20"
                        value={String(editor.seo?.description ?? "")}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            seo: { ...editor.seo, description: e.target.value },
                          })
                        }
                      />
                    </label>
                  </>
                )}
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
                  {originalSlug ? "Save changes" : "Create draft"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>Delete “{deleteTarget?.title}”?</DialogTitle>
          <DialogDescription>
            This action can’t be undone. The {label.toLowerCase()} will be
            permanently removed.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              Delete {label.toLowerCase()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
