import { API_URL } from "./tenant-config";

/** Resolve Django/R2 media paths against the browser-facing API origin. */
export function resolveMediaUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const source = value.trim();
  if (!source) return "";
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  if (source.startsWith("//")) return `https:${source}`;
  if (!API_URL) return source;

  try {
    return new URL(source, `${API_URL}/`).toString();
  } catch {
    return source;
  }
}
