"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FilePlus2,
  LoaderCircle,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Phone,
  UserRound,
  X,
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
  ModuleContract,
  ModuleRecord,
  ModuleRecordStatus,
  ModuleResourceContract,
  ResourceField,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import {
  MediaGalleryPicker,
  MediaPicker,
} from "@/components/content-editor/media-picker";
import { slugify } from "@/lib/utils";
import { recommendedTransition } from "@/lib/module-operations";
import {
  moduleExperience,
  resourceExperience,
  titleCase,
  type ResourceView,
} from "@/lib/module-experience";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModuleRecordContext } from "@/components/module-record-context";

const PAGE_SIZE = 15;
const selectClass =
  "h-10 w-full rounded-md border bg-card px-3 text-sm transition-[border-color,box-shadow] duration-150 focus:border-primary focus:ring-3 focus:ring-primary/10";

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

const formatRecordDate = (value: unknown) => {
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime())
    ? displayValue(value)
    : parsed.toLocaleString();
};

const imageFieldPattern = /(^|_)(image|photo|avatar|logo|cover)(_|$)/;
const listJsonFields = new Set([
  "allergies",
  "benefits",
  "countries",
  "dietary_tags",
  "facilities",
  "features",
  "postal_codes",
  "stages",
  "tags",
  "variables",
]);
const recordTitleFields = [
  "name",
  "question",
  "customer",
  "applicant",
  "attendee",
  "patient",
  "treatment",
  "client",
  "event",
  "platform",
  "order_number",
  "invoice_number",
  "reference",
  "email",
  "from_path",
  "event_name",
  "schema_type",
];
function isImageField(field: ResourceField) {
  return field.key === "url" && field.label.toLowerCase().includes("image")
    ? true
    : imageFieldPattern.test(field.key);
}

const fieldSections = ["Details", "Contact", "Pricing", "Schedule", "Inventory"] as const;
type FieldSection = (typeof fieldSections)[number];

