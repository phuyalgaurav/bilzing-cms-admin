"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, LoaderCircle, Plus, Tag, X } from "lucide-react";
import {
  addAdminRecordAttachment,
  addAdminRecordNote,
  addAdminRecordTag,
  getAdminRecordContext,
  removeAdminRecordTag,
} from "@/lib/module-api";
import type { RecordContext } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

const emptyContext: RecordContext = {
  tags: [],
  notes: [],
  attachments: [],
  activity: [],
};

const label = (value: string) =>
  value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function ModuleRecordContext({
  endpoint,
  slug,
  canEdit,
}: {
  endpoint: string;
  slug: string;
  canEdit: boolean;
}) {
  const [context, setContext] = useState<RecordContext>(emptyContext);
  const [tagName, setTagName] = useState("");
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setContext(await getAdminRecordContext(endpoint, slug));
    } finally {
      setLoading(false);
    }
  }, [endpoint, slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addTag() {
    const name = tagName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await addAdminRecordTag(endpoint, slug, { name });
      setTagName("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(tagSlug: string) {
    setBusy(true);
    try {
      await removeAdminRecordTag(endpoint, slug, tagSlug);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    const body = note.trim();
    if (!body) return;
    setBusy(true);
    try {
      await addAdminRecordNote(endpoint, slug, {
        body,
        assigned_to: assignedTo.trim() || undefined,
      });
      setNote("");
      setAssignedTo("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function uploadAttachment(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      await addAdminRecordAttachment(endpoint, slug, file, file.name);
      if (fileInput.current) fileInput.current.value = "";
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="border-t pt-7">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> Loading record context
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 border-t pt-7">
      <div>
        <h3 className="text-sm font-semibold">Internal context</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Notes, attachments, tags, and a permanent activity trail stay private to your workspace.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {context.tags.map((assignment) => (
            <span
              key={String(assignment.id)}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium"
              style={assignment.tag.color ? { borderColor: assignment.tag.color } : undefined}
            >
              <Tag className="size-3" /> {assignment.tag.name}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void removeTag(assignment.tag.slug)}
                  disabled={busy}
                  aria-label={`Remove ${assignment.tag.name} tag`}
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
          {!context.tags.length && (
            <span className="text-xs text-muted-foreground">No tags</span>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Input
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addTag();
                }
              }}
              placeholder="Add tag"
            />
            <Button type="button" variant="outline" size="icon" disabled={busy} onClick={() => void addTag()} aria-label="Add tag">
              <Plus className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Internal notes</h4>
        {context.notes.map((entry) => (
          <article key={String(entry.id)} className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="whitespace-pre-wrap">{entry.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {entry.author_email || "Workspace member"}
              {entry.assigned_to ? ` · assigned to ${entry.assigned_to}` : ""}
            </p>
          </article>
        ))}
        {canEdit && (
          <div className="space-y-2">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add an internal note" rows={3} />
            <div className="flex gap-2">
              <Input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Assign to email (optional)" type="email" />
              <Button type="button" variant="outline" disabled={busy || !note.trim()} onClick={() => void addNote()}>
                Add note
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Attachments</h4>
        {context.attachments.map((attachment) => (
          <a key={String(attachment.id)} href={attachment.file} target="_blank" rel="noreferrer" className="block rounded-lg border px-3 py-2 text-sm hover:bg-muted">
            {attachment.title || "Attachment"}
          </a>
        ))}
        {canEdit && (
          <div>
            <input ref={fileInput} type="file" className="sr-only" onChange={(event) => void uploadAttachment(event.target.files?.[0])} />
            <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
              <FileUp className="size-4" /> Add attachment
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Activity</h4>
        {context.activity.map((entry) => (
          <p key={String(entry.id)} className="text-xs text-muted-foreground">
            {label(entry.event)}{entry.actor_email ? ` by ${entry.actor_email}` : ""}
          </p>
        ))}
        {!context.activity.length && <p className="text-xs text-muted-foreground">No activity yet.</p>}
      </div>
    </section>
  );
}
