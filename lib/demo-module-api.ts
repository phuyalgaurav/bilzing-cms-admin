import { moduleExperiences, titleCase } from "./module-experience";
import type {
  ModuleContract,
  ModuleRecord,
  ModuleResourceContract,
  Paginated,
  ResourceField,
  TenantMember,
} from "./types";

const STORAGE_KEY = "bilzing-cms-demo-modules-v1";
const NOW = "2026-08-09T09:00:00.000Z";

type DemoStore = {
  records: Record<string, ModuleRecord[]>;
  members: TenantMember[];
};

const workflowFor = (moduleKey: string) => {
  if (["orders", "delivery", "booking", "membership", "crm"].includes(moduleKey))
    return [
      ["new", "New"],
      ["in_progress", "In progress"],
      ["completed", "Completed"],
    ] as const;
  if (["payments", "invoice", "quotation", "subscription"].includes(moduleKey))
    return [
      ["pending", "Pending"],
      ["paid", "Paid"],
      ["overdue", "Overdue"],
    ] as const;
  if (["reviews", "contact_management", "patient_records", "admissions"].includes(moduleKey))
    return [
      ["open", "Open"],
      ["approved", "Approved"],
      ["closed", "Closed"],
    ] as const;
  return [] as const;
};

const fieldType = (key: string): ResourceField["type"] => {
  if (/email/.test(key)) return "email";
  if (/(url|website|canonical)/.test(key)) return "url";
  if (/(date|expires|occurred|published)/.test(key)) return "date";
  if (/(time|duration)/.test(key)) return "time";
  if (/(price|amount|cost|quantity|rating|latitude|longitude|discount|capacity|stock|level|code)/.test(key)) return "number";
  if (/(description|comment|message|address|bio|notes|content|answer)/.test(key)) return "textarea";
  return "text";
};

const defaultFields = (primaryFields: string[]): ResourceField[] => {
  const fields = primaryFields.length ? primaryFields : ["name"];
  return [
    ...fields.map((key) => ({
      key,
      label: titleCase(key),
      type: fieldType(key),
      required: key === fields[0],
    })),
    {
      key: "description",
      label: "Description",
      type: "textarea" as const,
      required: false,
    },
  ];
};

const locationFields: ResourceField[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "image", label: "Image", type: "url", required: false },
  { key: "address", label: "Address", type: "textarea", required: false },
  { key: "latitude", label: "Latitude", type: "number", required: false },
  { key: "longitude", label: "Longitude", type: "number", required: false },
  { key: "phone", label: "Phone", type: "text", required: false },
  { key: "directions", label: "Directions", type: "textarea", required: false },
  { key: "parking_info", label: "Parking and access", type: "textarea", required: false },
  { key: "opening_hours", label: "Opening hours", type: "json", required: false },
  { key: "is_primary", label: "Primary location", type: "boolean", required: false },
];

const seoFields: Record<string, ResourceField[]> = {
  "seo-settings": [
    { key: "page", label: "Page", type: "text", required: false },
    { key: "meta_title", label: "Meta title", type: "text", required: false },
    { key: "meta_description", label: "Meta description", type: "textarea", required: false },
    { key: "canonical_url", label: "Canonical URL", type: "url", required: false },
    { key: "robots", label: "Robots", type: "text", required: false },
    { key: "sitemap_priority", label: "Sitemap priority", type: "number", required: false },
    { key: "og_image", label: "Open Graph image", type: "url", required: false },
  ],
  redirects: [
    { key: "from_path", label: "From path", type: "text", required: true },
    { key: "to_path", label: "To path", type: "text", required: true },
    {
      key: "code",
      label: "Code",
      type: "select",
      required: true,
      options: [
        ["301", "301 Permanent"],
        ["302", "302 Temporary"],
        ["307", "307 Temporary"],
        ["308", "308 Permanent"],
      ],
    },
    { key: "is_active", label: "Active", type: "boolean", required: false },
  ],
  schema: [
    { key: "schema_type", label: "Schema type", type: "text", required: false },
    { key: "json_ld", label: "JSON-LD", type: "json", required: false },
  ],
};