function sectionForField(field: ResourceField): FieldSection {
  if (
    /(^|_)(email|phone|address|city|country|postal|contact)(_|$)/.test(field.key)
  )
    return "Contact";
  if (
    /(^|_)(amount|price|cost|fee|subtotal|total|tax|discount|currency|billing)(_|$)/.test(
      field.key,
    )
  )
    return "Pricing";
  if (
    /(^|_)(date|time|start|end|duration|schedule|available|availability|due)(_|$)/.test(
      field.key,
    )
  )
    return "Schedule";
  if (
    /(^|_)(sku|stock|quantity|warehouse|supplier|inventory|weight|unit)(_|$)/.test(
      field.key,
    )
  )
    return "Inventory";
  return "Details";
}

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
  const [keys, setKeys] = useState<{
    moduleKey: string;
    resourceKey: string;
  }>();
  const [resource, setResource] = useState<ModuleResourceContract>();
  const [moduleContract, setModuleContract] = useState<ModuleContract>();
  const [enabledAdminEndpoints, setEnabledAdminEndpoints] = useState<Set<string>>();
  const [resourceContracts, setResourceContracts] = useState<
    Record<string, ModuleResourceContract>
  >({});
  const [items, setItems] = useState<ModuleRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [relations, setRelations] = useState<RelationOptions>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [operationalFilter, setOperationalFilter] = useState("");
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
  const [createSlugSuffix, setCreateSlugSuffix] = useState("");
  const [relatedCreate, setRelatedCreate] = useState<{
    field: ResourceField;
    contract: ModuleResourceContract;
  }>();
  const recordRequest = useRef(0);

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
        const foundModule = directory.find(
          (item) => item.key === keys.moduleKey,
        );
        const found = foundModule?.resources.find(
          (item) => item.key === keys.resourceKey,
        );
        if (!found)
          throw new Error(
            "This resource is not enabled for the current tenant.",
          );
        setModuleContract(foundModule);
        setResource(found);
        setPage(1);
        setEnabledAdminEndpoints(
          new Set(
            directory.flatMap((module) =>
              module.resources.map((item) => item.admin_endpoint),
            ),
          ),
        );
        setResourceContracts(
          Object.fromEntries(
            directory.flatMap((module) =>
              module.resources.map((item) => [item.admin_endpoint, item]),
            ),
          ),
        );
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "This resource could not be loaded.",
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [keys]);

  const loadRecords = useCallback(
    async (currentResource = resource, showRefresh = false) => {
      if (!currentResource) return;
      const requestId = ++recordRequest.current;
      if (showRefresh) setRefreshing(true);
      setError(undefined);
      try {
        const response = await getAdminModuleRecords(
          currentResource.admin_endpoint,
          {
            search: query.trim(),
            status: statusFilter,
            visibility: visibilityFilter,
            operational_status: operationalFilter,
            ordering,
            page,
            pageSize: PAGE_SIZE,
          },
        );
        if (requestId !== recordRequest.current) return;
        setItems(Array.isArray(response) ? response : response.results);
        setTotalCount(Array.isArray(response) ? response.length : response.count);
      } catch (cause) {
        if (requestId !== recordRequest.current) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "This resource could not be loaded.",
        );
      } finally {
        if (requestId === recordRequest.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      operationalFilter,
      ordering,
      page,
      query,
      resource,
      statusFilter,
      visibilityFilter,
    ],
  );

  useEffect(() => {
    if (!resource) return;
    const timer = window.setTimeout(() => loadRecords(resource), 250);
    return () => window.clearTimeout(timer);
  }, [
    loadRecords,
    operationalFilter,
    ordering,
    page,
    query,
    resource,
    statusFilter,
    visibilityFilter,
  ]);

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
    ].filter(
      ({ field }) =>
        field.relation_endpoint &&
        (!enabledAdminEndpoints || enabledAdminEndpoints.has(field.relation_endpoint)),
    );
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
  }, [enabledAdminEndpoints, resource]);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const visibleItems = items;

  function beginRelatedCreate(field: ResourceField) {
    const contract = field.relation_endpoint
      ? resourceContracts[field.relation_endpoint]
      : undefined;
    if (contract?.allowed_actions?.includes("create")) {
      setRelatedCreate({ field, contract });
    }
  }

  function useRelatedRecord(record: ModuleRecord) {
    if (!relatedCreate) return;
    const { field } = relatedCreate;
    setRelations((current) => ({
      ...current,
      [field.key]: [...(current[field.key] ?? []), record],
    }));
    updateField(field, String(record.id));
    setRelatedCreate(undefined);
  }

  function beginCreate() {
    setEditing(undefined);
    setCreateSlugSuffix(Date.now().toString(36));
    setForm(emptyForm);
    setData(
      (resource?.fields ?? []).reduce<Record<string, unknown>>(
        (defaults, field) => {
          if (field.key === "operational_status" && resource?.workflow?.[0]) {
            defaults[field.key] = resource.workflow[0].value;
            return defaults;
          }
          if (
            ["is_active", "is_available", "track_inventory"].includes(field.key)
          ) {
            defaults[field.key] = true;
            return defaults;
          }
          if (field.type === "json") {
            defaults[field.key] =
              listJsonFields.has(field.key) || field.key === "gallery"
                ? "[]"
                : "{}";
          }
          return defaults;
        },
        {},
      ),
    );
    setLineItems([]);
    setFieldErrors({});
    setEditorOpen(true);
  }

  const edit = useCallback((item: ModuleRecord) => {
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
  }, [resource]);

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
    const titleKeys = [
      ...(resourceUX?.primaryFields ?? []),
      ...recordTitleFields,
    ];
    let derivedTitle = "";
    for (const key of titleKeys) {
      const raw = fields[key];
      if (raw === undefined || raw === null || raw === "") continue;
      const field = resource?.fields.find((item) => item.key === key);
      const relation =
        field?.type === "relation"
          ? relations[key]?.find((item) => String(item.id) === String(raw))
          : undefined;
      derivedTitle = displayValue(
        relation?.[field?.relation_label_field || "title"] ??
          relation?.title ??
          raw,
      );
      if (derivedTitle !== "—") break;
    }
    const title =
      derivedTitle ||
      editing?.title ||
      titleCase(resourceUX?.singular ?? "record");
    const baseSlug = slugify(title) || "record";
    const slug =
      editing?.slug ??
      (resource?.public_read
        ? baseSlug
        : `${baseSlug}-${createSlugSuffix || "new"}`);
    return {
      ...(editing ? { id: editing.id } : {}),
      ...fields,
      title,
      slug,
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

  const remove = useCallback(
    async (item: ModuleRecord) => {
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
        setTotalCount((current) => Math.max(0, current - 1));
        setEditorOpen(false);
        setEditing(undefined);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "The record could not be deleted.",
        );
      } finally {
        setBusyRecord(undefined);
      }
    },
    [resource],
  );

  const applyAction = useCallback(async (item: ModuleRecord, action: string) => {
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
  }, [resource]);

  const moduleUX = keys ? moduleExperience(keys.moduleKey) : undefined;
  const resourceUX = keys
    ? resourceExperience(keys.moduleKey, keys.resourceKey)
    : undefined;
  const allowedActions = new Set(resource?.allowed_actions ?? []);
  const mayCreate = allowedActions.has("create");
  const mayEdit = allowedActions.has("edit");
  const mayDelete = allowedActions.has("delete");
  const mayWorkflow = allowedActions.has("workflow");
  const mayPublish = allowedActions.has("publish");
  const mayCreateRecord =
    mayCreate && !(resourceUX?.singleton && items.length > 0);
  const resourceName = resourceUX?.plural ?? "module records";
  const primaryFieldOrder = resourceUX?.primaryFields?.join("\u0000") ?? "";
  const { mediaFields, structuredFields, generalFieldGroups } = useMemo(() => {
    const editorFields = (resource?.fields ?? []).filter(
      (field) =>
        !(
          resource?.line_items &&
          ["amount", "items", "subtotal", "tax_amount"].includes(field.key)
        ),
    );
    const nextMediaFields = editorFields.filter(
      (field) => isImageField(field) || field.key === "gallery",
    );
    const nextStructuredFields = editorFields.filter(
      (field) => field.type === "json" && field.key !== "gallery",
    );
    const generalFields = editorFields.filter(
      (field) =>
        !nextMediaFields.includes(field) &&
        !nextStructuredFields.includes(field),
    );
    return {
      mediaFields: nextMediaFields,
      structuredFields: nextStructuredFields,
      generalFieldGroups: fieldSections
        .map((section) => ({
          section,
          fields: generalFields.filter(
            (field) => sectionForField(field) === section,
          ),
        }))
        .filter((group) => group.fields.length),
    };
  }, [resource]);
  const workflowCounts = useMemo(
    () =>
      Object.fromEntries(
        (resource?.workflow ?? []).map((state) => [
          state.value,
          items.filter((item) => item.operational_status === state.value).length,
        ]),
      ),
    [items, resource?.workflow],
  );

  return (
    <>
      <section className="mb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {moduleUX?.label ?? "Module"}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {titleCase(resourceName)}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadRecords(resource, true)}
              disabled={loading || refreshing}
              aria-label="Refresh records"
            >
              <RefreshCw
                className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
            {mayCreateRecord && (
              <Button onClick={beginCreate}>
                <Plus className="size-4" />
                {resourceUX?.createLabel ??
                  `New ${resourceUX?.singular ?? "record"}`}
              </Button>
            )}
          </div>
        </div>

        {!!moduleContract?.resources.length &&
          moduleContract.resources.length > 1 && (
            <nav
              className="mt-5 flex gap-5 overflow-x-auto border-b"
              aria-label={`${moduleUX?.label} sections`}
            >
              {moduleContract.resources.map((item) => {
                const itemUX = keys
                  ? resourceExperience(keys.moduleKey, item.key)
                  : undefined;
                const active = item.key === keys?.resourceKey;
                return (
                  <Link
                    key={item.key}
                    href={`/modules/${keys?.moduleKey}/${item.key}`}
                    className={`-mb-px whitespace-nowrap border-b-2 px-0 pb-3 text-sm font-medium ${
                      active
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {itemUX?.plural ?? titleCase(item.key)}
                  </Link>
                );
              })}
            </nav>
          )}
      </section>

      <ResourceSummary
        items={items}
        view={resourceUX?.view ?? "content"}
        publicRead={resource?.public_read}
      />

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/[0.03]">
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!saving) setEditorOpen(open);
        }}
      >
        <DialogContent className="!inset-y-0 !right-0 !left-auto !top-0 !h-dvh !max-h-none !w-full !max-w-2xl !translate-x-0 !translate-y-0 overflow-hidden !rounded-none border-y-0 border-r-0 p-0">
          <Card className="flex h-dvh flex-col overflow-hidden border-0 shadow-none">
            <CardHeader className="shrink-0 border-b bg-card px-6 py-5 pr-14">
              <DialogTitle>
                {editing
                  ? `Edit ${editing.title || editing.slug}`
                  : `Create ${resourceUX?.singular ?? "record"}`}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editing ? "Update this record." : "Create a new record."}
              </DialogDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <form
                onSubmit={(event) => save(event)}
                className="flex min-h-full flex-col"
              >
                <div className="flex-1 space-y-6 p-4 sm:p-5">
                {generalFieldGroups.map((group, groupIndex) => (
                  <section
                    key={group.section}
                    className={groupIndex ? "border-t pt-6" : undefined}
                  >
                    <h3 className="mb-4 text-sm font-semibold">
                      {group.section}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {group.fields.map((field) => (
                        <ResourceInput
                          key={field.key}
                          field={field}
                          value={data[field.key]}
                          options={relations[field.key] ?? []}
                          error={fieldErrors[field.key]}
                          onChange={(value) => updateField(field, value)}
                          onCreateRelated={() => beginRelatedCreate(field)}
                          canCreateRelated={Boolean(
                            field.relation_endpoint &&
                              resourceContracts[field.relation_endpoint]?.allowed_actions?.includes("create"),
                          )}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                {!!mediaFields.length && (
                  <section className="border-t pt-6">
                    <h3 className="mb-4 text-sm font-semibold">Images</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {mediaFields.map((field) => (
                        <ResourceInput
                          key={field.key}
                          field={field}
                          value={data[field.key]}
                          options={relations[field.key] ?? []}
                          error={fieldErrors[field.key]}
                          onChange={(value) => updateField(field, value)}
                          onCreateRelated={() => beginRelatedCreate(field)}
                          canCreateRelated={Boolean(
                            field.relation_endpoint &&
                              resourceContracts[field.relation_endpoint]?.allowed_actions?.includes("create"),
                          )}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {!!structuredFields.length && (
                  <section className="border-t pt-6">
                    <h3 className="mb-4 text-sm font-semibold">
                      Additional details
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {structuredFields.map((field) => (
                        <ResourceInput
                          key={field.key}
                          field={field}
                          value={data[field.key]}
                          options={relations[field.key] ?? []}
                          error={fieldErrors[field.key]}
                          onChange={(value) => updateField(field, value)}
                          onCreateRelated={() => beginRelatedCreate(field)}
                          canCreateRelated={Boolean(
                            field.relation_endpoint &&
                              resourceContracts[field.relation_endpoint]?.allowed_actions?.includes("create"),
                          )}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {resource?.line_items && (
                  <LineItemsEditor
                    contract={resource.line_items}
                    items={lineItems}
                    relations={relations}
                    additionalAmount={Number(data.shipping_amount ?? 0) || 0}
                    additionalLabel="Shipping"
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

                {editing && resource && (
                  <ModuleRecordContext
                    endpoint={resource.admin_endpoint}
                    slug={editing.slug}
                    canEdit={mayEdit}
                  />
                )}

                {resource?.public_read && (
                  <section className="border-t pt-7">
                    <h3 className="mb-4 text-sm font-semibold">Publishing</h3>
                    <div className="grid gap-5 sm:grid-cols-2">
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
                              visibility: event.target.value as
                                "public" | "private",
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
                  </section>
                )}
                </div>
                <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-card px-5 py-4 sm:px-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditorOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="secondary" disabled={saving}>
                    {saving && <LoaderCircle className="size-4 animate-spin" />}{" "}
                    {editing
                      ? "Save changes"
                      : `Create ${resourceUX?.singular ?? "record"}`}
                  </Button>
                  {resource?.public_read && (
                    <Button
                      type="button"
                      disabled={saving}
                      onClick={(event) => save(event, "published")}
                    >
                      {saving && (
                        <LoaderCircle className="size-4 animate-spin" />
                      )}{" "}
                      Save & publish
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      <QuickCreateRelatedDialog
        request={relatedCreate}
        onClose={() => setRelatedCreate(undefined)}
        onCreated={useRelatedRecord}
      />

      <Card>
        <CardContent className="p-0">
          {!!resource?.workflow?.length && (
            <div className="flex gap-2 overflow-x-auto border-b p-3">
              <button
                type="button"
                onClick={() => {
                  setOperationalFilter("");
                  setPage(1);
                }}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                  operationalFilter === ""
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All {resourceName.toLowerCase()}
              </button>
              {resource.workflow.map((state) => (
                <button
                  key={state.value}
                  type="button"
                  onClick={() => {
                    setOperationalFilter(state.value);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                    operationalFilter === state.value
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {state.label}
                  <span className="ml-1.5 opacity-70">
                    {workflowCounts[state.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={`Search ${resourceName.toLowerCase()}…`}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {resource?.public_read && (
              <>
                <select
                  className={`${selectClass} lg:w-36`}
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by publishing status"
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  className={`${selectClass} lg:w-36`}
                  value={visibilityFilter}
                  onChange={(event) => {
                    setVisibilityFilter(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by visibility"
                >
                  <option value="">All visibility</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </>
            )}
            <select
              className={`${selectClass} lg:w-44`}
              value={ordering}
              onChange={(event) => {
                setOrdering(event.target.value);
                setPage(1);
              }}
              aria-label="Sort records"
            >
              <option value="-updated_at">Recently updated</option>
              <option value="-created_at">Newest first</option>
              <option value="title">Title A–Z</option>
              <option value="-title">Title Z–A</option>
            </select>
            {(query ||
              statusFilter ||
              visibilityFilter ||
              operationalFilter ||
              ordering !== "-updated_at") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("");
                  setVisibilityFilter("");
                  setOperationalFilter("");
                  setOrdering("-updated_at");
                  setPage(1);
                }}
              >
                <X className="size-3.5" />
                Clear
              </Button>
            )}
          </div>

          {loading && !items.length ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 size-4 animate-spin" /> Loading
              records…
            </div>
          ) : visibleItems.length ? (
            <ResourceRecordCollection
              view={resourceUX?.view ?? "content"}
              moduleKey={keys?.moduleKey}
              resourceKey={keys?.resourceKey}
              items={visibleItems}
              primaryFieldOrder={primaryFieldOrder}
              resource={resource}
              relations={relations}
              mayEdit={mayEdit}
              mayDelete={mayDelete}
              mayWorkflow={mayWorkflow}
              mayPublish={mayPublish}
              busyRecord={busyRecord}
              onEdit={edit}
              onDelete={remove}
              onAction={applyAction}
            />
          ) : (
            <EmptyState
              icon={
                query || statusFilter || visibilityFilter || operationalFilter
                  ? Search
                  : FilePlus2
              }
              title={
                query || statusFilter || visibilityFilter || operationalFilter
                  ? "No matching records"
                  : `No ${resourceName.toLowerCase()} yet`
              }
              description={
                query || statusFilter || visibilityFilter || operationalFilter
                  ? "Try a different search or clear the filters."
                  : (resourceUX?.emptyMessage ??
                    `Create the first ${resourceUX?.singular ?? "record"} to get started.`)
              }
              action={
                query || statusFilter || visibilityFilter || operationalFilter
                  ? "Clear filters"
                  : mayCreateRecord
                    ? (resourceUX?.createLabel ??
                      `New ${resourceUX?.singular ?? "record"}`)
                    : undefined
              }
              onAction={() => {
                if (
                  query ||
                  statusFilter ||
                  visibilityFilter ||
                  operationalFilter
                ) {
                  setQuery("");
                  setStatusFilter("");
                  setVisibilityFilter("");
                  setOperationalFilter("");
                  setPage(1);
                } else beginCreate();
              }}
            />
          )}

          {!!items.length && (
            <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
              <span>
                {totalCount} record{totalCount === 1 ? "" : "s"}
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

const terminalStatuses = new Set([
  "cancelled",
  "closed",
  "completed",
  "delivered",
  "discharged",
  "expired",
  "fulfilled",
  "graduated",
  "lost",
  "paid",
  "refunded",
  "rejected",
  "resolved",
  "void",
  "won",
]);

const attentionStatuses = new Set([
  "failed",
  "low_stock",
  "new",
  "out_of_stock",
  "overdue",
  "pending",
  "requested",
  "submitted",
]);

function numericValue(item: ModuleRecord) {
  const value = item.amount ?? item.estimated_value ?? item.price;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

const ResourceSummary = memo(function ResourceSummary({
  items,
  view,
  publicRead,
}: {
  items: ModuleRecord[];
  view: ResourceView;
  publicRead?: boolean;
}) {
  const states = items.map((item) => String(item.operational_status ?? ""));
  const active = states.filter((state) => !terminalStatuses.has(state)).length;
  const attention = states.filter((state) => attentionStatuses.has(state)).length;
  const totalValue = items.reduce((total, item) => total + numericValue(item), 0);
  const metrics: Array<{ label: string; value: string | number; tone?: string }> = [
    { label: "total", value: items.length },
  ];

  if (view === "ledger") {
    metrics.push(
      { label: "value", value: totalValue.toLocaleString() },
      { label: "paid", value: states.filter((state) => state === "paid").length },
      {
        label: "overdue",
        value: states.filter((state) => state === "overdue").length,
        tone: "text-amber-700",
      },
    );
  } else if (view === "pipeline") {
    metrics.push(
      { label: "open", value: active },
      { label: "won", value: states.filter((state) => state === "won").length },
      { label: "pipeline value", value: totalValue.toLocaleString() },
    );
  } else if (view === "inbox") {
    metrics.push(
      { label: "new", value: states.filter((state) => state === "new").length },
      { label: "open", value: active },
      {
        label: "resolved",
        value: states.filter((state) => state === "resolved").length,
      },
    );
  } else if (view === "catalog") {
    metrics.push(
      { label: "active", value: active },
      {
        label: "low stock",
        value: states.filter((state) => state === "low_stock").length,
        tone: "text-amber-700",
      },
      { label: "catalog value", value: totalValue.toLocaleString() },
    );
  } else if (view === "calendar") {
    const today = new Date().toISOString().slice(0, 10);
    const dates = items.map((item) =>
      String(item.date ?? item.starts_at ?? "").slice(0, 10),
    );
    metrics.push(
      { label: "today", value: dates.filter((date) => date === today).length },
      { label: "upcoming", value: dates.filter((date) => date > today).length },
      { label: "active", value: active },
    );
  } else if (publicRead) {
    metrics.push(
      {
        label: "published",
        value: items.filter((item) => item.status === "published").length,
      },
      {
        label: "drafts",
        value: items.filter((item) => item.status === "draft").length,
      },
    );
  } else {
    metrics.push({ label: "active", value: active });
  }

  if (attention && !metrics.some((metric) => metric.label === "low stock"))
    metrics.push({ label: "need attention", value: attention, tone: "text-amber-700" });

  return (
    <section className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
      {metrics.slice(0, 4).map((metric) => (
        <span key={metric.label} className={`whitespace-nowrap ${metric.tone ?? ""}`}>
          <strong className="font-semibold text-foreground">{metric.value}</strong>{" "}
          {metric.label}
        </span>
      ))}
    </section>
  );
});

const ResourceRecordCollection = memo(function ResourceRecordCollection({
  view,
  moduleKey,
  resourceKey,
  items,
  primaryFieldOrder,
  resource,
  relations,
  mayEdit,
  mayDelete,
  mayWorkflow,
  mayPublish,
  busyRecord,
  onEdit,
  onDelete,
  onAction,
}: {
  view: ResourceView;
  moduleKey?: string;
  resourceKey?: string;
  items: ModuleRecord[];
  primaryFieldOrder: string;
  resource?: ModuleResourceContract;
  relations: RelationOptions;
  mayEdit: boolean;
  mayDelete: boolean;
  mayWorkflow: boolean;
  mayPublish: boolean;
  busyRecord?: string;
  onEdit: (item: ModuleRecord) => void;
  onDelete: (item: ModuleRecord) => void;
  onAction: (item: ModuleRecord, action: string) => void;
}) {
  const preferredFields = primaryFieldOrder
    ? primaryFieldOrder.split("\u0000")
    : [];
  const fields = [...(resource?.fields ?? [])]
    .filter((field) => !["json", "textarea", "file"].includes(field.type))
    .sort((a, b) => {
      const aIndex = preferredFields.indexOf(a.key);
      const bIndex = preferredFields.indexOf(b.key);
      if (aIndex < 0 && bIndex < 0) return 0;
      if (aIndex < 0) return 1;
      if (bIndex < 0) return -1;
      return aIndex - bIndex;
    })
    .slice(0, 3);

  if (view === "pipeline" && resource?.workflow?.length) {
    const knownStates = new Set(resource.workflow.map((state) => state.value));
    const unassignedItems = items.filter(
      (item) =>
        typeof item.operational_status !== "string" ||
        !knownStates.has(item.operational_status),
    );
    const columns = [
      ...resource.workflow,
      ...(unassignedItems.length
        ? [{ value: "__unassigned__", label: "Unassigned" }]
        : []),
    ];
    return (
      <div className="overflow-x-auto bg-muted/20 p-4">
        <div className="flex min-w-max gap-3">
          {columns.map((state) => {
            const stateItems =
              state.value === "__unassigned__"
                ? unassignedItems
                : items.filter(
                    (item) => item.operational_status === state.value,
                  );
            return (
              <section key={state.value} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {state.label}
                  </h3>
                  <span className="rounded-full bg-card px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {stateItems.length}
                  </span>
                </div>
                <div className="motion-list space-y-2">
                  {stateItems.map((item) => (
                    <RecordTile
                      key={String(item.id)}
                      item={item}
                      fields={fields}
                      relations={relations}
                      resource={resource}
                      view={view}
                      moduleKey={moduleKey}
                      resourceKey={resourceKey}
                      mayEdit={mayEdit}
                      mayDelete={mayDelete}
                      mayWorkflow={mayWorkflow}
                      mayPublish={mayPublish}
                      busy={busyRecord === String(item.id)}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAction={onAction}
                    />
                  ))}
                  {!stateItems.length && (
                    <p className="rounded-lg border border-dashed bg-card/60 p-4 text-center text-xs text-muted-foreground">
                      No records
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  if (view === "gallery") {
    return (
      <div className="motion-list grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <RecordTile
            key={String(item.id)}
            item={item}
            fields={fields}
            relations={relations}
            resource={resource}
            view={view}
            moduleKey={moduleKey}
            resourceKey={resourceKey}
            mayEdit={mayEdit}
            mayDelete={mayDelete}
            mayWorkflow={mayWorkflow}
            mayPublish={mayPublish}
            busy={busyRecord === String(item.id)}
            onEdit={onEdit}
            onDelete={onDelete}
            onAction={onAction}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="motion-list divide-y">
      {items.map((item) => (
        <RecordRow
          key={String(item.id)}
          item={item}
          fields={fields}
          relations={relations}
          resource={resource}
          view={view}
          moduleKey={moduleKey}
          resourceKey={resourceKey}
          mayEdit={mayEdit}
          mayDelete={mayDelete}
          mayWorkflow={mayWorkflow}
          mayPublish={mayPublish}
          busy={busyRecord === String(item.id)}
          onEdit={onEdit}
          onDelete={onDelete}
          onAction={onAction}
        />
      ))}
    </div>
  );
});

interface RecordPresentationProps {
  item: ModuleRecord;
  fields: ResourceField[];
  relations: RelationOptions;
  resource?: ModuleResourceContract;
  view: ResourceView;
  moduleKey?: string;
  resourceKey?: string;
  mayEdit: boolean;
  mayDelete: boolean;
  mayWorkflow: boolean;
  mayPublish: boolean;
  busy: boolean;
  onEdit: (item: ModuleRecord) => void;
  onDelete: (item: ModuleRecord) => void;
  onAction: (item: ModuleRecord, action: string) => void;
}

function RecordTile(props: RecordPresentationProps) {
  const { item, fields, relations, resource, view, mayEdit, onEdit } = props;
  const imageValue = [
    "image",
    "featured_image",
    "cover_image",
    "photo",
    "avatar",
    "logo",
    "url",
  ]
    .map((key) => item[key])
    .find((value) => typeof value === "string" && value);
  return (
    <article className="overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-sm">
      {view === "gallery" &&
        typeof imageValue === "string" && (
          <div className="relative aspect-video border-b bg-muted">
            <Image
              src={imageValue}
              alt={item.title || item.slug}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              unoptimized
              className="object-cover"
            />
          </div>
        )}
      <div className="p-4">
        <button
          type="button"
          disabled={!mayEdit}
          onClick={() => onEdit(item)}
          className="max-w-full truncate text-left font-semibold enabled:hover:text-primary disabled:cursor-default"
        >
          {item.title || item.slug}
        </button>
        <RecordBadges item={item} publicRead={resource?.public_read} />
        <RecordFields item={item} fields={fields} relations={relations} />
        <div className="mt-4 border-t pt-3">
          <RecordActions {...props} />
        </div>
      </div>
    </article>
  );
}

function RecordRow(props: RecordPresentationProps) {
  const { item, fields, relations, resource, view, mayEdit, onEdit } = props;
  const amount = item.amount ?? item.price;
  const date = item.date ?? item.due_date ?? item.occurred_at;
  const imageValue = [
    "image",
    "featured_image",
    "cover_image",
    "photo",
    "avatar",
    "logo",
  ]
    .map((key) => item[key])
    .find((value) => typeof value === "string" && value);
  return (
    <article className="grid gap-3 p-4 transition-colors duration-150 hover:bg-muted/30 lg:grid-cols-[minmax(240px,1.2fr)_minmax(240px,1fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
          {typeof imageValue === "string" ? (
            <Image
              src={imageValue}
              alt=""
              fill
              sizes="40px"
              unoptimized
              className="object-cover"
            />
          ) : view === "ledger" ? (
            <CircleDollarSign className="size-4" />
          ) : view === "calendar" ? (
            <CalendarDays className="size-4" />
          ) : view === "directory" ? (
            <UserRound className="size-4" />
          ) : view === "inbox" ? (
            <Clock3 className="size-4" />
          ) : (
            <FilePlus2 className="size-4" />
          )}
        </div>
        <div className="min-w-0">
          <button
            type="button"
            disabled={!mayEdit}
            onClick={() => onEdit(item)}
            className="block max-w-full truncate text-left font-semibold enabled:hover:text-primary disabled:cursor-default"
          >
            {item.title || item.slug}
          </button>
          {view === "ledger" && amount != null ? (
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {displayValue(amount)}
            </p>
          ) : date ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatRecordDate(date)}
            </p>
          ) : (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {item.slug}
            </p>
          )}
          <RecordBadges item={item} publicRead={resource?.public_read} />
        </div>
      </div>
      <RecordFields item={item} fields={fields} relations={relations} />
      <RecordActions {...props} />
    </article>
  );
}

function RecordFields({
  item,
  fields,
  relations,
}: {
  item: ModuleRecord;
  fields: ResourceField[];
  relations: RelationOptions;
}) {
  return (
    <dl className="mt-3 grid gap-1.5 text-xs lg:mt-0">
      {fields.map((field) => (
        <div key={field.key} className="flex min-w-0 gap-2">
          <dt className="shrink-0 text-muted-foreground">{field.label}</dt>
          <dd className="truncate font-medium">
            {field.type === "email" && item[field.key] ? (
              <a
                href={`mailto:${String(item[field.key])}`}
                className="hover:underline"
              >
                {String(item[field.key])}
              </a>
            ) : field.key.includes("phone") && item[field.key] ? (
              <a
                href={`tel:${String(item[field.key])}`}
                className="hover:underline"
              >
                {String(item[field.key])}
              </a>
            ) : field.type === "url" && item[field.key] ? (
              <a
                href={String(item[field.key])}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                Open link
              </a>
            ) : (
              relationDisplay(field, item[field.key], relations[field.key])
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RecordBadges({
  item,
  publicRead,
}: {
  item: ModuleRecord;
  publicRead?: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {typeof item.operational_status === "string" && (
        <Badge>{label(item.operational_status)}</Badge>
      )}
      {publicRead && (
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
      )}
      {publicRead && item.visibility === "public" && (
        <Badge variant="brand">Public</Badge>
      )}
    </div>
  );
}

function RecordActions(props: RecordPresentationProps) {
  const {
    item,
    resource,
    mayEdit,
    mayDelete,
    mayWorkflow,
    mayPublish,
    busy,
    onEdit,
    onDelete,
    onAction,
    moduleKey,
    resourceKey,
  } = props;
  const primaryTransition = recommendedTransition(
    moduleKey,
    resourceKey,
    item.operational_status,
  );
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {typeof item.email === "string" && item.email ? (
        <a
          href={`mailto:${item.email}`}
          aria-label={`Email ${item.title || item.slug}`}
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "size-8",
          })}
        >
          <Mail className="size-3.5" />
        </a>
      ) : null}
      {typeof item.phone === "string" && item.phone ? (
        <a
          href={`tel:${item.phone}`}
          aria-label={`Call ${item.title || item.slug}`}
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "size-8",
          })}
        >
          <Phone className="size-3.5" />
        </a>
      ) : null}
      {typeof item.url === "string" && item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${item.title || item.slug}`}
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "size-8",
          })}
        >
          <ExternalLink className="size-3.5" />
        </a>
      ) : null}
      {mayWorkflow && primaryTransition ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onAction(item, `set-${primaryTransition.target}`)}
        >
          {primaryTransition.label}
        </Button>
      ) : null}
      {mayWorkflow && resource?.workflow?.length ? (
        <select
          className="h-8 max-w-36 rounded-lg border bg-card px-2 text-xs"
          value={String(item.operational_status ?? "")}
          disabled={busy}
          aria-label={`Change status for ${item.title || item.slug}`}
          onChange={(event) => onAction(item, `set-${event.target.value}`)}
        >
          <option value="" disabled>
            Set status
          </option>
          {resource.workflow.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      ) : null}
      {mayPublish && resource?.public_read && item.status !== "published" && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onAction(item, "publish")}
        >
          Publish
        </Button>
      )}
      {mayPublish && resource?.public_read && item.status === "published" && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onAction(item, "unpublish")}
        >
          Unpublish
        </Button>
      )}
      {mayEdit && (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onEdit(item)}
        >
          <Pencil className="size-3.5" /> Edit
        </Button>
      )}
      {mayDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={busy}
          aria-label={`Delete ${item.title || item.slug}`}
          onClick={() => onDelete(item)}
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5 text-destructive" />
          )}
        </Button>
      )}
    </div>
  );
}

