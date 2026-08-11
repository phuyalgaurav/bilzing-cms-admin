"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
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
  MapPinned,
  MoreHorizontal,
  Navigation,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ModuleRecordContext } from "@/components/module-record-context";
import { LocationPicker } from "@/components/location/location-picker";
import { resolveMediaUrl } from "@/lib/media-url";
import {
  SeoEditorPreview,
  SeoSchemaEditor,
  seoFieldPresentation,
} from "@/components/module-editor/seo-experience";

const PAGE_SIZE = 15;
const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10";

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
    : format(parsed, "MMM d, yyyy, h:mm a");
};

type LocationValues = Record<string, unknown>;

function locationDestination(values: LocationValues) {
  const latitude = values.latitude;
  const longitude = values.longitude;
  if (
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== ""
  ) {
    return `${latitude},${longitude}`;
  }
  return typeof values.address === "string" ? values.address.trim() : "";
}

function locationLinks(values: LocationValues) {
  const destination = locationDestination(values);
  if (!destination) return undefined;
  const mapLinks =
    values.map_links && typeof values.map_links === "object"
      ? (values.map_links as Record<string, unknown>)
      : undefined;
  const directionsLinks =
    values.directions_links && typeof values.directions_links === "object"
      ? (values.directions_links as Record<string, unknown>)
      : undefined;
  return {
    map:
      (typeof mapLinks?.google === "string" && mapLinks.google) ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,
    directions:
      (typeof directionsLinks?.google === "string" && directionsLinks.google) ||
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
  };
}

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
  slug: string;
  status: ModuleRecordStatus;
  visibility: "public" | "private";
  sort_order: number;
}

