import type { Role } from "./types";

export interface Session { access: string; role: Role; email?: string }

export function decodeToken(token: string): { role?: Role; email?: string; tenant_key?: string } {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return {}; }
}

export const roleLabel: Record<Role, string> = {
  viewer: "Viewer",
  editor: "Editor",
  staff: "Staff",
  support: "Support",
  sales: "Sales",
  accountant: "Accountant",
  manager: "Manager",
  administrator: "Administrator",
  super_admin: "Super admin",
};
export const canEdit = (role?: Role) => role !== undefined && role !== "viewer";
export const canDelete = (role?: Role) =>
  role === "manager" || role === "administrator" || role === "super_admin";