function FieldLabel({
  label: fieldLabel,
  required,
  help,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={`block min-w-0 text-sm font-medium ${className ?? ""}`}>
      <legend>
        {fieldLabel}
        {required ? " *" : ""}
      </legend>
      <div className="mt-2">{children}</div>
      {(error || help) && (
        <span
          className={`mt-1 block text-xs font-normal ${error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {error || help}
        </span>
      )}
    </fieldset>
  );
}

function QuickCreateRelatedDialog({
  request,
  onClose,
  onCreated,
}: {
  request?: { field: ResourceField; contract: ModuleResourceContract };
  onClose: () => void;
  onCreated: (record: ModuleRecord) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const singular = request?.field.label.toLowerCase() ?? "record";

  useEffect(() => {
    if (!request) {
      setName("");
      setError(undefined);
    }
  }, [request]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!request || !name.trim()) return;
    setSaving(true);
    setError(undefined);
    try {
      const title = name.trim();
      const created = await saveAdminModuleRecord(request.contract.admin_endpoint, {
        title,
        slug: `${slugify(title) || "record"}-${Date.now().toString(36)}`,
      });
      onCreated(created);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Could not add this ${singular}.`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0">
        <form onSubmit={create}>
          <div className="border-b px-6 py-5">
            <DialogTitle>Add {singular}</DialogTitle>
            <DialogDescription>
              Add it here, then it will be selected automatically.
            </DialogDescription>
          </div>
          <div className="space-y-3 px-6 py-5">
            <FieldLabel label="Name" required>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={`e.g. ${titleCase(singular)}`}
                required
              />
            </FieldLabel>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add {singular}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResourceInput({
  field,
  value,
  options,
  error,
  onChange,
  onCreateRelated,
  canCreateRelated = false,
}: {
  field: ResourceField;
  value: unknown;
  options: ModuleRecord[];
  error?: string;
  onChange: (value: string | boolean | File) => void;
  onCreateRelated?: () => void;
  canCreateRelated?: boolean;
}) {
  const relationLabel = field.relation_label_field || "title";
  const numericField = field.type === "number";
  const fractionalNumber =
    /amount|price|cost|rate|discount|tax|latitude|longitude|area/.test(
      field.key,
    );
  const allowNegative = ["latitude", "longitude", "quantity_delta"].includes(
    field.key,
  );
  const maximum = field.key === "rating" ? 5 : undefined;
  const fullWidth =
    ["textarea", "json", "file"].includes(field.type) ||
    field.key === "gallery";
  const input =
    field.key === "gallery" ? (
      <MediaGalleryPicker value={value} onChange={onChange} />
    ) : isImageField(field) && field.type === "url" ? (
      <MediaPicker
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
      />
    ) : field.type === "json" && field.key === "fields" ? (
      <FormFieldsBuilder value={value} onChange={onChange} />
    ) : field.type === "json" && listJsonFields.has(field.key) ? (
      <StringListEditor value={value} onChange={onChange} />
    ) : field.type === "json" && field.key !== "json_ld" ? (
      <KeyValueEditor value={value} onChange={onChange} />
    ) : field.type === "textarea" || field.type === "json" ? (
      <Textarea
        aria-label={field.label}
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
        aria-label={field.label}
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
      <div className="space-y-2">
        <select
          aria-label={field.label}
          className={selectClass}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        >
          <option value="">
            {options.length ? "Select…" : "No records available"}
          </option>
          {options.map((option) => (
            <option key={String(option.id)} value={String(option.id)}>
              {displayValue(
                option[relationLabel] ?? option.title ?? option.slug,
              )}
            </option>
          ))}
        </select>
        {!options.length && canCreateRelated ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreateRelated}
            className="w-fit"
          >
            <Plus className="size-3.5" /> Add {field.label.toLowerCase()}
          </Button>
        ) : null}
      </div>
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
          aria-label={field.label}
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
          aria-label={field.label}
          type="checkbox"
          className="size-4"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />{" "}
        Yes
      </label>
    ) : (
      <Input
        aria-label={field.label}
        type={
          field.type === "datetime"
            ? "datetime-local"
            : field.key.includes("phone")
              ? "tel"
              : field.type === "relation"
                ? "number"
                : field.type
        }
        step={numericField ? (fractionalNumber ? "0.01" : "1") : undefined}
        min={
          numericField && !allowNegative
            ? field.key === "rating"
              ? 1
              : 0
            : undefined
        }
        max={maximum}
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
      className={fullWidth ? "sm:col-span-2" : undefined}
    >
      {input}
    </FieldLabel>
  );
}

function parseJsonValue(value: unknown, fallback: unknown) {
  if (typeof value !== "string") return value ?? fallback;
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function StringListEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: string) => void;
}) {
  const items = parseJsonValue(value, []);
  const values = Array.isArray(items)
    ? items.filter((item): item is string => typeof item === "string")
    : [];
  const [draft, setDraft] = useState("");

  function add() {
    const next = draft.trim();
    if (!next || values.includes(next)) return;
    onChange(JSON.stringify([...values, next]));
    setDraft("");
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      {values.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {values.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() =>
                onChange(
                  JSON.stringify(values.filter((value) => value !== item)),
                )
              }
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove ${item}`}
            >
              {item} ×
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="Type and press Enter"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

function KeyValueEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: string) => void;
}) {
  const parsed = parseJsonValue(value, {});
  const entries =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.entries(parsed as Record<string, unknown>)
      : [];

  function update(index: number, key: string, entryValue: string) {
    const nextEntries: Array<[string, unknown]> = entries.map(
      ([currentKey, currentValue], itemIndex) =>
        itemIndex === index ? [key, entryValue] : [currentKey, currentValue],
    );
    onChange(
      JSON.stringify(
        Object.fromEntries(nextEntries.filter(([entryKey]) => entryKey.trim())),
      ),
    );
  }

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      {entries.map(([key, entryValue], index) => (
        <div
          key={`${key}-${index}`}
          className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
        >
          <Input
            className="col-span-2 sm:col-span-1"
            aria-label="Property name"
            value={key}
            onChange={(event) =>
              update(index, event.target.value, String(entryValue ?? ""))
            }
          />
          <Input
            aria-label={`${key || "Property"} value`}
            value={String(entryValue ?? "")}
            onChange={(event) => update(index, key, event.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${key || "property"}`}
            onClick={() =>
              onChange(
                JSON.stringify(
                  Object.fromEntries(
                    entries.filter((_, itemIndex) => itemIndex !== index),
                  ),
                ),
              )
            }
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange(JSON.stringify({ ...Object.fromEntries(entries), "": "" }))
        }
      >
        <Plus className="size-4" /> Add property
      </Button>
    </div>
  );
}

