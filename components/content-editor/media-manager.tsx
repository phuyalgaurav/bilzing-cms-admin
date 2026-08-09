"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  FileImage,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { adminModulePath, getAdminResourceEndpoint } from "@/lib/module-api";
import { API_URL } from "@/lib/tenant-config";
import { canDelete, canEdit } from "@/lib/auth";
import type { MediaRecord, Paginated } from "@/lib/types";
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
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const imagePattern = /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i;

function mediaUrl(value?: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  return API_URL ? new URL(value, `${API_URL}/`).toString() : value;
}

export function MediaManager() {
  const { role } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<MediaRecord>();
  const [pendingFile, setPendingFile] = useState<File>();
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAltText, setUploadAltText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MediaRecord>();
  const [metadataText, setMetadataText] = useState("{}");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = await getAdminResourceEndpoint("media_library", "media");
      const query = new URLSearchParams({ ordering: "-created_at" });
      if (search) query.set("search", search);
      const value = await apiFetch<Paginated<MediaRecord> | MediaRecord[]>(
        `${adminModulePath(endpoint)}?${query}`,
      );
      setItems(Array.isArray(value) ? value : value.results);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Media could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  function chooseFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPendingFile(file);
    setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
    setUploadAltText("");
  }

  async function upload() {
    const file = pendingFile;
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.set("title", uploadTitle.trim() || file.name.replace(/\.[^.]+$/, ""));
    form.set("alt_text", uploadAltText.trim());
    form.set(
      "metadata",
      JSON.stringify({
        original_name: file.name,
        size: file.size,
        content_type: file.type,
      }),
    );
    form.set("file", file);
    try {
      const saved = await apiFetch<MediaRecord>(
        adminModulePath(await getAdminResourceEndpoint("media_library", "media")),
        {
          method: "POST",
          body: form,
        },
      );
      setItems((current) => [saved, ...current]);
      setPendingFile(undefined);
      toast.success("Media uploaded");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  function openEdit(item: MediaRecord) {
    setEditor({ ...item });
    setMetadataText(JSON.stringify(item.metadata ?? {}, null, 2));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    let metadata: Record<string, unknown>;
    try {
      metadata = JSON.parse(metadataText) as Record<string, unknown>;
    } catch {
      toast.error("Metadata must be valid JSON.");
      return;
    }
    setSaving(true);
    try {
      const updated = await apiFetch<MediaRecord>(
        adminModulePath(
          await getAdminResourceEndpoint("media_library", "media"),
          String(editor.id),
        ),
        {
          method: "PATCH",
          body: JSON.stringify({
            title: editor.title,
            alt_text: editor.alt_text,
            metadata,
          }),
        },
      );
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditor(undefined);
      toast.success("Media details updated");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: MediaRecord) {
    try {
      await apiFetch(
        adminModulePath(
          await getAdminResourceEndpoint("media_library", "media"),
          String(item.id),
        ),
        { method: "DELETE" },
      );
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setDeleteTarget(undefined);
      toast.success("Media deleted");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Delete failed");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Library"
        title="Media"
        description="Upload and manage images, documents, alt text, and file metadata."
        actions={
          canEdit(role) ? (
            <>
              <input
                ref={input}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                onChange={(event) => chooseFile(event.target.files)}
              />
              <Button
                onClick={() => input.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Upload media
              </Button>
            </>
          ) : undefined
        }
      />
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search media…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="aspect-square" />
              ))}
            </div>
          ) : error ? (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <p className="font-medium">Couldn’t load media</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" className="mt-4" onClick={load}>
                  Try again
                </Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={ImagePlus}
              title="No media yet"
              description="Upload an image or document to use throughout the site."
              action={canEdit(role) ? "Upload media" : undefined}
              onAction={() => input.current?.click()}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => {
                const src = mediaUrl(item.file ?? item.url);
                const isImage = Boolean(src && imagePattern.test(src));
                return (
                  <div
                    key={item.id}
                    className="group overflow-hidden rounded-xl border bg-card"
                  >
                    <div className="relative aspect-square bg-muted">
                      {src && isImage ? (
                        <Image
                          src={src}
                          alt={item.alt_text || item.title}
                          fill
                          sizes="(max-width: 640px) 50vw, 20vw"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <FileImage className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {canEdit(role) && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8 bg-card"
                            onClick={() => openEdit(item)}
                            aria-label={`Edit ${item.title}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {canDelete(role) && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="size-8"
                            onClick={() => setDeleteTarget(item)}
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.alt_text ||
                          (isImage ? "No alt text" : "Document")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={!!pendingFile}
        onOpenChange={(open) => !open && setPendingFile(undefined)}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle>Add media details</DialogTitle>
          <DialogDescription>
            Give this file a clear name and alternative text before uploading it.
          </DialogDescription>
          {pendingFile && (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void upload();
              }}
            >
              <p className="text-sm text-muted-foreground">{pendingFile.name}</p>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Name</span>
                <Input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Alternative text</span>
                <Input value={uploadAltText} onChange={(event) => setUploadAltText(event.target.value)} placeholder="Describe this image for screen readers" />
              </label>
              <div className="flex justify-end gap-2 border-t pt-5">
                <Button type="button" variant="outline" onClick={() => setPendingFile(undefined)}>Cancel</Button>
                <Button type="submit" disabled={uploading}>
                  {uploading && <LoaderCircle className="size-4 animate-spin" />}
                  Upload media
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editor}
        onOpenChange={(open) => !open && setEditor(undefined)}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle>Edit media details</DialogTitle>
          <DialogDescription>
            Use concise, descriptive alternative text for meaningful images.
          </DialogDescription>
          {editor && (
            <form onSubmit={save} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Title</span>
                <Input
                  value={editor.title}
                  onChange={(event) =>
                    setEditor({ ...editor, title: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Alternative text
                </span>
                <Input
                  value={editor.alt_text ?? ""}
                  onChange={(event) =>
                    setEditor({ ...editor, alt_text: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Metadata</span>
                <Textarea
                  className="min-h-36 font-mono text-xs"
                  value={metadataText}
                  onChange={(event) => setMetadataText(event.target.value)}
                />
              </label>
              <div className="flex justify-end gap-2 border-t pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditor(undefined)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <LoaderCircle className="size-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(undefined)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Delete media?</DialogTitle>
          <DialogDescription>
            This permanently removes {deleteTarget?.title || "this file"} and its stored file.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && void remove(deleteTarget)}>Delete media</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
