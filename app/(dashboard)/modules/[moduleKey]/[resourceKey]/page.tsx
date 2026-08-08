"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteAdminModuleRecord,
  deleteAdminSupportRecord,
  getAdminModuleDirectory,
  getAdminModuleRecords,
  getAdminSupportRecords,
  runAdminModuleAction,
  saveAdminModuleRecord,
  saveAdminSupportRecord,
} from "@/lib/module-api";
import type {
  ModuleRecord,
  ModuleRecordStatus,
  ModuleResourceContract,
  ResourceField,
} from "@/lib/types";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { useAuth } from "@/components/providers/app-providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { slugify } from "@/lib/utils";
import { canDelete, canEdit } from "@/lib/auth";

const PAGE_SIZE = 15;
const selectClass =
  "h-10 w-full rounded-lg border bg-card px-3 text-sm shadow-xs focus:border-primary focus:ring-3 focus:ring-primary/10";

const label = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

type RelationOptions = Record<string, ModuleRecord[]>;

interface RecordForm {
  title: string;
  slug: string;
  status: ModuleRecordStatus;
  visibility: "public" | "private";
  sort_order: number;
}

const emptyForm: RecordForm = {
  title: "",
  slug: "",
  status: "draft",
  visibility: "private",
  sort_order: 0,
};

