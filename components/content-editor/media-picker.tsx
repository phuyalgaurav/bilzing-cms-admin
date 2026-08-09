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

function mediaUrl(item: MediaRecord) {
  return item.file || item.url || "";
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
  const uploadInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.set("title", file.name.replace(/\.[^.]+$/, ""));
    form.set("alt_text", "");
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
      {compact ? (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <ImageIcon className="size-4" /> Add image
        </Button>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="relative aspect-[16/7] bg-muted">
            {value ? (
              <Image
                src={value}
                alt="Selected image"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                <ImageIcon className="size-7" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
            >
              <ImageIcon className="size-4" />{" "}
              {value ? "Replace image" : "Choose image"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
              >
                <Trash2 className="size-4" /> Remove
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle>Choose image</DialogTitle>
              <DialogDescription className="sr-only">
                Select an existing image or upload a new one.
              </DialogDescription>
            </div>
            <input
              ref={uploadInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => upload(event.target.files)}
            />
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
                  const selected = url === value;
                  return (
                    <button
                      key={String(item.id)}
                      type="button"
                      onClick={() => {
                        onChange(url);
                        setOpen(false);
                      }}
                      className="group overflow-hidden rounded-lg border text-left hover:border-primary"
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
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">
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
                src={url}
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