interface FormFieldDefinition {
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

function FormFieldsBuilder({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: string) => void;
}) {
  const parsed = parseJsonValue(value, []);
  const fields: FormFieldDefinition[] = Array.isArray(parsed)
    ? parsed.map((item) => ({
        label: String(item?.label ?? ""),
        type: String(item?.type ?? "text"),
        required: Boolean(item?.required),
        options: Array.isArray(item?.options)
          ? item.options.filter(
              (option: unknown): option is string => typeof option === "string",
            )
          : [],
      }))
    : [];

  function update(index: number, next: FormFieldDefinition) {
    onChange(
      JSON.stringify(
        fields.map((field, itemIndex) => (itemIndex === index ? next : field)),
      ),
    );
  }

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div
          key={index}
          className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[1fr_140px_auto_auto] sm:items-center"
        >
          <Input
            aria-label={`Field ${index + 1} label`}
            placeholder="Field label"
            value={field.label}
            onChange={(event) =>
              update(index, { ...field, label: event.target.value })
            }
          />
          <select
            className={selectClass}
            aria-label={`Field ${index + 1} type`}
            value={field.type}
            onChange={(event) =>
              update(index, { ...field, type: event.target.value })
            }
          >
            <option value="text">Short text</option>
            <option value="textarea">Long text</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Choice</option>
            <option value="checkbox">Checkbox</option>
          </select>
          <label className="flex items-center gap-2 text-xs font-normal">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) =>
                update(index, { ...field, required: event.target.checked })
              }
            />
            Required
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove field ${index + 1}`}
            onClick={() =>
              onChange(
                JSON.stringify(
                  fields.filter((_, itemIndex) => itemIndex !== index),
                ),
              )
            }
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
          {field.type === "select" ? (
            <Input
              className="sm:col-span-4"
              aria-label={`Field ${index + 1} choices`}
              placeholder="Choices separated by commas"
              value={(field.options ?? []).join(", ")}
              onChange={(event) =>
                update(index, {
                  ...field,
                  options: event.target.value
                    .split(",")
                    .map((option) => option.trim())
                    .filter(Boolean),
                })
              }
            />
          ) : null}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange(
            JSON.stringify([
              ...fields,
              { label: "", type: "text", required: false, options: [] },
            ]),
          )
        }
      >
        <Plus className="size-4" /> Add field
      </Button>
    </div>
  );
}

function LineItemsEditor({
  contract,
  items,
  relations,
  additionalAmount = 0,
  additionalLabel,
  onChange,
}: {
  contract: NonNullable<ModuleResourceContract["line_items"]>;
  items: Record<string, unknown>[];
  relations: RelationOptions;
  additionalAmount?: number;
  additionalLabel?: string;
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

  const totals = items.reduce<{ subtotal: number; tax: number }>(
    (summary, item) => {
      const quantity = Number(item.quantity ?? 1) || 0;
      const unitPrice = Number(item.unit_price ?? 0) || 0;
      const taxRate = Number(item.tax_rate ?? 0) || 0;
      const subtotal = quantity * unitPrice;
      return {
        subtotal: summary.subtotal + subtotal,
        tax: summary.tax + subtotal * (taxRate / 100),
      };
    },
    { subtotal: 0, tax: 0 },
  );
  const total = totals.subtotal + totals.tax + additionalAmount;
  const formatAmount = (value: number) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold">{contract.label}</h3>
          {items.length ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Subtotal {formatAmount(totals.subtotal)}
              {totals.tax ? ` · Tax ${formatAmount(totals.tax)}` : ""}
              {additionalAmount
                ? ` · ${additionalLabel ?? "Additional"} ${formatAmount(additionalAmount)}`
                : ""}
              {` · Total ${formatAmount(total)}`}
            </p>
          ) : null}
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
            <div key={index} className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Line {index + 1}
                  <span className="ml-2 normal-case tracking-normal text-foreground">
                    {formatAmount(
                      (Number(item.quantity ?? 1) || 0) *
                        (Number(item.unit_price ?? 0) || 0) *
                        (1 + (Number(item.tax_rate ?? 0) || 0) / 100),
                    )}
                  </span>
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
              <div className="grid gap-4 sm:grid-cols-2">
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
          className="w-full rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
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
  const actionLabel =
    contract.label === "Stock movements"
      ? "Record adjustment"
      : contract.label === "Document versions"
        ? "Upload version"
        : contract.label === "Attendance"
          ? "Record attendance"
          : "Add record";

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
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditor({})}
        >
          <Plus className="size-3.5" /> {actionLabel}
        </Button>
      </div>
      {errorMessage && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
      {editor && (
        <div className="mb-4 rounded-lg border bg-muted/20 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
              {editor.id ? "Save changes" : actionLabel}
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
