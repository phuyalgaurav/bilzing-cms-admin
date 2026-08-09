import { apiFetch } from "./api-client";
import { API_URL, TENANT_KEY } from "./tenant-config";
import type {
  ModuleContract,
  ModuleRecord,
  Paginated,
  RecordAttachment,
  RecordContext,
  RecordNote,
  RecordTag,
} from "./types";

function detailPath(endpoint: string, slug?: string) {
  const base = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;
  return slug ? `${base}${encodeURIComponent(slug)}/` : base;
}

function requestBody(record: Record<string, unknown>) {
  const containsFile = Object.values(record).some(
    (value) => typeof File !== "undefined" && value instanceof File,
  );
  if (!containsFile) return JSON.stringify(record);
  const form = new FormData();
  Object.entries(record).forEach(([key, value]) => {
    if (value === undefined || value === null || key === "id") return;
    if (value instanceof File) form.set(key, value);
    else if (typeof value === "object") form.set(key, JSON.stringify(value));
    else form.set(key, String(value));
  });
  return form;
}

export function adminModulePath(endpoint: string, slug?: string) {
  return detailPath(endpoint, slug);
}

export function publicModulePath(endpoint: string, slug?: string) {
  return detailPath(endpoint, slug);
}

export function getAdminModuleDirectory() {
  return apiFetch<ModuleContract[]>("/api/v1/admin/modules/");
}

let directoryRequest: Promise<ModuleContract[]> | undefined;

/** Resolve endpoints from the tenant's active server contract, never from a hard-coded route. */
export function getAdminResourceEndpoint(moduleKey: string, resourceKey: string) {
  directoryRequest ??= getAdminModuleDirectory().catch((cause) => {
    directoryRequest = undefined;
    throw cause;
  });
  return directoryRequest.then((directory) => {
    const endpoint = directory
      .find((module) => module.key === moduleKey)
      ?.resources.find((resource) => resource.key === resourceKey)?.admin_endpoint;
    if (!endpoint)
      throw new Error("This resource is not enabled for the current tenant.");
    return endpoint;
  });
}

export function getAdminModuleRecords(
  endpoint: string,
  filters: {
    search?: string;
    status?: string;
    visibility?: string;
    operational_status?: string;
    ordering?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const parameters = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    parameters.set(key === "pageSize" ? "page_size" : key, String(value));
  });
  const query = parameters.size ? `?${parameters.toString()}` : "";
  return apiFetch<Paginated<ModuleRecord> | ModuleRecord[]>(
    `${adminModulePath(endpoint)}${query}`,
  );
}

export function saveAdminModuleRecord(
  endpoint: string,
  record: Partial<ModuleRecord> & Pick<ModuleRecord, "title" | "slug">,
) {
  const body = requestBody(record);
  return apiFetch<ModuleRecord>(
    adminModulePath(endpoint, record.id ? record.slug : undefined),
    { method: record.id ? "PATCH" : "POST", body },
  );
}

export function getAdminSupportRecords(
  endpoint: string,
  parentField: string,
  parentId: string | number,
) {
  const query = new URLSearchParams({
    [parentField]: String(parentId),
    ordering: "-created_at",
  });
  return apiFetch<
    Paginated<Record<string, unknown>> | Record<string, unknown>[]
  >(`${detailPath(endpoint)}?${query}`);
}

export function saveAdminSupportRecord(
  endpoint: string,
  record: Record<string, unknown>,
) {
  const id = record.id;
  return apiFetch<Record<string, unknown>>(
    detailPath(endpoint, id ? String(id) : undefined),
    {
      method: id ? "PATCH" : "POST",
      body: requestBody(record),
    },
  );
}

export function deleteAdminSupportRecord(
  endpoint: string,
  id: string | number,
) {
  return apiFetch<void>(detailPath(endpoint, String(id)), { method: "DELETE" });
}

export function deleteAdminModuleRecord(
  endpoint: string,
  record: Pick<ModuleRecord, "slug">,
) {
  return apiFetch<void>(adminModulePath(endpoint, record.slug), {
    method: "DELETE",
  });
}

export function runAdminModuleAction(
  endpoint: string,
  record: Pick<ModuleRecord, "slug">,
  action: string,
) {
  return apiFetch<ModuleRecord>(
    `${adminModulePath(endpoint, record.slug)}actions/${encodeURIComponent(action)}/`,
    { method: "POST" },
  );
}

function recordContextPath(endpoint: string, slug: string, suffix: string) {
  return `${adminModulePath(endpoint, slug)}${suffix}`;
}

export function getAdminRecordContext(endpoint: string, slug: string) {
  return apiFetch<RecordContext>(recordContextPath(endpoint, slug, "context/"));
}

export function addAdminRecordTag(
  endpoint: string,
  slug: string,
  payload: { name: string; color?: string },
) {
  return apiFetch<RecordTag>(recordContextPath(endpoint, slug, "tags/"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function removeAdminRecordTag(
  endpoint: string,
  slug: string,
  tagSlug: string,
) {
  return apiFetch<void>(
    recordContextPath(endpoint, slug, `tags/${encodeURIComponent(tagSlug)}/`),
    { method: "DELETE" },
  );
}

export function addAdminRecordNote(
  endpoint: string,
  slug: string,
  payload: { body: string; assigned_to?: string },
) {
  return apiFetch<RecordNote>(recordContextPath(endpoint, slug, "notes/"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addAdminRecordAttachment(
  endpoint: string,
  slug: string,
  file: File,
  title = "",
) {
  const body = new FormData();
  body.set("file", file);
  if (title) body.set("title", title);
  return apiFetch<RecordAttachment>(
    recordContextPath(endpoint, slug, "attachments/"),
    { method: "POST", body },
  );
}

/** Read the public delivery API without attaching an admin JWT. */
export async function publicSiteFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!API_URL)
    throw new Error("NEXT_PUBLIC_API_URL is required for public API requests.");
  const headers = new Headers(init.headers);
  headers.set("X-Tenant-Key", TENANT_KEY);
  if (!(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok)
    throw new Error(`Public CMS request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export function getPublicModuleDirectory() {
  return publicSiteFetch<ModuleContract[]>("/api/v1/public/modules/");
}

export function getPublicModuleRecords(endpoint: string) {
  return publicSiteFetch<Paginated<ModuleRecord> | ModuleRecord[]>(
    publicModulePath(endpoint),
  );
}

export function submitPublicModuleRecord(
  endpoint: string,
  submission: Record<string, unknown>,
) {
  return publicSiteFetch<Pick<ModuleRecord, "id" | "title" | "created_at">>(
    publicModulePath(endpoint),
    {
      method: "POST",
      body: JSON.stringify(submission),
    },
  );
}
