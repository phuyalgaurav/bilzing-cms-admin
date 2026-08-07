import type { Role } from "./types";

export interface Session { access: string; role: Role; email?: string }

export function decodeToken(token: string): { role?: Role; email?: string; tenant_key?: string } {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return {}; }
}

export const roleLabel: Record<Role, string> = { viewer: "Viewer", editor: "Editor", super_admin: "Super admin" };
export const canEdit = (role?: Role) => role === "editor" || role === "super_admin";
export const canDelete = (role?: Role) => role === "super_admin";
