import { apiFetch } from "./api-client";
import type { RecordActivity } from "./types";

export interface ActivityFacets {
  resource_paths: string[];
  events: string[];
  actors: string[];
}

export interface ActivityPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: RecordActivity[];
  facets: ActivityFacets;
}

export interface ActivityQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  resourcePath?: string;
  event?: string;
  actorEmail?: string;
}

export function getAdminActivity(query: ActivityQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? 30),
  });
  if (query.search) params.set("search", query.search);
  if (query.resourcePath) params.set("resource_path", query.resourcePath);
  if (query.event) params.set("event", query.event);
  if (query.actorEmail) params.set("actor_email", query.actorEmail);
  return apiFetch<ActivityPage>(`/api/v1/admin/activity/?${params}`, { signal });
}
