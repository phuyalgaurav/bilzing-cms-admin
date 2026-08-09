import { demoModuleFetch } from "./demo-module-api";
import { API_URL, DEMO_MODE, TENANT_KEY } from "./tenant-config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function parseError(response: Response) {
  const details = await response.json().catch(() => null);
  const fieldMessage =
    details && typeof details === "object"
      ? Object.entries(details as Record<string, unknown>)
          .map(([field, value]) => `${field.replace(/_/g, " ")}: ${Array.isArray(value) ? value.join(" ") : String(value)}`)
          .join(" · ")
      : "";
  return new ApiError(
    typeof details?.detail === "string"
      ? details.detail
      : fieldMessage || `Request failed (${response.status})`,
    response.status,
    details,
  );
}

async function refreshAccessToken() {
  const response = await fetch("/api/auth/refresh", { method: "POST" });
  if (!response.ok) return null;
  const data = await response.json();
  accessToken = data.access;
  return accessToken;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  if (DEMO_MODE) {
    const result = await demoModuleFetch<T>(path, init);
    if (result.handled) return result.value as T;
    throw new ApiError(`The demo does not implement ${path}.`, 404);
  }
  if (!API_URL)
    throw new ApiError("Add NEXT_PUBLIC_API_URL to connect the CMS backend.", 0);
  const headers = new Headers(init.headers);
  headers.set("X-Tenant-Key", TENANT_KEY);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && (await refreshAccessToken()))
    return apiFetch<T>(path, init, false);
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return response.json();
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
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(`Public CMS request failed (${response.status}).`);
  return response.json() as Promise<T>;
}
