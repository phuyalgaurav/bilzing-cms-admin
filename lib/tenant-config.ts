import type { TenantConfig, TenantTheme } from "./types";
import { moduleExperiences } from "./module-experience";

export const TENANT_KEY = process.env.NEXT_PUBLIC_TENANT_KEY ?? "";
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(
  /\/$/,
  "",
);
export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !API_URL;

const defaultModules = [
  "website_pages",
  "media_library",
  "user_management",
  "settings",
];
const demoModules = Object.keys(moduleExperiences);

function parseEnabledModules(fallback = defaultModules) {
  try {
    const parsed = JSON.parse(process.env.NEXT_PUBLIC_ENABLED_MODULES ?? "[]");
    return Array.isArray(parsed) &&
      parsed.every((value) => typeof value === "string") &&
      parsed.length > 0
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

export const neutralTheme: Required<TenantTheme> = {
  brand_name: "Content Studio",
  logo_url: "",
  favicon_url: "",
  primary_color: "#2563eb",
  secondary_color: "#0f172a",
  accent_color: "#f59e0b",
  background_color: "#f5f6f8",
  surface_color: "#ffffff",
  text_color: "#171717",
  muted_text_color: "#666666",
  font_family: "Geist",
  heading_font_family: "Geist",
  border_radius: "0.75rem",
  sidebar_position: "left",
  sidebar_style: "solid",
  login_background_url: "",
  support_url: "",
};

function isColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (/^#[0-9a-f]{3,8}$/i.test(value) || /^rgb(a)?\([\d\s,.%]+\)$/i.test(value))
  );
}

function isUrl(value: unknown): value is string {
  if (value === "") return true;
  if (typeof value !== "string") return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isFontFamily(value: unknown): value is string {
  return typeof value === "string" && /^[\w\s,-]{1,100}$/.test(value);
}

function parseFallback(): TenantTheme {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_ADMIN_THEME ?? "{}");
  } catch {
    return {};
  }
}

export function normalizeTheme(theme?: TenantTheme): TenantTheme {
  const input = { ...parseFallback(), ...theme };
  const normalized: TenantTheme = { ...neutralTheme, ...input };
  for (const key of [
    "primary_color",
    "secondary_color",
    "accent_color",
    "background_color",
    "surface_color",
    "text_color",
    "muted_text_color",
  ] as const) {
    if (!isColor(normalized[key])) normalized[key] = neutralTheme[key];
  }
  for (const key of [
    "logo_url",
    "favicon_url",
    "login_background_url",
    "support_url",
  ] as const) {
    if (!isUrl(normalized[key])) normalized[key] = neutralTheme[key];
  }
  for (const key of ["font_family", "heading_font_family"] as const) {
    if (!isFontFamily(normalized[key])) normalized[key] = neutralTheme[key];
  }
  if (!/^[\d.]+(px|rem|em)$/.test(normalized.border_radius ?? ""))
    normalized.border_radius = neutralTheme.border_radius;
  if (!["left", "right"].includes(normalized.sidebar_position ?? ""))
    normalized.sidebar_position = "left";
  if (!["solid", "soft"].includes(normalized.sidebar_style ?? ""))
    normalized.sidebar_style = "solid";
  return normalized;
}

export function applyTheme(theme: TenantTheme) {
  const root = document.documentElement;
  const values: Record<string, string | undefined> = {
    "--brand": theme.primary_color,
    "--secondary": theme.secondary_color,
    "--accent": theme.accent_color,
    "--background": theme.background_color,
    "--surface": theme.surface_color,
    "--foreground": theme.text_color,
    "--muted-foreground": theme.muted_text_color,
    "--radius": theme.border_radius,
    "--font-body": theme.font_family,
    "--font-heading": theme.heading_font_family,
  };
  for (const [key, value] of Object.entries(values))
    if (value) root.style.setProperty(key, value);
  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.href = theme.favicon_url || "/favicon.svg";
  document.title = theme.brand_name || "Content Studio";
}

export async function fetchTenantConfig(): Promise<TenantConfig> {
  if (DEMO_MODE || !API_URL || !TENANT_KEY)
    return {
      tenant_key: TENANT_KEY || "demo",
      name: "Bilzing Nepal",
      module_preset:
        process.env.NEXT_PUBLIC_MODULE_PRESET ?? "general_business",
      enabled_modules: parseEnabledModules(demoModules),
      admin_theme: normalizeTheme({
        brand_name: "Bilzing Content Studio",
        primary_color: "#171717",
        accent_color: "#d4ff00",
      }),
    };
  const response = await fetch(`${API_URL}/api/v1/tenant-config/`, {
    headers: { "X-Tenant-Key": TENANT_KEY },
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("We couldn’t load this workspace’s settings.");
  const config = (await response.json()) as TenantConfig;
  if (config.tenant_key !== TENANT_KEY)
    throw new Error("Tenant configuration mismatch.");
  return { ...config, admin_theme: normalizeTheme(config.admin_theme) };
}