export default function ModuleResourcePage({
  params,
}: {
  params: Promise<{ moduleKey: string; resourceKey: string }>;
}) {
  const { role } = useAuth();
  const mayEdit = canEdit(role);
  const mayDelete = canDelete(role);
  const [keys, setKeys] = useState<{
    moduleKey: string;
    resourceKey: string;
  }>();
  const [resource, setResource] = useState<ModuleResourceContract>();
  const [items, setItems] = useState<ModuleRecord[]>([]);
  const [relations, setRelations] = useState<RelationOptions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [ordering, setOrdering] = useState("-updated_at");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ModuleRecord>();
  const [form, setForm] = useState<RecordForm>(emptyForm);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [lineItems, setLineItems] = useState<Record<string, unknown>[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busyRecord, setBusyRecord] = useState<string>();

  useEffect(() => {
    params.then(setKeys);
  }, [params]);

  useEffect(() => {
    if (!keys) return;
    let active = true;
    setLoading(true);
    getAdminModuleDirectory()
      .then((directory) => {
        if (!active) return;
        const found = directory
          .find((item) => item.key === keys.moduleKey)
          ?.resources.find((item) => item.key === keys.resourceKey);
        if (!found)
          throw new Error(
            "This resource is not enabled for the current tenant.",
          );
        setResource(found);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "This resource could not be loaded.",
          );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [keys]);

  async function loadRecords(currentResource = resource) {
    if (!currentResource) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await getAdminModuleRecords(
        currentResource.admin_endpoint,
        {
          search: query.trim(),
          status: statusFilter,
          visibility: visibilityFilter,
          ordering,
        },
      );
      setItems(Array.isArray(response) ? response : response.results);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This resource could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!resource) return;
    const timer = window.setTimeout(() => loadRecords(resource), 250);
    return () => window.clearTimeout(timer);
    // loadRecords deliberately responds to these filters only.
  }, [resource, query, statusFilter, visibilityFilter, ordering]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!resource) return;
    const relationFields = [
      ...resource.fields.map((field) => ({ field, key: field.key })),
      ...(resource.line_items?.fields ?? []).map((field) => ({
        field,
        key: `line:${field.key}`,
      })),
      ...(resource.support?.fields ?? []).map((field) => ({
        field,
        key: `support:${field.key}`,
      })),
    ].filter(({ field }) => field.relation_endpoint);
    if (!relationFields.length) {
      setRelations({});
      return;
    }
    Promise.all(
      relationFields.map(async ({ field, key }) => {
        try {
          const response = await getAdminModuleRecords(
            field.relation_endpoint!,
            { ordering: "title" },
          );
          return [
            key,
            Array.isArray(response) ? response : response.results,
          ] as const;
        } catch {
          return [key, []] as const;
        }
      }),
    ).then((entries) => setRelations(Object.fromEntries(entries)));
  }, [resource]);

  useEffect(
    () => setPage(1),
    [query, statusFilter, visibilityFilter, ordering],
  );

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visibleItems = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  );

  function beginCreate() {
    setEditing(undefined);
    setForm(emptyForm);
    setData({});
    setLineItems([]);
    setFieldErrors({});
    setEditorOpen(true);
  }

  function edit(item: ModuleRecord) {
    setEditing(item);
    setForm({
      title: item.title ?? "",
      slug: item.slug,
      status: item.status,
      visibility: item.visibility,
      sort_order: item.sort_order ?? 0,
    });
    setData(
      Object.fromEntries(
        (resource?.fields ?? []).map((field) => {
          const value = item[field.key];
          if (field.type === "json")
            return [
              field.key,
              value == null ? "" : JSON.stringify(value, null, 2),
            ];
          if (field.type === "datetime" && typeof value === "string")
            return [field.key, value.slice(0, 16)];
          return [field.key, value ?? ""];
        }),
      ),
    );
    setLineItems(
      Array.isArray(item.line_items)
        ? (item.line_items as Record<string, unknown>[])
        : [],
    );
    setFieldErrors({});
    setEditorOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField(field: ResourceField, value: string | boolean | File) {
    let next: unknown = value;
    if ((field.type === "number" || field.type === "relation") && value !== "")
      next = Number(value);
    setData((current) => ({ ...current, [field.key]: next }));
    setFieldErrors((current) => ({ ...current, [field.key]: "" }));
  }

  function buildPayload(nextStatus?: ModuleRecordStatus) {
    const errors: Record<string, string> = {};
    const fields = Object.fromEntries(
      (resource?.fields ?? []).flatMap((field) => {
        const raw = data[field.key];
        if (raw === "" || raw === undefined) return [];
        if (field.type === "file" && typeof raw === "string") return [];
        if (field.type !== "json") return [[field.key, raw]];
        try {
          return [[field.key, typeof raw === "string" ? JSON.parse(raw) : raw]];
        } catch {
          errors[field.key] = "Enter valid JSON.";
          return [];
        }
      }),
    );
    setFieldErrors(errors);
    if (Object.keys(errors).length) return null;
    return {
      ...(editing ? { id: editing.id } : {}),
      ...fields,
      title: form.title,
      slug: form.slug || slugify(form.title),
      status: nextStatus ?? form.status,
      visibility: form.visibility,
      sort_order: form.sort_order,
      ...(resource?.line_items ? { line_items: lineItems } : {}),
    };
  }

  async function save(event: React.FormEvent, nextStatus?: ModuleRecordStatus) {
    event.preventDefault();
    if (!resource) return;
    const payload = buildPayload(nextStatus);
    if (!payload) {
      setError("Fix the highlighted fields before saving.");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await saveAdminModuleRecord(resource.admin_endpoint, payload);
      setEditorOpen(false);
      setEditing(undefined);
      await loadRecords(resource);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The record could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: ModuleRecord) {
    if (
      !resource ||
      !window.confirm(`Permanently delete ${item.title || item.slug}?`)
    )
      return;
    setBusyRecord(String(item.id));
    setError(undefined);
    try {
      await deleteAdminModuleRecord(resource.admin_endpoint, item);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editing?.id === item.id) setEditorOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The record could not be deleted.",
      );
    } finally {
      setBusyRecord(undefined);
    }
  }

  async function applyAction(item: ModuleRecord, action: string) {
    if (!resource) return;
    setBusyRecord(String(item.id));
    setError(undefined);
    try {
      const saved = await runAdminModuleAction(
        resource.admin_endpoint,
        item,
        action,
      );
      setItems((current) =>
        current.map((entry) => (entry.id === saved.id ? saved : entry)),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The workflow transition could not be applied.",
      );
    } finally {
      setBusyRecord(undefined);
    }
  }

  const resourceName = keys ? label(keys.resourceKey) : "Module resource";
  const summaryFields =
    resource?.fields
      .filter((field) => !["json", "textarea"].includes(field.type))
      .slice(0, 3) ?? [];

  return (
    <>
      <PageHeading
        eyebrow={keys ? label(keys.moduleKey) : "Modules"}
        title={resourceName}
        description={`Create, organize, publish, and operate ${resourceName.toLowerCase()} for this tenant.`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => loadRecords()}
              disabled={loading}
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </Button>
            {mayEdit && (
              <Button onClick={beginCreate}>
                <Plus className="size-4" /> New {resourceName.replace(/s$/, "")}
              </Button>
            )}
          </>
        }
      />

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/[0.03]">
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {editorOpen && (
        <Card className="mb-5 border-primary/20">
          <CardHeader className="border-b">
            <CardTitle>
              {editing
                ? `Edit ${editing.title || editing.slug}`
                : `Create ${resourceName.replace(/s$/, "")}`}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Required fields are marked with an asterisk. Publishing and
              operational status are managed separately.
            </p>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={(event) => save(event)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel label="Record title" required>
                  <Input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                        slug:
                          editing || current.slug
                            ? current.slug
                            : slugify(event.target.value),
                      }))
                    }
                    required
                  />
                </FieldLabel>
                <FieldLabel
                  label="Slug"
                  required
                  help="Used in API detail URLs and public links."
                >
                  <Input
                    value={form.slug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        slug: slugify(event.target.value),
                      }))
                    }
                    required
                  />
                </FieldLabel>
                <FieldLabel label="Publishing status">
                  <select
                    className={selectClass}
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as ModuleRecordStatus,
                      }))
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </FieldLabel>
                <FieldLabel
                  label="Visibility"
                  help="Public records can be delivered to the website after publishing."
                >
                  <select
                    className={selectClass}
                    value={form.visibility}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        visibility: event.target.value as "public" | "private",
                      }))
                    }
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </FieldLabel>
                <FieldLabel
                  label="Sort order"
                  help="Lower numbers appear first where ordering is supported."
                >
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sort_order: Number(event.target.value),
                      }))
                    }
                  />
                </FieldLabel>
              </div>

              {!!resource?.fields.length && (
                <div>
                  <h3 className="mb-4 border-b pb-3 text-sm font-semibold">
                    {resourceName} details
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {resource.fields.map((field) => (
                      <ResourceInput
                        key={field.key}
                        field={field}
                        value={data[field.key]}
                        options={relations[field.key] ?? []}
                        error={fieldErrors[field.key]}
                        onChange={(value) => updateField(field, value)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {resource?.line_items && (
                <LineItemsEditor
                  contract={resource.line_items}
                  items={lineItems}
                  relations={relations}
                  onChange={setLineItems}
                />
              )}

              {editing && resource?.support && (
                <SupportRecordsEditor
                  contract={resource.support}
                  parentId={editing.id}
                  relations={relations}
                />
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditorOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="secondary" disabled={saving}>
                  {saving && <LoaderCircle className="size-4 animate-spin" />}{" "}
                  Save
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={(event) => save(event, "published")}
                >
                  {saving && <LoaderCircle className="size-4 animate-spin" />}{" "}
                  Save & publish
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={`Search ${resourceName.toLowerCase()}…`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              className={`${selectClass} lg:w-40`}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by publishing status"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <select
              className={`${selectClass} lg:w-40`}
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value)}
              aria-label="Filter by visibility"
            >
              <option value="">All visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <select
              className={`${selectClass} lg:w-44`}
              value={ordering}
              onChange={(event) => setOrdering(event.target.value)}
              aria-label="Sort records"
            >
              <option value="-updated_at">Recently updated</option>
              <option value="-created_at">Newest first</option>
              <option value="title">Title A–Z</option>
              <option value="-title">Title Z–A</option>
            </select>
          </div>

          {loading && !items.length ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 size-4 animate-spin" /> Loading
              records…
            </div>
          ) : visibleItems.length ? (
            <div className="divide-y">
              {visibleItems.map((item) => {
                const isBusy = busyRecord === String(item.id);
                const workflowActions =
                  resource?.workflow?.map((state) => ({
                    value: `set-${state.value}`,
                    label: state.label,
                  })) ?? [];
                return (
                  <div
                    key={String(item.id)}
                    className="grid gap-3 p-4 lg:grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      {mayEdit ? (
                        <button
                          className="block max-w-full truncate text-left font-medium hover:text-primary"
                          onClick={() => edit(item)}
                        >
                          {item.title || item.slug}
                        </button>
                      ) : (
                        <p className="truncate font-medium">
                          {item.title || item.slug}
                        </p>
                      )}
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        /{item.slug}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge
                          variant={
                            item.status === "published"
                              ? "success"
                              : item.status === "archived"
                                ? "neutral"
                                : "warning"
                          }
                        >
                          {label(item.status)}
                        </Badge>
                        <Badge
                          variant={
                            item.visibility === "public" ? "brand" : "neutral"
                          }
                        >
                          {label(item.visibility)}
                        </Badge>
                        {typeof item.operational_status === "string" && (
                          <Badge>{label(item.operational_status)}</Badge>
                        )}
                      </div>
                    </div>
                    <dl className="grid gap-1 text-xs">
                      {summaryFields.map((field) => (
                        <div key={field.key} className="flex min-w-0 gap-2">
                          <dt className="shrink-0 text-muted-foreground">
                            {field.label}
                          </dt>
                          <dd className="truncate font-medium">
                            {relationDisplay(
                              field,
                              item[field.key],
                              relations[field.key],
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {mayEdit && (
                        <select
                          className="h-8 rounded-lg border bg-card px-2 text-xs"
                          defaultValue=""
                          disabled={isBusy}
                          aria-label={`Change workflow for ${item.title || item.slug}`}
                          onChange={(event) => {
                            if (event.target.value)
                              applyAction(item, event.target.value);
                            event.target.value = "";
                          }}
                        >
                          <option value="">Actions…</option>
                          {item.status !== "published" && (
                            <option value="publish">Publish</option>
                          )}
                          {item.status === "published" && (
                            <option value="unpublish">Unpublish</option>
                          )}
                          {item.status !== "archived" && (
                            <option value="archive">Archive</option>
                          )}
                          {workflowActions.map((action) => (
                            <option key={action.value} value={action.value}>
                              {action.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {mayEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isBusy}
                          aria-label={`Edit ${item.title || item.slug}`}
                          onClick={() => edit(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {mayDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isBusy}
                          aria-label={`Delete ${item.title || item.slug}`}
                          onClick={() => remove(item)}
                        >
                          {isBusy ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4 text-destructive" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={
                query || statusFilter || visibilityFilter ? Search : FilePlus2
              }
              title={
                query || statusFilter || visibilityFilter
                  ? "No matching records"
                  : `No ${resourceName.toLowerCase()} yet`
              }
              description={
                query || statusFilter || visibilityFilter
                  ? "Try a different search or clear the filters."
                  : "Create the first record to start managing this module."
              }
              action={
                query || statusFilter || visibilityFilter
                  ? "Clear filters"
                  : mayEdit
                    ? "Create record"
                    : undefined
              }
              onAction={() => {
                if (query || statusFilter || visibilityFilter) {
                  setQuery("");
                  setStatusFilter("");
                  setVisibilityFilter("");
                } else beginCreate();
              }}
            />
          )}

          {!!items.length && (
            <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
              <span>
                {items.length} record{items.length === 1 ? "" : "s"}
              </span>
              {pageCount > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page === 1}
                    onClick={() => setPage((current) => current - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span>
                    Page {page} of {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page === pageCount}
                    onClick={() => setPage((current) => current + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function FieldLabel({
  label: fieldLabel,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      <span>
        {fieldLabel}
        {required ? " *" : ""}
      </span>
      <div className="mt-2">{children}</div>
      {(error || help) && (
        <span
          className={`mt-1 block text-xs font-normal ${error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {error || help}
        </span>
      )}
    </label>
  );
}

function ResourceInput({
  field,
  value,
  options,
  error,
  onChange,
}: {
  field: ResourceField;
  value: unknown;
  options: ModuleRecord[];
  error?: string;
  onChange: (value: string | boolean | File) => void;
}) {
  const relationLabel = field.relation_label_field || "title";
  const input =
    field.type === "textarea" || field.type === "json" ? (
      <Textarea
        className={
          field.type === "json" ? "min-h-36 font-mono text-xs" : "min-h-24"
        }
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
        placeholder={field.type === "json" ? "{}" : undefined}
      />
    ) : field.type === "select" ? (
      <select
        className={selectClass}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      >
        <option value="">Select…</option>
        {(field.options ?? []).map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    ) : field.type === "relation" && field.relation_endpoint ? (
      <select
        className={selectClass}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      >
        <option value="">
          {options.length ? "Select…" : "No related records available"}
        </option>
        {options.map((option) => (
          <option key={String(option.id)} value={String(option.id)}>
            {displayValue(option[relationLabel] ?? option.title ?? option.slug)}
          </option>
        ))}
      </select>
    ) : field.type === "file" ? (
      <div className="space-y-2">
        {typeof value === "string" && value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-xs font-medium text-primary hover:underline"
          >
            Current file: {value.split("/").pop()}
          </a>
        )}
        <Input
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onChange(file);
          }}
          required={field.required && !value}
        />
      </div>
    ) : field.type === "boolean" ? (
      <label className="flex h-10 items-center gap-3 rounded-lg border px-3 font-normal">
        <input
          type="checkbox"
          className="size-4"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />{" "}
        Enabled
      </label>
    ) : (
      <Input
        type={
          field.type === "datetime"
            ? "datetime-local"
            : field.type === "relation"
              ? "number"
              : field.type
        }
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    );
  return (
    <FieldLabel
      label={field.label}
      required={field.required}
      help={field.help_text}
      error={error}
    >
      {input}
    </FieldLabel>
  );
}

function LineItemsEditor({
  contract,
  items,
  relations,
  onChange,
}: {
  contract: NonNullable<ModuleResourceContract["line_items"]>;
  items: Record<string, unknown>[];
  relations: RelationOptions;
  onChange: (items: Record<string, unknown>[]) => void;
}) {
  function update(
    index: number,
    field: ResourceField,
    value: string | boolean | File,
  ) {
    let next: unknown = value;
    if ((field.type === "number" || field.type === "relation") && value !== "")
      next = Number(value);
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field.key]: next } : item,
      ),
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold">{contract.label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Totals are calculated by the backend from these rows.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, {}])}
        >
          <Plus className="size-3.5" /> Add line
        </Button>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Line {index + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange(
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2 className="size-3.5 text-destructive" /> Remove
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {contract.fields.map((field) => (
                  <ResourceInput
                    key={field.key}
                    field={field}
                    value={item[field.key]}
                    options={relations[`line:${field.key}`] ?? []}
                    onChange={(value) => update(index, field, value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onChange([{}])}
          className="w-full rounded-xl border border-dashed p-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          Add the first line item
        </button>
      )}
    </div>
  );
}

function SupportRecordsEditor({
  contract,
  parentId,
  relations,
}: {
  contract: NonNullable<ModuleResourceContract["support"]>;
  parentId: string | number;
  relations: RelationOptions;
}) {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [editor, setEditor] = useState<Record<string, unknown>>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAdminSupportRecords(
        contract.endpoint,
        contract.parent_field,
        parentId,
      );
      setRecords(Array.isArray(response) ? response : response.results);
    } catch (cause) {
      setErrorMessage(
        cause instanceof Error
          ? cause.message
          : "Related records could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [contract.endpoint, contract.parent_field, parentId]);

  useEffect(() => {
    load();
  }, [load]);

  function update(field: ResourceField, value: string | boolean | File) {
    let next: unknown = value;
    if ((field.type === "number" || field.type === "relation") && value !== "")
      next = Number(value);
    setEditor((current) => ({ ...(current ?? {}), [field.key]: next }));
  }

  async function saveRelated() {
    if (!editor) return;
    const payload = { ...editor, [contract.parent_field]: parentId };
    for (const field of contract.fields.filter(
      (item) => item.type === "file",
    )) {
      if (typeof payload[field.key] === "string") delete payload[field.key];
    }
    for (const field of contract.fields.filter(
      (item) => item.type === "json",
    )) {
      const value = payload[field.key];
      if (typeof value === "string") {
        try {
          payload[field.key] = JSON.parse(value);
        } catch {
          setErrorMessage(`${field.label} must be valid JSON.`);
          return;
        }
      }
    }
    setSaving(true);
    setErrorMessage(undefined);
    try {
      await saveAdminSupportRecord(contract.endpoint, payload);
      setEditor(undefined);
      await load();
    } catch (cause) {
      setErrorMessage(
        cause instanceof Error
          ? cause.message
          : "The related record could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeRelated(record: Record<string, unknown>) {
    if (!record.id || !window.confirm("Delete this related record?")) return;
    try {
      await deleteAdminSupportRecord(contract.endpoint, String(record.id));
      setRecords((current) => current.filter((item) => item.id !== record.id));
    } catch (cause) {
      setErrorMessage(
        cause instanceof Error
          ? cause.message
          : "The related record could not be deleted.",
      );
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold">{contract.label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage operational records attached to this item.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditor({})}
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </div>
      {errorMessage && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
      {editor && (
        <div className="mb-4 rounded-xl border bg-muted/20 p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {contract.fields.map((field) => (
              <ResourceInput
                key={field.key}
                field={field}
                value={editor[field.key]}
                options={relations[`support:${field.key}`] ?? []}
                onChange={(value) => update(field, value)}
              />
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditor(undefined)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={saveRelated}
            >
              {saving && <LoaderCircle className="size-3.5 animate-spin" />}{" "}
              Save
            </Button>
          </div>
        </div>
      )}
      {loading ? (
        <p className="py-4 text-sm text-muted-foreground">
          Loading {contract.label.toLowerCase()}…
        </p>
      ) : records.length ? (
        <div className="divide-y rounded-xl border">
          {records.map((record) => (
            <div
              key={String(record.id)}
              className="flex items-center gap-3 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {contract.fields
                    .map((field) =>
                      relationDisplay(
                        field,
                        record[field.key],
                        relations[`support:${field.key}`],
                      ),
                    )
                    .filter((value) => value !== "—")
                    .slice(0, 2)
                    .join(" · ") || `Record ${record.id}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {record.created_at
                    ? `Created ${new Date(String(record.created_at)).toLocaleDateString()}`
                    : contract.label}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setEditor(
                    Object.fromEntries(
                      Object.entries(record).map(([key, value]) => [
                        key,
                        typeof value === "object" && value !== null
                          ? JSON.stringify(value, null, 2)
                          : value,
                      ]),
                    ),
                  )
                }
                aria-label="Edit related record"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRelated(record)}
                aria-label="Delete related record"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
          No {contract.label.toLowerCase()} yet.
        </p>
      )}
    </div>
  );
}

function relationDisplay(
  field: ResourceField,
  value: unknown,
  options: ModuleRecord[] = [],
) {
  if (field.type !== "relation") return displayValue(value);
  const option = options.find((entry) => String(entry.id) === String(value));
  return displayValue(
    option?.[field.relation_label_field || "title"] ?? option?.title ?? value,
  );
}
