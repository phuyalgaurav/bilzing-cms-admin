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

const demoSeed = {
  pages: [
    {
      id: 1,
      title: "Home",
      slug: "home",
      status: "published",
      excerpt: "A focused introduction to Bilzing and the work we do.",
      content: {
        body: "We build useful digital products, brands, and experiences.",
      },
      published_at: "2026-07-24T09:15:00Z",
      updated_at: "2026-08-05T10:30:00Z",
    },
    {
      id: 2,
      title: "About us",
      slug: "about",
      status: "published",
      excerpt: "Our story, approach, and the people behind the work.",
      content: {
        body: "Bilzing is an independent digital studio based in Nepal.",
      },
      published_at: "2026-07-18T08:00:00Z",
      updated_at: "2026-08-03T06:45:00Z",
    },
    {
      id: 3,
      title: "Services",
      slug: "services",
      status: "draft",
      excerpt: "Strategy, design, engineering, and ongoing support.",
      content: {
        body: "From first idea to a reliable product in the hands of customers.",
      },
      published_at: null,
      updated_at: "2026-08-06T04:20:00Z",
    },
    {
      id: 4,
      title: "Contact",
      slug: "contact",
      status: "published",
      excerpt: "Start a project or ask us a question.",
      content: {
        body: "Tell us what you are working on and where you need help.",
      },
      published_at: "2026-07-21T11:30:00Z",
      updated_at: "2026-07-29T07:10:00Z",
    },
  ],
  posts: [
    {
      id: 11,
      title: "Designing for clarity",
      slug: "designing-for-clarity",
      status: "published",
      excerpt:
        "Why the best interface is usually the one that asks less of people.",
      content: {
        body: "Clarity is not visual minimalism. It is the removal of uncertainty.",
      },
      author_name: "Bilzing Studio",
      tags: ["Design", "Process"],
      published_at: "2026-08-01T05:00:00Z",
      updated_at: "2026-08-01T05:00:00Z",
    },
    {
      id: 12,
      title: "What we learned shipping our new site",
      slug: "shipping-our-new-site",
      status: "draft",
      excerpt: "Notes from rebuilding our own corner of the internet.",
      content: {
        body: "Our website needed to show the work without getting in its way.",
      },
      author_name: "Bilzing Studio",
      tags: ["Studio"],
      published_at: null,
      updated_at: "2026-08-06T03:15:00Z",
    },
    {
      id: 13,
      title: "A practical guide to useful motion",
      slug: "useful-motion",
      status: "published",
      excerpt:
        "Animation should explain change, establish rhythm, and reward attention.",
      content: {
        body: "Motion is most valuable when it helps people understand what just happened.",
      },
      author_name: "Bilzing Studio",
      tags: ["Motion", "Design"],
      published_at: "2026-07-14T05:00:00Z",
      updated_at: "2026-07-20T09:40:00Z",
    },
  ],
  navigations: [
    {
      id: 21,
      name: "Main navigation",
      slug: "main",
      items: [
        { label: "Work", href: "/work" },
        { label: "About", href: "/about" },
        { label: "Journal", href: "/journal" },
        { label: "Contact", href: "/contact" },
      ],
      updated_at: "2026-08-04T08:30:00Z",
    },
    {
      id: 22,
      name: "Footer",
      slug: "footer",
      items: [
        { label: "Instagram", href: "https://instagram.com" },
        { label: "LinkedIn", href: "https://linkedin.com" },
        { label: "Privacy", href: "/privacy" },
      ],
      updated_at: "2026-07-28T08:30:00Z",
    },
  ],
  media: [
    {
      id: 31,
      title: "Studio workspace",
      url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
      alt_text: "The Bilzing studio workspace",
      metadata: { width: 1600, height: 1067 },
      created_at: "2026-08-02T07:00:00Z",
    },
    {
      id: 32,
      title: "Team workshop",
      url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
      alt_text: "Team members planning a project",
      metadata: { width: 1600, height: 1067 },
      created_at: "2026-07-29T07:00:00Z",
    },
    {
      id: 33,
      title: "Brand sketchbook",
      url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=900&q=80",
      alt_text: "Logo concepts drawn in a sketchbook",
      metadata: { width: 1200, height: 1200 },
      created_at: "2026-07-22T07:00:00Z",
    },
    {
      id: 34,
      title: "Project launch",
      url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
      alt_text: "A product interface on a laptop",
      metadata: { width: 1600, height: 1067 },
      created_at: "2026-07-16T07:00:00Z",
    },
  ],
};

