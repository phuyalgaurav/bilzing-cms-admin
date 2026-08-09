import { NextResponse } from "next/server";

const publicApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const apiUrl = (process.env.CMS_API_INTERNAL_URL ?? publicApiUrl).replace(
  /\/$/,
  "",
);
const tenantKey = process.env.NEXT_PUBLIC_TENANT_KEY ?? "";
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !publicApiUrl;

export async function forwardAuth(path: string, body: unknown) {
  if (demoMode) {
    const credentials = body as {
      email?: string;
      password?: string;
      token?: string;
    };
    if (path.includes("password-reset")) {
      return NextResponse.json({
        detail: path.includes("confirm")
          ? "Your password has been updated."
          : "If that account exists, a password reset email was sent.",
      });
    }
    const validLogin =
      path.includes("token/") &&
      credentials.email === "admin@bilzing.test" &&
      credentials.password === "demo1234";
    const validInvite =
      path.includes("invitations") &&
      Boolean(credentials.token) &&
      (credentials.password?.length ?? 0) >= 8;
    if (!validLogin && !validInvite)
      return NextResponse.json(
        {
          detail: validInvite
            ? "Invalid demo invitation."
            : "Use the demo email and password shown on the login page.",
        },
        { status: 401 },
      );
    const result = NextResponse.json({
      access: "demo-access-token",
      role: "super_admin",
    });
    result.cookies.set("cms_refresh", "demo-refresh-token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return result;
  }
  if (!apiUrl || !tenantKey)
    return NextResponse.json(
      { detail: "CMS API configuration is missing." },
      { status: 503 },
    );
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Key": tenantKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await response
      .json()
      .catch(() => ({ detail: "Authentication request failed." }));
    if (!response.ok) {
      const result = NextResponse.json(data, { status: response.status });
      ["Retry-After", "X-RateLimit-Scope", "X-RateLimit-Limit"].forEach((header) => {
        const value = response.headers.get(header);
        if (value) result.headers.set(header, value);
      });
      return result;
    }
    if (path.includes("password-reset")) return NextResponse.json(data);
    if (data.tenant_key && data.tenant_key !== tenantKey)
      return NextResponse.json({ detail: "Tenant mismatch." }, { status: 403 });
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
  } catch (error) {
    const detail =
      error instanceof Error
        ? `Could not reach the CMS backend: ${error.message}`
        : "Could not reach the CMS backend.";
    return NextResponse.json({ detail }, { status: 502 });
  }
}

export { apiUrl, tenantKey, demoMode };
