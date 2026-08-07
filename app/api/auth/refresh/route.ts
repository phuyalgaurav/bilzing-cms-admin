import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiUrl, tenantKey, demoMode } from "../_shared";

export async function POST() {
  const refresh = (await cookies()).get("cms_refresh")?.value;
  if (demoMode && refresh === "demo-refresh-token") return NextResponse.json({ access: "demo-access-token", role: "super_admin" });
  if (!refresh || !apiUrl || !tenantKey) return NextResponse.json({ detail: "No active session." }, { status: 401 });
  const response = await fetch(`${apiUrl}/api/v1/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Tenant-Key": tenantKey },
    body: JSON.stringify({ refresh }),
    cache: "no-store",
  });
  if (!response.ok) {
    const result = NextResponse.json({ detail: "Session expired." }, { status: 401 });
    result.cookies.delete("cms_refresh");
    return result;
  }
  return NextResponse.json(await response.json());
}