const emptyForm: RecordForm = {
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
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord>();
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
    setForm({
      ...emptyForm,
      visibility: resource?.public_read ? "public" : "private",
    });
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
    const slug = resource?.public_read
      ? slugify(form.slug) || baseSlug
      : editing?.slug ?? `${baseSlug}-${createSlugSuffix || "new"}`;
    return {
      ...(editing ? { id: editing.id } : {}),
      ...fields,
      title,
      slug,
      status: nextStatus ?? form.status,
      visibility:
        (nextStatus ?? form.status) === "published"
          ? ("public" as const)
          : ("private" as const),
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
      if (!resource) return;
      setBusyRecord(String(item.id));
      setError(undefined);
      try {
        await deleteAdminModuleRecord(resource.admin_endpoint, item);
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        setTotalCount((current) => Math.max(0, current - 1));
        setEditorOpen(false);
        setEditing(undefined);
        setDeleteTarget(undefined);
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
        !nextStructuredFields.includes(field) &&
        !(
          keys?.moduleKey === "location_management" &&
          keys.resourceKey === "locations" &&
          ["address", "latitude", "longitude"].includes(field.key)
        ),
    );
    const seoGroups =
      keys?.moduleKey === "seo_management"
        ? keys.resourceKey === "seo-settings"
          ? [
              {
                section: "Search appearance",
                fields: generalFields.filter((field) =>
                  ["page", "meta_title", "meta_description", "canonical_url"].includes(
                    field.key,
                  ),
                ),
              },
              {
                section: "Indexing",
                fields: generalFields.filter((field) =>
                  ["robots", "sitemap_priority"].includes(field.key),
                ),
              },
            ]
          : [
              {
                section:
                  keys.resourceKey === "redirects"
                    ? "Redirect details"
                    : "Search feature",
                fields: generalFields,
              },
            ]
        : undefined;
    return {
      mediaFields: nextMediaFields,
      structuredFields: nextStructuredFields,
      generalFieldGroups: (seoGroups ??
        fieldSections.map((section) => ({
          section,
          fields: generalFields.filter(
            (field) => sectionForField(field) === section,
          ),
        }))).filter((group) => group.fields.length),
    };
  }, [keys, resource]);
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

      <Sheet
        open={editorOpen}
        onOpenChange={(open) => {
          if (!saving) setEditorOpen(open);
        }}
      >
        <SheetContent className="w-full gap-0 overflow-hidden p-0 sm:max-w-3xl" showCloseButton={!saving}>
          <div className="flex h-dvh flex-col overflow-hidden">
            <SheetHeader className="shrink-0 border-b bg-card px-5 py-4 pr-14 sm:px-6">
              <SheetTitle className="text-lg">
                {editing
                  ? editing.title || editing.slug
                  : `New ${titleCase(resourceUX?.singular ?? "record")}`}
              </SheetTitle>
              <SheetDescription className="max-w-xl">
                {resourceUX?.description ??
                  (editing ? "Update this record." : "Add the details below.")}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <form
                onSubmit={(event) => save(event)}
                className="flex min-h-full flex-col"
              >
                <div className="flex-1 px-5 sm:px-6">
                {keys?.moduleKey === "seo_management" && keys.resourceKey ? (
                  <SeoEditorPreview resourceKey={keys.resourceKey} values={data} />
                ) : null}
                {generalFieldGroups.map((group, groupIndex) => (
                  <section
                    key={group.section}
                    className="grid gap-4 border-b py-5 md:grid-cols-[160px_minmax(0,1fr)]"
                  >
                    <div>
                      <h3 className="text-sm font-semibold">{group.section}</h3>
                      {groupIndex === 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Complete the important information first. Optional fields can be added later.
                        </p>
                      ) : null}
                    </div>
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
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

                {keys?.moduleKey === "location_management" &&
                  keys.resourceKey === "locations" && (
                    <LocationPicker
                      address={String(data.address ?? "")}
                      latitude={String(data.latitude ?? "")}
                      longitude={String(data.longitude ?? "")}
                      onChange={({ address, latitude, longitude }) => {
                        setData((current) => ({
                          ...current,
                          address,
                          latitude,
                          longitude,
                        }));
                        setFieldErrors((current) => ({
                          ...current,
                          address: "",
                          latitude: "",
                          longitude: "",
                        }));
                      }}
                    />
                  )}

                {!!mediaFields.length && (
                  <section className="grid gap-4 border-b py-5 md:grid-cols-[160px_minmax(0,1fr)]">
                    <div>
                      <h3 className="text-sm font-semibold">Images</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Choose clear, high-quality images from the shared media library.
                      </p>
                    </div>
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
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
                  <section className="grid gap-4 border-b py-5 md:grid-cols-[160px_minmax(0,1fr)]">
                    <h3 className="text-sm font-semibold">
                      {keys?.moduleKey === "seo_management" && keys.resourceKey === "schema"
                        ? "Structured data details"
                        : "Additional details"}
                    </h3>
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                      {structuredFields.map((field) =>
                        keys?.moduleKey === "seo_management" &&
                        keys.resourceKey === "schema" &&
                        field.key === "json_ld" ? (
                          <div key={field.key} className="sm:col-span-2">
                            <SeoSchemaEditor
                              value={data[field.key]}
                              schemaType={String(data.schema_type || "Organization")}
                              onChange={(value) => updateField(field, value)}
                            />
                          </div>
                        ) : (
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
                        ),
                      )}
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
                  <section className="grid gap-4 py-5 md:grid-cols-[160px_minmax(0,1fr)]">
                    <div><h3 className="text-sm font-semibold">Publishing</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Control when this record appears on the website.</p></div>
                    <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                      <FieldLabel label="Publishing status">
                        <Select
                          value={form.status}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              status: value as ModuleRecordStatus,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                        </Select>
                      </FieldLabel>
                      <div className="sm:col-span-2">
                        <details className="rounded-lg border bg-neutral-50/60">
                          <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                            Advanced publishing options
                          </summary>
                          <div className="grid gap-4 border-t bg-card p-4 sm:grid-cols-2">
                            <FieldLabel
                              label="Public URL ending"
                              help="Leave blank to create it automatically from the name."
                            >
                              <div className="flex overflow-hidden rounded-lg border border-neutral-300 bg-card focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/10">
                                <span className="grid place-items-center border-r bg-neutral-50 px-3 text-sm text-muted-foreground">/</span>
                                <Input
                                  aria-label="Public URL ending"
                                  className="min-w-0 flex-1 rounded-none border-0 bg-transparent focus:ring-0"
                                  value={form.slug}
                                  placeholder="created-automatically"
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      slug: slugify(event.target.value),
                                    }))
                                  }
                                />
                              </div>
                            </FieldLabel>
                            <FieldLabel
                              label="Display order"
                              help="Lower numbers appear first where manual ordering is supported."
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
                        </details>
                      </div>
                    </div>
                  </section>
                )}
                </div>
                <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-card px-5 py-4 shadow-[0_-8px_24px_rgb(0_0_0/0.04)] sm:px-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditorOpen(false)}
                  >
                    Cancel
                  </Button>
                  <div className="flex flex-wrap justify-end gap-2">
                  {resource?.public_read && form.status !== "published" ? (
                    <Button type="submit" variant="outline" disabled={saving}>
                      {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
                      {editing ? `Save as ${label(form.status)}` : "Save draft"}
                    </Button>
                  ) : null}
                  {resource?.public_read ? (
                    <Button
                      type={form.status === "published" ? "submit" : "button"}
                      disabled={saving}
                      onClick={
                        form.status === "published"
                          ? undefined
                          : (event) => save(event, "published")
                      }
                    >
                      {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
                      {form.status === "published"
                        ? "Save changes"
                        : editing
                          ? "Save & publish"
                          : `Publish ${resourceUX?.singular ?? "record"}`}
                    </Button>
                  ) : (
                    <Button type="submit" disabled={saving}>
                      {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
                      {editing
                        ? "Save changes"
                        : `Create ${resourceUX?.singular ?? "record"}`}
                    </Button>
                  )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <QuickCreateRelatedDialog
        request={relatedCreate}
        onClose={() => setRelatedCreate(undefined)}
        onCreated={useRelatedRecord}
      />

      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(undefined)} title={`Delete ${resourceUX?.singular ?? "record"}?`} description={`${deleteTarget?.title || deleteTarget?.slug || "This record"} will be permanently removed. This cannot be undone.`} confirmLabel="Delete permanently" onConfirm={() => deleteTarget && void remove(deleteTarget)} pending={Boolean(deleteTarget && busyRecord === String(deleteTarget.id))} />

      <Card>
        <CardContent className="p-0">
          {!!resource?.workflow?.length && (
            <div className="flex gap-2 overflow-x-auto border-b p-3">
              <Button
                type="button"
                variant={operationalFilter === "" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  setOperationalFilter("");
                  setPage(1);
                }}
                className="whitespace-nowrap"
              >
                All {resourceName.toLowerCase()}
              </Button>
              {resource.workflow.map((state) => (
                <Button
                  key={state.value}
                  type="button"
                  variant={operationalFilter === state.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setOperationalFilter(state.value);
                    setPage(1);
                  }}
                  className="whitespace-nowrap"
                >
                  {state.label}
                  <span className="ml-1.5 opacity-70">
                    {workflowCounts[state.value] ?? 0}
                  </span>
                </Button>
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
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(value) => {
                    setStatusFilter(value === "all" ? "" : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full lg:w-40" aria-label="Filter by publishing status"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                </Select>
            )}
            <Select
              value={ordering}
              onValueChange={(value) => {
                setOrdering(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-44" aria-label="Sort records"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="-updated_at">Recently updated</SelectItem><SelectItem value="-created_at">Newest first</SelectItem><SelectItem value="title">Title A–Z</SelectItem><SelectItem value="-title">Title Z–A</SelectItem></SelectContent>
            </Select>
            {(query ||
              statusFilter ||
              operationalFilter ||
              ordering !== "-updated_at") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("");
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
              onDelete={setDeleteTarget}
              onAction={applyAction}
            />
          ) : (
            <EmptyState
              icon={
                query || statusFilter || operationalFilter
                  ? Search
                  : FilePlus2
              }
              title={
                query || statusFilter || operationalFilter
                  ? "No matching records"
                  : `No ${resourceName.toLowerCase()} yet`
              }
              description={
                query || statusFilter || operationalFilter
                  ? "Try a different search or clear the filters."
                  : (resourceUX?.emptyMessage ??
                    `Create the first ${resourceUX?.singular ?? "record"} to get started.`)
              }
              action={
                query || statusFilter || operationalFilter
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
                  operationalFilter
                ) {
                  setQuery("");
                  setStatusFilter("");
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
    );
    if (publicRead) {
      metrics.push(
        { label: "published", value: items.filter((item) => item.status === "published").length },
        { label: "drafts", value: items.filter((item) => item.status === "draft").length },
      );
    }
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
    <section className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y bg-card px-4 py-3 text-sm text-muted-foreground sm:rounded-lg sm:border">
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
    <article className="overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/20">
      {view === "gallery" &&
        typeof imageValue === "string" && (
          <div className="relative aspect-video border-b bg-muted">
            <Image
              src={resolveMediaUrl(imageValue)}
              alt={item.title || item.slug}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              unoptimized
              className="object-cover"
            />
          </div>
        )}
      <div className="p-4">
        <Button
          type="button"
          variant="link"
          disabled={!mayEdit}
          onClick={() => onEdit(item)}
          className="max-w-full justify-start truncate text-left font-semibold disabled:cursor-default"
        >
          {item.title || item.slug}
        </Button>
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
              src={resolveMediaUrl(imageValue)}
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
          <Button
            type="button"
            variant="link"
            disabled={!mayEdit}
            onClick={() => onEdit(item)}
            className="block max-w-full truncate text-left font-semibold disabled:cursor-default"
          >
            {item.title || item.slug}
          </Button>
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
        <StatusBadge value={item.operational_status} />
      )}
      {publicRead && (
        <StatusBadge value={item.status} label={item.status === "published" ? "Live on website" : label(item.status)} />
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
  const maps =
    moduleKey === "location_management" && resourceKey === "locations"
      ? locationLinks(item)
      : undefined;
  return (
    <div className="flex items-center justify-end gap-1.5">
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" disabled={busy} aria-label={`Actions for ${item.title || item.slug}`}>
            {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <MoreHorizontal className="size-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {mayEdit ? <DropdownMenuItem onSelect={() => onEdit(item)}><Pencil />Edit</DropdownMenuItem> : null}
          {maps ? <><DropdownMenuItem asChild><a href={maps.map} target="_blank" rel="noreferrer"><MapPinned />View map</a></DropdownMenuItem><DropdownMenuItem asChild><a href={maps.directions} target="_blank" rel="noreferrer"><Navigation />Directions</a></DropdownMenuItem></> : null}
          {typeof item.email === "string" && item.email ? <DropdownMenuItem asChild><a href={`mailto:${item.email}`}><Mail />Send email</a></DropdownMenuItem> : null}
          {typeof item.phone === "string" && item.phone ? <DropdownMenuItem asChild><a href={`tel:${item.phone}`}><Phone />Call</a></DropdownMenuItem> : null}
          {typeof item.url === "string" && item.url ? <DropdownMenuItem asChild><a href={item.url} target="_blank" rel="noreferrer"><ExternalLink />Open link</a></DropdownMenuItem> : null}
          {mayWorkflow && resource?.workflow?.length ? <><DropdownMenuSeparator /><DropdownMenuLabel>Change status</DropdownMenuLabel>{resource.workflow.map((state) => <DropdownMenuItem key={state.value} disabled={item.operational_status === state.value} onSelect={() => onAction(item, `set-${state.value}`)}>{state.label}</DropdownMenuItem>)}</> : null}
          {mayPublish && resource?.public_read ? <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => onAction(item, item.status === "published" ? "unpublish" : "publish")}>{item.status === "published" ? "Remove from website" : "Publish to website"}</DropdownMenuItem></> : null}
          {mayDelete ? <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)}><Trash2 />Delete</DropdownMenuItem></> : null}
        </DropdownMenuContent>
      </DropdownMenu>
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
      <legend className="text-[13px] font-semibold text-neutral-800">
        {fieldLabel}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </legend>
      <div className="mt-2">{children}</div>
      {(error || help) && (
        <span
          className={`mt-1.5 block text-xs font-normal leading-5 ${error ? "text-destructive" : "text-muted-foreground"}`}
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
  const presentation = seoFieldPresentation(field);
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
    field.key === "gallery" ||
    field.key === "meta_title" ||
    isImageField(field);
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
      <div>
      <Textarea
        aria-label={presentation.label}
        className={
          field.type === "json" ? "min-h-36 font-mono text-xs" : "min-h-24"
        }
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
        placeholder={presentation.placeholder ?? (field.type === "json" ? "{}" : undefined)}
      />
      {["meta_title", "meta_description"].includes(field.key) ? (
        <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
          {String(value ?? "").length}/{field.key === "meta_title" ? 60 : 160}
        </p>
      ) : null}
      </div>
    ) : field.key === "robots" ? (
      <select
        aria-label={presentation.label}
        className={selectClass}
        value={String(value || "index,follow")}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="index,follow">Show in search and follow links</option>
        <option value="index,nofollow">Show in search, do not follow links</option>
        <option value="noindex,follow">Hide from search, follow links</option>
        <option value="noindex,nofollow">Hide from search and do not follow links</option>
      </select>
    ) : field.key === "sitemap_priority" ? (
      <select
        aria-label={presentation.label}
        className={selectClass}
        value={String(value || "0.50")}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="0.30">Supporting page</option>
        <option value="0.50">Normal page</option>
        <option value="0.80">Important page</option>
        <option value="1.00">Top-level page</option>
      </select>
    ) : field.key === "schema_type" ? (
      <select
        aria-label={presentation.label}
        className={selectClass}
        value={String(value || "Organization")}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="Organization">Organization</option>
        <option value="LocalBusiness">Local business</option>
        <option value="WebSite">Website</option>
        <option value="Article">Article</option>
        <option value="Product">Product</option>
        <option value="Event">Event</option>
        <option value="FAQPage">FAQ page</option>
        <option value="BreadcrumbList">Breadcrumbs</option>
      </select>
    ) : field.type === "select" ? (
      <select
        aria-label={presentation.label}
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
    ) : field.key === "meta_title" ? (
      <div>
        <Input
          aria-label={presentation.label}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
          placeholder={presentation.placeholder}
          maxLength={255}
        />
        <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
          {String(value ?? "").length}/60 recommended
        </p>
      </div>
    ) : field.type === "boolean" ? (
      <label className="flex h-10 items-center justify-between gap-3 rounded-lg border border-neutral-300 bg-card px-3 font-normal">
        <span className="text-sm text-muted-foreground">
          {value ? "Enabled" : "Disabled"}
        </span>
        <input
          aria-label={field.label}
          type="checkbox"
          className="size-4 accent-[var(--brand)]"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
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
        step={
          numericField
            ? ["latitude", "longitude"].includes(field.key)
              ? "0.000001"
              : fractionalNumber
                ? "0.01"
                : "1"
            : undefined
        }
        min={
          numericField && !allowNegative
            ? field.key === "rating"
              ? 1
              : 0
            : undefined
        }
        max={
          field.key === "latitude"
            ? 90
            : field.key === "longitude"
              ? 180
              : maximum
        }
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
        placeholder={presentation.placeholder}
      />
    );
  return (
    <FieldLabel
      label={presentation.label}
      required={field.required}
      help={presentation.help ?? field.help_text}
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
            <Button
              key={item}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                onChange(
                  JSON.stringify(values.filter((value) => value !== item)),
                )
              }
              className="h-7"
              aria-label={`Remove ${item}`}
            >
              {item} ×
            </Button>
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
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([{}])}
          className="h-auto w-full border-dashed p-6 text-muted-foreground"
        >
          Add the first line item
        </Button>
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
  const [deleteRecord, setDeleteRecord] = useState<Record<string, unknown>>();
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
    if (!record.id) return;
    try {
      await deleteAdminSupportRecord(contract.endpoint, String(record.id));
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setDeleteRecord(undefined);
    } catch (cause) {
      setErrorMessage(
        cause instanceof Error
          ? cause.message
          : "The related record could not be deleted.",
      );
    }
  }

  return (
    <>
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
        <div className="divide-y rounded-lg border">
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
                    ? `Created ${formatRecordDate(record.created_at)}`
                    : contract.label}
                </p>
              </div>
              <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Related record actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setEditor(Object.fromEntries(Object.entries(record).map(([key, value]) => [key, typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : value])))}><Pencil />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setDeleteRecord(record)}><Trash2 />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
          No {contract.label.toLowerCase()} yet.
        </p>
      )}
    </div>
    <ConfirmDialog open={Boolean(deleteRecord)} onOpenChange={(open) => !open && setDeleteRecord(undefined)} title="Delete related record?" description={`This entry will be permanently removed from ${contract.label.toLowerCase()}.`} confirmLabel="Delete permanently" onConfirm={() => deleteRecord && void removeRelated(deleteRecord)} />
    </>
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
