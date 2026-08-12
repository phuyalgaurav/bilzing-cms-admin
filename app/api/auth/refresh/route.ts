import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiUrl, tenantKey, demoMode } from "../_shared";

export async function POST() {
  try {
    const refresh = (await cookies()).get("cms_refresh")?.value;
    if (demoMode && refresh === "demo-refresh-token")
      return NextResponse.json({
        access: "demo-access-token",
        role: "super_admin",
      });
    if (!refresh) {
      const result = NextResponse.json(
        { detail: "No active session." },
        { status: 401 },
      );
      result.cookies.delete("cms_refresh");
      return result;
    }
    if (!apiUrl || !tenantKey)
      return NextResponse.json(
        { detail: "CMS API configuration is missing." },
        { status: 503 },
      );
    const response = await fetch(`${apiUrl}/api/v1/auth/token/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Key": tenantKey,
      },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({ detail: "Authentication request failed." }));
    if (!response.ok) {
      if (![400, 401, 403].includes(response.status)) {
        const result = NextResponse.json(data, { status: response.status });
        ["Retry-After", "X-RateLimit-Scope", "X-RateLimit-Limit"].forEach((header) => {
          const value = response.headers.get(header);
          if (value) result.headers.set(header, value);
        });
        return result;
      }
      const result = NextResponse.json(
        { detail: "Session expired." },
        { status: 401 },
      );
      result.cookies.delete("cms_refresh");
      return result;
    }
    if (!data.access)
      return NextResponse.json(
        { detail: "The authentication service returned an invalid session." },
        { status: 502 },
      );
    if (data.tenant_key && data.tenant_key !== tenantKey) {
      const result = NextResponse.json({ detail: "Session expired." }, { status: 401 });
      result.cookies.delete("cms_refresh");
      return result;
    }
    const result = NextResponse.json({ access: data.access, role: data.role });
    if (data.refresh)
      result.cookies.set("cms_refresh", data.refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    return result;
  } catch {
    return NextResponse.json(
      { detail: "Could not reach the authentication service." },
      { status: 502 },
    );
  }
}
