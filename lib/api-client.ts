import { demoModuleFetch } from "./demo-module-api";
import { API_URL, DEMO_MODE, TENANT_KEY } from "./tenant-config";
import type { Role } from "./types";

export const SESSION_REFRESHED_EVENT = "cms:session-refreshed";
export const SESSION_EXPIRED_EVENT = "cms:session-expired";

export interface RefreshedSession {
  access: string;
  role?: Role;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
    public retryAfterSeconds?: number,
    public rateLimit?: { scope?: string; label?: string; rate?: string },
  ) {
    super(message);
  }
}

type RateLimitDetails = {
  scope?: string;
  label?: string;
  rate?: string;
  retry_after_seconds?: number;
};

export function apiErrorMessage(
  details: unknown,
  status: number,
  retryAfterHeader?: string | null,
) {
  const data = details && typeof details === "object"
    ? (details as Record<string, unknown>)
    : undefined;
  const rateLimit = data?.rate_limit as RateLimitDetails | undefined;
  const retryAfterSeconds =
    rateLimit?.retry_after_seconds ??
    (Number.parseInt(retryAfterHeader ?? "", 10) || undefined);
  if (rateLimit) {
    return `You’ve reached the ${rateLimit.label ?? "API"} limit (${rateLimit.rate ?? "limited"}). Try again${retryAfterSeconds ? ` in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}` : " shortly"}.`;
  }
  const fieldMessage = data
    ? Object.entries(data)
        .map(([field, value]) => `${field.replace(/_/g, " ")}: ${Array.isArray(value) ? value.join(" ") : String(value)}`)
        .join(" · ")
    : "";
  return typeof data?.detail === "string"
    ? data.detail
    : fieldMessage || `Request failed (${status})`;
}

let accessToken: string | null = null;
let refreshRequest: Promise<RefreshedSession | null> | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}

function emitSessionEvent(name: string, detail?: RefreshedSession) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

async function parseError(response: Response) {
  const details = await response.json().catch(() => null);
  const rateLimit =
    details && typeof details === "object" && "rate_limit" in details
      ? (details.rate_limit as {
          scope?: string;
          label?: string;
          rate?: string;
          retry_after_seconds?: number;
        })
      : undefined;
  const retryAfterSeconds =
    rateLimit?.retry_after_seconds ??
    (Number.parseInt(response.headers.get("Retry-After") ?? "", 10) ||
      undefined);
  const rateLimitMessage = rateLimit
    ? `You’ve reached the ${rateLimit.label ?? "API"} limit (${rateLimit.rate ?? "limited"}). Try again${retryAfterSeconds ? ` in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}` : " shortly"}.`
    : undefined;
  return new ApiError(
    rateLimitMessage ?? apiErrorMessage(details, response.status, response.headers.get("Retry-After")),
    response.status,
    details,
    retryAfterSeconds,
    rateLimit,
  );
}

export async function refreshAdminSession() {
  if (refreshRequest) return refreshRequest;
  refreshRequest = (async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    if (response.ok) {
      const data = (await response.json()) as RefreshedSession;
      if (!data.access) throw new ApiError("The refreshed session was invalid.", 502);
      accessToken = data.access;
      emitSessionEvent(SESSION_REFRESHED_EVENT, data);
      return data;
    }
    if (response.status === 401) {
      accessToken = null;
      emitSessionEvent(SESSION_EXPIRED_EVENT);
      return null;
    }
    throw await parseError(response);
  })().finally(() => {
    refreshRequest = null;
  });
  return refreshRequest;
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
  if (response.status === 401 && retry) {
    const session = await refreshAdminSession();
    if (session) return apiFetch<T>(path, init, false);
    throw new ApiError("Your session expired. Sign in again to continue.", 401);
  }
  if (response.status === 401) {
    accessToken = null;
    emitSessionEvent(SESSION_EXPIRED_EVENT);
  }
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
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}
