import { apiFetch } from "./api-client";
import { API_URL, TENANT_KEY } from "./tenant-config";
import type { ModuleContract, ModuleRecord, Paginated } from "./types";

export function adminModulePath(moduleKey: string, resourceType: string, slug?: string) {
  const base = `/api/v1/admin/modules/${encodeURIComponent(moduleKey)}/${encodeURIComponent(resourceType)}/`;
  return slug ? `${base}${encodeURIComponent(slug)}/` : base;
}

export function publicModulePath(moduleKey: string, resourceType: string, slug?: string) {
  const base = `/api/v1/public/modules/${encodeURIComponent(moduleKey)}/${encodeURIComponent(resourceType)}/`;
  return slug ? `${base}${encodeURIComponent(slug)}/` : base;
}

export function getAdminModuleDirectory() {
  return apiFetch<ModuleContract[]>("/api/v1/admin/modules/");
}

export function getAdminModuleRecords(moduleKey: string, resourceType: string) {
  return apiFetch<Paginated<ModuleRecord> | ModuleRecord[]>(
    adminModulePath(moduleKey, resourceType),
  );
}

export function saveAdminModuleRecord(
  moduleKey: string,
  resourceType: string,
  record: Partial<ModuleRecord> & Pick<ModuleRecord, "title" | "slug" | "data">,
) {
  return apiFetch<ModuleRecord>(
    adminModulePath(moduleKey, resourceType, record.id ? record.slug : undefined),
    { method: record.id ? "PATCH" : "POST", body: JSON.stringify(record) },
  );
}

/** Read the public delivery API without attaching an admin JWT. */
export async function publicSiteFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is required for public API requests.");
  const headers = new Headers(init.headers);
  headers.set("X-Tenant-Key", TENANT_KEY);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(`Public CMS request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export function getPublicModuleDirectory() {
  return publicSiteFetch<ModuleContract[]>("/api/v1/public/modules/");
}

export function getPublicModuleRecords(moduleKey: string, resourceType: string) {
  return publicSiteFetch<Paginated<ModuleRecord> | ModuleRecord[]>(
    publicModulePath(moduleKey, resourceType),
  );
}

export function submitPublicModuleRecord(
  moduleKey: string,
  resourceType: string,
  submission: { title?: string; data: Record<string, unknown> },
) {
  return publicSiteFetch<Pick<ModuleRecord, "id" | "title" | "data" | "created_at">>(
    publicModulePath(moduleKey, resourceType),
    { method: "POST", body: JSON.stringify(submission) },
  );
}