function fieldsFor(moduleKey: string, resourceKey: string, primaryFields: string[]) {
  if (moduleKey === "location_management" && resourceKey === "locations")
    return locationFields;
  if (moduleKey === "seo_management" && seoFields[resourceKey])
    return seoFields[resourceKey];
  return defaultFields(primaryFields);
}

const canonicalPathOverrides: Record<string, string> = {
  "analytics:events": "analytics-events",
  "membership:plans": "membership-plans",
  "notifications:subscriptions": "notification-subscriptions",
  "subscription:plans": "subscription-plans",
  "subscription:subscriptions": "recurring-subscriptions",
};

const dedicatedResources = new Set(["pages", "navigations", "media", "members", "posts"]);

function canonicalPath(moduleKey: string, resourceKey: string) {
  return canonicalPathOverrides[`${moduleKey}:${resourceKey}`] ?? resourceKey;
}

function endpointFor(moduleKey: string, resourceKey: string) {
  if (dedicatedResources.has(resourceKey))
    return resourceKey === "members"
      ? "/api/v1/admin/members/"
      : `/api/v1/${resourceKey}/`;
  return `/api/v1/admin/${canonicalPath(moduleKey, resourceKey)}/`;
}

function publicResource(moduleKey: string, resourceKey: string) {
  return (
    ["website_pages", "media_library", "blog", "gallery", "faq", "team_management", "service_catalog", "product_catalog", "location_management", "seo_management"].includes(moduleKey) ||
    ["pages", "posts", "gallery-items", "faqs", "services", "products"].includes(resourceKey)
  );
}

export const demoModuleDirectory: ModuleContract[] = Object.entries(moduleExperiences).map(
  ([moduleKey, experience]) => ({
    key: moduleKey,
    name: experience.label,
    description: experience.description,
    resources: Object.entries(experience.resources).map(
      ([resourceKey, resource]) => {
        const workflow = workflowFor(moduleKey);
        return {
          key: resourceKey,
          canonical_path: canonicalPath(moduleKey, resourceKey),
          admin_endpoint: endpointFor(moduleKey, resourceKey),
          public_endpoint: `/api/v1/${canonicalPath(moduleKey, resourceKey)}/`,
          public_read: publicResource(moduleKey, resourceKey),
          public_create: false,
          fields: fieldsFor(moduleKey, resourceKey, resource.primaryFields ?? []),
          line_items: null,
          support: null,
          workflow: workflow.map(([value, label]) => ({ value, label })),
          actions: ["publish", "unpublish", "archive", ...workflow.map(([value]) => `set-${value}`)],
          allowed_actions: ["view", "create", "edit", "delete", "publish", "workflow", "bulk", "import", "export"],
        } satisfies ModuleResourceContract;
      },
    ),
  }),
);

const contractsByEndpoint = new Map(
  demoModuleDirectory.flatMap((module) =>
    module.resources.map((resource) => [resource.admin_endpoint, { module, resource }] as const),
  ),
);

function defaultValue(key: string, position: number): string | number {
  if (key === "robots") return "index,follow";
  if (key === "sitemap_priority") return 0.5;
  if (key === "schema_type") return "Organization";
  if (key === "code") return "301";
  if (key === "from_path") return `/old-page-${position}`;
  if (key === "to_path") return `/new-page-${position}`;
  if (key === "canonical_url") return `https://example.com/page-${position}`;
  if (key === "page") return `/page-${position}`;
  if (/email/.test(key)) return `sample${position}@bilzing.test`;
  if (/(url|website|canonical)/.test(key)) return `https://example.test/${position}`;
  if (/(date|expires|occurred|published)/.test(key)) return "2026-08-09";
  if (/(time|duration)/.test(key)) return position === 1 ? "09:00" : "14:00";
  if (key === "latitude") return position === 1 ? 27.717245 : 27.671;
  if (key === "longitude") return position === 1 ? 85.323959 : 85.4298;
  if (/(price|amount|cost|quantity|rating|discount|capacity|stock|level|code)/.test(key)) return position * 100;
  return `Sample ${titleCase(key)} ${position}`;
}

