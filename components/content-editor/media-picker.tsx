"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  ImageIcon,
  LoaderCircle,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { getAdminModuleRecords, getAdminResourceEndpoint } from "@/lib/module-api";
import type { MediaRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveMediaUrl } from "@/lib/media-url";

function mediaUrl(item: MediaRecord) {
  return resolveMediaUrl(item.file || item.url);
}

function getMediaEndpoint() {
  return getAdminResourceEndpoint("media_library", "media");
}

export function MediaPicker({
  value,
  onChange,
  compact = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const previewUrl = resolveMediaUrl(value);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File>();
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAltText, setUploadAltText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = await getMediaEndpoint();
      const response = await getAdminModuleRecords(endpoint, {
        ordering: "-created_at",
        search: query,
      });
      setItems(Array.isArray(response) ? response : response.results);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Could not load media.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [load, open]);

  function queueUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPendingFile(file);
    setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
    setUploadAltText("");
    setOpen(true);
  }

  async function upload() {
    const file = pendingFile;
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.set("title", uploadTitle.trim() || file.name.replace(/\.[^.]+$/, ""));
    form.set("alt_text", uploadAltText.trim());
    form.set("file", file);
    form.set(
      "metadata",
      JSON.stringify({
        original_name: file.name,
        size: file.size,
        content_type: file.type,
      }),
    );
    try {
      const saved = await apiFetch<MediaRecord>(await getMediaEndpoint(), {
        method: "POST",
        body: form,
      });
      const url = mediaUrl(saved);
      setItems((current) => [saved, ...current]);
      if (url) onChange(url);
      setPendingFile(undefined);
      setOpen(false);
      toast.success("Image uploaded");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (uploadInput.current) uploadInput.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={uploadInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => queueUpload(event.target.files)}
      />
      {compact ? (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <ImageIcon className="size-4" /> Add image
        </Button>
      ) : (
        <div
          className={`overflow-hidden rounded-lg border bg-card transition-colors ${dragging ? "border-primary ring-2 ring-primary/10" : "border-border"}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node))
              setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            queueUpload(event.dataTransfer.files);
          }}
        >
          {previewUrl ? (
            <>
              <div className="relative aspect-[16/8] bg-neutral-100">
              <Image
                src={previewUrl}
                alt="Selected image"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
                className="object-cover"
              />
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2.5">
                <div className="mr-auto min-w-0">
                  <p className="text-xs font-semibold">Selected image</p>
                  <p className="max-w-64 truncate text-[11px] text-muted-foreground">
                    {previewUrl.split("/").pop()?.split("?")[0] || "Media library image"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(true)}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange("")}
                  aria-label="Remove selected image"
                >
                  <Trash2 className="size-3.5" /> Remove
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="grid h-auto min-h-48 w-full place-items-center rounded-none p-6 text-center"
              onClick={() => setOpen(true)}
            >
              <span>
                <span className="mx-auto grid size-10 place-items-center rounded-md border bg-white text-muted-foreground">
                  {uploading ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <ImageIcon className="size-5" />
                  )}
                </span>
                <span className="mt-3 block text-sm font-semibold text-foreground">
                  Choose an image
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Select from the media library or drop an image here
                </span>
              </span>
            </Button>
          )}
          {!previewUrl ? (
          <div className="flex items-center justify-center gap-2 border-t bg-neutral-50/70 p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
            >
              <ImageIcon className="size-3.5" /> Browse library
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => uploadInput.current?.click()}>
              <Upload className="size-3.5" /> Upload new
            </Button>
          </div>
          ) : null}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (uploading) return;
          setOpen(nextOpen);
          if (!nextOpen) setPendingFile(undefined);
        }}
      >
        <DialogContent className="max-w-4xl">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle>Choose image</DialogTitle>
              <DialogDescription>
                Reuse an existing image or upload a new one.
              </DialogDescription>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={uploading}
              onClick={() => uploadInput.current?.click()}
            >
              {uploading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload
            </Button>
          </div>

          {pendingFile ? (
            <div className="rounded-lg border bg-neutral-50 p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg border bg-white text-muted-foreground">
                  <ImageIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{pendingFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(pendingFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Image name
                  <Input
                    className="mt-2 bg-white"
                    value={uploadTitle}
                    onChange={(event) => setUploadTitle(event.target.value)}
                    required
                  />
                </label>
                <label className="text-sm font-semibold">
                  Alternative text
                  <Input
                    className="mt-2 bg-white"
                    value={uploadAltText}
                    onChange={(event) => setUploadAltText(event.target.value)}
                    placeholder="Describe the image for accessibility"
                  />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => setPendingFile(undefined)}
                >
                  Cancel upload
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={uploading || !uploadTitle.trim()}
                  onClick={upload}
                >
                  {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Upload & use image
                </Button>
              </div>
            </div>
          ) : null}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search images"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                  <Skeleton key={item} className="aspect-square" />
                ))}
              </div>
            ) : items.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => {
                  const url = mediaUrl(item);
                  if (!url) return null;
                  const selected = url === previewUrl;
                  return (
                    <Button
                      key={String(item.id)}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        onChange(url);
                        setOpen(false);
                      }}
                      className="group h-auto w-full flex-col items-stretch gap-0 overflow-hidden rounded-lg border p-0 text-left hover:border-primary"
                    >
                      <div className="relative aspect-square bg-muted">
                        <Image
                          src={url}
                          alt={item.alt_text || item.title || "Media image"}
                          fill
                          sizes="(max-width: 640px) 50vw, 20vw"
                          unoptimized
                          className="object-cover"
                        />
                        {selected ? (
                          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-4" />
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate px-2.5 py-2 text-xs font-medium">
                        {item.title || "Untitled"}
                      </p>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No images found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MediaGalleryPicker({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: string) => void;
}) {
  let images: string[] = [];
  try {
    const parsed =
      typeof value === "string" ? JSON.parse(value || "[]") : value;
    if (Array.isArray(parsed))
      images = parsed.filter(
        (item): item is string => typeof item === "string",
      );
  } catch {
    images = [];
  }

  return (
    <div className="space-y-3">
      {images.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <Image
                src={resolveMediaUrl(url)}
                alt={`Gallery image ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, 20vw"
                unoptimized
                className="object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 size-8"
                aria-label={`Remove gallery image ${index + 1}`}
                onClick={() =>
                  onChange(
                    JSON.stringify(
                      images.filter((_, itemIndex) => itemIndex !== index),
                    ),
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <MediaPicker
        compact
        onChange={(url) => {
          if (url && !images.includes(url))
            onChange(JSON.stringify([...images, url]));
        }}
      />
    </div>
  );
}
