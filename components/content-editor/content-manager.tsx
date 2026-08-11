"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { LoaderCircle, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, SortableHeader } from "@/components/admin/data-table";
import { FormSection } from "@/components/admin/form-section";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { MediaPicker } from "@/components/content-editor/media-picker";
import { useAuth } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiFetch, ApiError } from "@/lib/api-client";
import { canDelete, canEdit } from "@/lib/auth";
import { adminModulePath, getAdminResourceEndpoint } from "@/lib/module-api";
import type { ContentRecord, Paginated } from "@/lib/types";
import { slugify } from "@/lib/utils";

const contentSchema = z.object({
  title: z.string().trim().min(1, "Enter a title."),
  slug: z.string().trim().min(1, "Enter a URL ending."),
  status: z.enum(["draft", "published"]),
  publishedAt: z.string(),
  authorName: z.string(),
  featuredImage: z.string(),
  tags: z.string(),
  excerpt: z.string(),
  body: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
});
type ContentForm = z.infer<typeof contentSchema>;
const emptyForm: ContentForm = { title: "", slug: "", status: "draft", publishedAt: "", authorName: "", featuredImage: "", tags: "", excerpt: "", body: "", seoTitle: "", seoDescription: "" };

function FieldError({ message }: { message?: string }) { return message ? <p className="mt-1 text-xs text-destructive">{message}</p> : null; }
function displayDate(value?: string) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.valueOf()) ? "—" : format(date, "MMM d, yyyy"); }