function seededRecord(
  moduleKey: string,
  resource: ModuleResourceContract,
  position: number,
): ModuleRecord {
  const title = `Sample ${titleCase(resource.key).replace(/s$/, "")} ${position}`;
  const workflow = resource.workflow?.[position - 1]?.value;
  const media = resource.key === "media";
  const imageUrl = `https://images.unsplash.com/photo-${position === 1 ? "1497366754035-f200968a6e72" : "1522071820081-009f0129c71c"}?auto=format&fit=crop&w=1200&q=80`;
  return {
    id: `${moduleKey}-${resource.key}-${position}`,
    module_key: moduleKey,
    resource_type: resource.key,
    title,
    slug: `${resource.key}-${position}`,
    status: position === 1 && resource.public_read ? "published" : "draft",
    visibility: resource.public_read ? "public" : "private",
    published_at: position === 1 && resource.public_read ? NOW : null,
    sort_order: position,
    created_at: NOW,
    updated_at: NOW,
    operational_status: workflow,
    ...Object.fromEntries(
      resource.fields.map((field) => [field.key, defaultValue(field.key, position)]),
    ),
    ...(media
      ? {
          file: imageUrl,
          alt_text: `Demo image ${position}`,
          metadata: { width: 1200, height: 800, content_type: "image/jpeg" },
        }
      : {}),
  };
}

function initialStore(): DemoStore {
  return {
    records: Object.fromEntries(
      demoModuleDirectory.flatMap((module) =>
        module.resources.map((resource) => [
          resource.admin_endpoint,
          [seededRecord(module.key, resource, 1), seededRecord(module.key, resource, 2)],
        ]),
      ),
    ),
    members: [
      {
        id: "demo-admin",
        email: "admin@bilzing.test",
        role: "super_admin",
        is_active: true,
        created_at: NOW,
      },
      {
        id: "demo-editor",
        email: "editor@bilzing.test",
        role: "editor",
        is_active: true,
        created_at: NOW,
      },
    ],
  };
}