type DemoStore = typeof demoSeed;
const DEMO_STORAGE_KEY = "bilzing-cms-demo-content-v2";
function getDemoStore(): DemoStore {
  if (typeof window === "undefined") return structuredClone(demoSeed);
  const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
  if (saved) return JSON.parse(saved) as DemoStore;
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoSeed));
  return structuredClone(demoSeed);
}

function saveDemoStore(store: DemoStore) {
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(store));
}

async function demoFetch<T>(path: string, init: RequestInit): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 180));
  const store = getDemoStore();
  const resource = path.match(
    /\/api\/v1\/(pages|posts|navigations|media)\//,
  )?.[1] as keyof DemoStore | undefined;
  if (!resource) throw new ApiError("Demo resource not found.", 404);
  const records = store[resource] as Array<Record<string, unknown>>;
  const method = init.method ?? "GET";
  const detail = path.match(new RegExp(`/api/v1/${resource}/([^?]+)/?`))?.[1];
  if (method === "GET") {
    const search = new URL(path, "http://demo.local").searchParams
      .get("search")
      ?.toLowerCase();
    const results = search
      ? records.filter((item) =>
          JSON.stringify(item).toLowerCase().includes(search),
        )
      : records;
    return { count: results.length, results: [...results] } as T;
  }
  if (method === "DELETE" && detail) {
    const index = records.findIndex(
      (item) => String(item.slug ?? item.id) === decodeURIComponent(detail),
    );
    if (index >= 0) records.splice(index, 1);
    saveDemoStore(store);
    return undefined as T;
  }
  let data: Record<string, unknown>;
  if (init.body instanceof FormData) {
    const file = init.body.get("file");
    const url =
      file instanceof File
        ? await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
        : undefined;
    data = {
      title: init.body.get("title"),
      alt_text: init.body.get("alt_text"),
      url,
    };
  } else {
    data = JSON.parse(String(init.body ?? "{}"));
  }
  if (method === "POST") {
    const created = {
      id: Date.now(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    records.unshift(created);
    saveDemoStore(store);
    return created as T;
  }
  if ((method === "PATCH" || method === "PUT") && detail) {
    const index = records.findIndex(
      (item) => String(item.slug ?? item.id) === decodeURIComponent(detail),
    );
    const updated = {
      ...records[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    records[index] = updated;
    saveDemoStore(store);
    return updated as T;
  }
  throw new ApiError("Demo action not supported.", 400);
}

async function parseError(response: Response) {
  const details = await response.json().catch(() => null);
  const fieldMessage =
    details && typeof details === "object"
      ? Object.entries(details as Record<string, unknown>)
          .map(([field, value]) => {
            const message = Array.isArray(value)
              ? value.join(" ")
              : String(value);
            return `${field.replace(/_/g, " ")}: ${message}`;
          })
          .join(" · ")
      : "";
  const message =
    typeof details?.detail === "string"
      ? details.detail
      : fieldMessage || `Request failed (${response.status})`;
  return new ApiError(message, response.status, details);
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
  if (DEMO_MODE) return demoFetch<T>(path, init);
  if (!API_URL)
    throw new ApiError(
      "Add NEXT_PUBLIC_API_URL to connect the CMS backend.",
      0,
    );
  const headers = new Headers(init.headers);
  headers.set("X-Tenant-Key", TENANT_KEY);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (!(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && (await refreshAccessToken()))
    return apiFetch<T>(path, init, false);
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return response.json();
}