export function ContentManager({ type }: { type: "pages" | "posts" }) {
  const isPosts = type === "posts";
  const singular = isPosts ? "Post" : "Page";
  const moduleKey = isPosts ? "blog" : "website_pages";
  const { role } = useAuth();
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<ContentRecord | null>(null);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const form = useForm<ContentForm>({ resolver: zodResolver(contentSchema), defaultValues: emptyForm });
  const { reset } = form;
  const seoTitle = useWatch({ control: form.control, name: "seoTitle" });
  const seoDescription = useWatch({ control: form.control, name: "seoDescription" });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const endpoint = await getAdminResourceEndpoint(moduleKey, type);
      const query = new URLSearchParams({ ordering: "-updated_at" });
      if (search) query.set("search", search);
      const value = await apiFetch<Paginated<ContentRecord> | ContentRecord[]>(`${adminModulePath(endpoint)}?${query}`);
      setItems(Array.isArray(value) ? value : value.results);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Content couldn’t be loaded."); }
    finally { setLoading(false); }
  }, [moduleKey, type, search]);

  const openCreate = useCallback(() => { setOriginalSlug(null); setEditor({ title: "", slug: "", status: "draft", content: { body: "" } }); reset(emptyForm); }, [reset]);
  const openEdit = useCallback((item: ContentRecord) => {
    setOriginalSlug(item.slug); setEditor(item);
    reset({ title: item.title, slug: item.slug, status: item.status, publishedAt: item.published_at?.slice(0, 16) ?? "", authorName: item.author_name ?? "", featuredImage: item.featured_image ?? "", tags: (item.tags ?? []).join(", "), excerpt: item.excerpt ?? "", body: typeof item.content?.body === "string" ? item.content.body : "", seoTitle: String(item.seo?.title ?? ""), seoDescription: String(item.seo?.description ?? "") });
  }, [reset]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.has("new") && canEdit(role)) openCreate(); }, [openCreate, role]);
  useEffect(() => { const slug = new URLSearchParams(window.location.search).get("edit"); const record = slug ? items.find((item) => item.slug === slug) : undefined; if (record && canEdit(role)) openEdit(record); }, [items, openEdit, role]);

  function closeEditor() { setEditor(null); setOriginalSlug(null); reset(emptyForm); }

  async function save(values: ContentForm) {
    const payload: ContentRecord = { ...(editor ?? { title: "", slug: "", status: "draft" }), title: values.title, slug: slugify(values.slug), status: values.status, published_at: values.publishedAt ? new Date(values.publishedAt).toISOString() : values.status === "published" ? (editor?.published_at ?? new Date().toISOString()) : null, author_name: isPosts ? values.authorName : undefined, featured_image: isPosts ? values.featuredImage : undefined, tags: isPosts ? values.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : undefined, excerpt: values.excerpt, content: { ...(editor?.content ?? {}), body: values.body }, seo: isPosts ? editor?.seo : { ...(editor?.seo ?? {}), title: values.seoTitle, description: values.seoDescription } };
    try {
      const endpoint = await getAdminResourceEndpoint(moduleKey, type);
      const saved = await apiFetch<ContentRecord>(adminModulePath(endpoint, originalSlug ?? undefined), { method: originalSlug ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setItems((current) => originalSlug ? current.map((item) => item.slug === originalSlug ? saved : item) : [saved, ...current]);
      closeEditor(); toast.success(`${singular} ${originalSlug ? "updated" : "created"}`);
    } catch (cause) { toast.error(cause instanceof ApiError && cause.status === 403 ? "You don’t have permission to make this change." : cause instanceof Error ? cause.message : "Save failed."); }
  }

  async function remove() {
    if (!deleteTarget) return; setDeleting(true);
    try { const endpoint = await getAdminResourceEndpoint(moduleKey, type); await apiFetch(adminModulePath(endpoint, deleteTarget.slug), { method: "DELETE" }); setItems((current) => current.filter((item) => item.slug !== deleteTarget.slug)); toast.success(`${singular} deleted`); setDeleteTarget(null); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Delete failed."); }
    finally { setDeleting(false); }
  }

  const columns = useMemo<ColumnDef<ContentRecord>[]>(() => [
    { accessorKey: "title", header: ({ column }) => <SortableHeader column={column}>Title</SortableHeader>, cell: ({ row }) => <button type="button" className="max-w-96 text-left" onClick={() => canEdit(role) && openEdit(row.original)}><span className="block truncate text-sm font-medium">{row.original.title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">/{row.original.slug}</span></button> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} label={row.original.status === "published" ? "Live" : undefined} /> },
    { accessorKey: "updated_at", header: ({ column }) => <SortableHeader column={column}>Updated</SortableHeader>, cell: ({ row }) => <span className="text-sm text-muted-foreground">{displayDate(row.original.updated_at)}</span>, meta: { className: "hidden sm:table-cell" } },
    { id: "actions", enableHiding: false, header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <div className="flex justify-end"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${row.original.title}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{canEdit(role) ? <DropdownMenuItem onSelect={() => openEdit(row.original)}><Pencil />Edit</DropdownMenuItem> : null}{canDelete(role) ? <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(row.original)}><Trash2 />Delete</DropdownMenuItem></> : null}</DropdownMenuContent></DropdownMenu></div> },
  ], [openEdit, role]);

  return <>
    <PageHeading title={isPosts ? "Posts" : "Pages"} description={isPosts ? "Write, schedule, and publish updates for your audience." : "Create and maintain the pages visitors see on your website."} actions={canEdit(role) ? <Button onClick={openCreate}><Plus className="size-4" />New {singular.toLowerCase()}</Button> : undefined} />
    <DataTable data={items} columns={columns} loading={loading} error={error} onRetry={() => void load()} searchValue={search} onSearchChange={setSearch} searchPlaceholder={`Search ${type}…`} emptyTitle={search ? `No ${type} found` : `No ${type} yet`} emptyDescription={search ? "Try a different search term." : `Create your first ${singular.toLowerCase()} to get started.`} emptyAction={!search && canEdit(role) ? `Create ${singular.toLowerCase()}` : undefined} onEmptyAction={openCreate} getRowId={(row) => String(row.id ?? row.slug)} />

    <Sheet open={Boolean(editor)} onOpenChange={(open) => !open && closeEditor()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-3xl" showCloseButton={false}>
        <SheetHeader className="border-b px-5 py-4"><SheetTitle>{originalSlug ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}</SheetTitle><SheetDescription>Content, publishing, and search details.</SheetDescription></SheetHeader>
        <form id="content-editor-form" onSubmit={form.handleSubmit(save)} className="flex-1 overflow-y-auto px-5">
          <FormSection title="Content" description="The title, summary, and main content visitors will read.">
            <div><Label htmlFor="content-title">Title</Label><Input id="content-title" className="mt-1.5" {...form.register("title", { onChange: (event) => { if (!originalSlug) form.setValue("slug", slugify(event.target.value), { shouldValidate: true }); } })} /><FieldError message={form.formState.errors.title?.message} /></div>
            <div><Label htmlFor="content-summary">Summary</Label><Textarea id="content-summary" className="mt-1.5 min-h-20" placeholder="A short description for cards and search results." {...form.register("excerpt")} /></div>
            <div><Label htmlFor="content-body">Body</Label><Textarea id="content-body" className="mt-1.5 min-h-56" placeholder="Write your content here…" {...form.register("body")} /></div>
          </FormSection>
          {isPosts ? <FormSection title="Post details" description="Optional information used in article listings."><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="content-author">Author</Label><Input id="content-author" className="mt-1.5" {...form.register("authorName")} /></div><div><Label htmlFor="content-tags">Tags</Label><Input id="content-tags" className="mt-1.5" placeholder="News, Company, Updates" {...form.register("tags")} /></div></div><Controller name="featuredImage" control={form.control} render={({ field }) => <div><Label>Featured image</Label><div className="mt-1.5"><MediaPicker value={field.value} onChange={field.onChange} /></div></div>} /></FormSection> : null}
          {!isPosts ? <FormSection title="Search preview" description="How this page can appear in search results."><div><Label htmlFor="seo-title">Search title</Label><Input id="seo-title" className="mt-1.5" {...form.register("seoTitle")} /><p className="mt-1 text-xs text-muted-foreground">{seoTitle.length}/60 characters</p></div><div><Label htmlFor="seo-description">Search description</Label><Textarea id="seo-description" className="mt-1.5 min-h-20" {...form.register("seoDescription")} /><p className="mt-1 text-xs text-muted-foreground">{seoDescription.length}/160 characters</p></div></FormSection> : null}
          <FormSection title="Publishing" description="Control the public URL and when this content is visible."><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="content-slug">URL ending</Label><Input id="content-slug" className="mt-1.5" {...form.register("slug", { onChange: (event) => form.setValue("slug", slugify(event.target.value), { shouldValidate: true }) })} /><FieldError message={form.formState.errors.slug?.message} /></div><Controller name="status" control={form.control} render={({ field }) => <div><Label>Publishing status</Label><Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent></Select></div>} /></div><div className="max-w-xs"><Label htmlFor="published-at">Publication date</Label><Input id="published-at" type="datetime-local" className="mt-1.5" {...form.register("publishedAt")} /></div></FormSection>
        </form>
        <SheetFooter className="flex-row justify-end border-t bg-background px-5 py-3"><Button type="button" variant="outline" onClick={closeEditor}>Cancel</Button><Button type="submit" form="content-editor-form" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}{originalSlug ? "Save changes" : "Create draft"}</Button></SheetFooter>
      </SheetContent>
    </Sheet>
    <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={`Delete “${deleteTarget?.title ?? singular.toLowerCase()}”?`} description={`This permanently removes the ${singular.toLowerCase()}. This action cannot be undone.`} confirmLabel={`Delete ${singular.toLowerCase()}`} onConfirm={() => void remove()} pending={deleting} />
  </>;
}