function store(): DemoStore {
  if (typeof window === "undefined") return initialStore();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as DemoStore;
  } catch {
    // A malformed local demo store is safely replaced with the current seed.
  }
  const initial = initialStore();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function save(next: DemoStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

async function body(init: RequestInit): Promise<Record<string, unknown>> {
  if (init.body instanceof FormData) {
    const entries = await Promise.all(
      Array.from(init.body.entries()).map(async ([key, value]) => [
        key,
        value instanceof File
          ? key === "file"
            ? await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(value);
              })
            : value.name
          : value,
      ]),
    );
    return Object.fromEntries(entries);
  }
  try {
    return JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function paginated(records: ModuleRecord[], search: URLSearchParams): Paginated<ModuleRecord> {
  let result = [...records];
  const query = search.get("search")?.toLowerCase();
  if (query) result = result.filter((record) => JSON.stringify(record).toLowerCase().includes(query));
  for (const key of ["status", "visibility", "operational_status"] as const) {
    const value = search.get(key);
    if (value) result = result.filter((record) => String(record[key] ?? "") === value);
  }
  const ordering = search.get("ordering") ?? "-updated_at";
  const descending = ordering.startsWith("-");
  const orderKey = ordering.replace(/^-/, "");
  result.sort((left, right) => {
    const compare = String(left[orderKey] ?? "").localeCompare(String(right[orderKey] ?? ""));
    return descending ? -compare : compare;
  });
  const count = result.length;
  const page = Math.max(1, Number(search.get("page") ?? 1));
  const pageSize = Math.max(1, Number(search.get("page_size") ?? 15));
  return { count, results: result.slice((page - 1) * pageSize, page * pageSize) };
}

function memberResponse(path: string, init: RequestInit, data: DemoStore) {
  const parsed = new URL(path, "http://demo.local");
  const method = init.method ?? "GET";
  const detail = parsed.pathname.match(/\/members\/([^/]+)\/?$/)?.[1];
  if (!detail && method === "GET") return { handled: true, value: { count: data.members.length, results: data.members } };
  if (!detail && method === "POST") return { handled: true, value: null as TenantMember | null, createMember: true };
  const member = data.members.find((item) => String(item.id) === decodeURIComponent(detail ?? ""));
  return { handled: Boolean(member), value: member, member };
}

/** Browser-local implementation of the Django admin module API for standalone demos. */
export async function demoModuleFetch<T>(path: string, init: RequestInit): Promise<{ handled: boolean; value?: T }> {
  const parsed = new URL(path, "http://demo.local");
  if (parsed.pathname === "/api/v1/admin/modules/")
    return { handled: true, value: demoModuleDirectory as T };
  const data = store();
  const method = init.method ?? "GET";
  if (parsed.pathname.startsWith("/api/v1/admin/members/")) {
    const result = memberResponse(path, init, data);
    if (!result.handled) return { handled: false };
    if (!result.member && !result.createMember)
      return { handled: true, value: result.value as T };
    const payload = await body(init);
    if (result.createMember) {
      const created: TenantMember = {
        id: `member-${Date.now()}`,
        email: String(payload.email ?? "new.member@bilzing.test"),
        role: (payload.role as TenantMember["role"]) ?? "editor",
        is_active: payload.is_active !== false,
        created_at: new Date().toISOString(),
      };
      data.members.push(created);
      save(data);
      return { handled: true, value: created as T };
    }
    if (!result.member) return { handled: false };
    if (method === "DELETE") {
      data.members = data.members.filter((item) => item.id !== result.member!.id);
      save(data);
      return { handled: true, value: undefined as T };
    }
    if (method === "PATCH" || method === "PUT") {
      Object.assign(result.member, payload, { updated_at: new Date().toISOString() });
      save(data);
    }
    return { handled: true, value: result.member as T };
  }

  const matched = [...contractsByEndpoint.entries()].find(([endpoint]) =>
    parsed.pathname.startsWith(endpoint),
  );
  if (!matched) return { handled: false };
  const [endpoint, { module, resource }] = matched;
  const remainder = parsed.pathname.slice(endpoint.length).replace(/^\/+|\/+$/g, "");
  const records = data.records[endpoint] ?? [];

  if (remainder.includes("/context"))
    return { handled: true, value: { tags: [], notes: [], attachments: [], activity: [] } as T };
  if (remainder.includes("/tags") || remainder.includes("/notes") || remainder.includes("/attachments"))
    return { handled: true, value: { id: `demo-${Date.now()}`, created_at: new Date().toISOString() } as T };

  const [slug, actionMarker, action] = remainder.split("/");
  const index = slug ? records.findIndex((record) => record.slug === decodeURIComponent(slug)) : -1;
  if (actionMarker === "actions" && action && index >= 0) {
    const record = records[index];
    if (action === "publish") Object.assign(record, { status: "published", visibility: "public", published_at: new Date().toISOString() });
    else if (action === "unpublish") Object.assign(record, { status: "draft", published_at: null });
    else if (action === "archive") record.status = "archived";
    else if (action.startsWith("set-")) record.operational_status = action.slice(4);
    record.updated_at = new Date().toISOString();
    save(data);
    return { handled: true, value: record as T };
  }
  if (!slug && method === "GET") return { handled: true, value: paginated(records, parsed.searchParams) as T };
  if (!slug && method === "POST") {
    const payload = await body(init);
    const title = String(payload.title ?? payload.name ?? `New ${titleCase(resource.key)}`);
    const created: ModuleRecord = {
      id: `${module.key}-${resource.key}-${Date.now()}`,
      module_key: module.key,
      resource_type: resource.key,
      title,
      slug: String(payload.slug ?? `${resource.key}-${Date.now()}`),
      status: (payload.status as ModuleRecord["status"]) ?? "draft",
      visibility: (payload.visibility as ModuleRecord["visibility"]) ?? "private",
      sort_order: Number(payload.sort_order ?? 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    };
    records.unshift(created);
    data.records[endpoint] = records;
    save(data);
    return { handled: true, value: created as T };
  }
  if (index < 0) return { handled: false };
  if (method === "GET") return { handled: true, value: records[index] as T };
  if (method === "DELETE") {
    records.splice(index, 1);
    save(data);
    return { handled: true, value: undefined as T };
  }
  if (method === "PATCH" || method === "PUT") {
    Object.assign(records[index], await body(init), { updated_at: new Date().toISOString() });
    save(data);
    return { handled: true, value: records[index] as T };
  }
  return { handled: false };
}
