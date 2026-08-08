"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/api-client";
import {
  applyTheme,
  fetchTenantConfig,
  normalizeTheme,
} from "@/lib/tenant-config";
import type { Role, TenantConfig } from "@/lib/types";

interface AuthContextValue {
  ready: boolean;
  access: string | null;
  role?: Role;
  login(email: string, password: string): Promise<void>;
  acceptInvite(token: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

interface TenantContextValue {
  config: TenantConfig;
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TenantContext = createContext<TenantContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<string | null>(null);
  const [role, setRole] = useState<Role>();
  const [config, setConfig] = useState<TenantConfig>({
    tenant_key: "",
    name: "Workspace",
    module_preset: "general_business",
    enabled_modules: [
      "website_pages",
      "media_library",
      "user_management",
      "settings",
    ],
    admin_theme: normalizeTheme(),
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const setSession = useCallback((data: { access: string; role?: Role }) => {
    setAccess(data.access);
    setAccessToken(data.access);
    setRole(data.role);
  }, []);
  const refreshConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const next = await fetchTenantConfig();
      setConfig(next);
      applyTheme(next.admin_theme);
      setConfigError(null);
    } catch (error) {
      setConfigError(
        error instanceof Error
          ? error.message
          : "Couldn’t load workspace settings.",
      );
      applyTheme(config.admin_theme);
    } finally {
      setLoadingConfig(false);
    }
  }, [config.admin_theme]);

  useEffect(() => {
    refreshConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch("/api/auth/refresh", { method: "POST" })
      .then(async (r) => {
        if (r.ok) setSession(await r.json());
      })
      .finally(() => setReady(true));
  }, [setSession]);
  useEffect(() => {
    if (!access) return;
    let active = true;
    async function revalidateMembership() {
      const response = await fetch("/api/auth/refresh", { method: "POST" });
      if (!active) return;
      if (response.ok) {
        setSession(await response.json());
        return;
      }
      setAccess(null);
      setAccessToken(null);
      setRole(undefined);
      router.replace("/login");
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void revalidateMembership();
    };
    window.addEventListener("focus", revalidateMembership);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.removeEventListener("focus", revalidateMembership);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [access, router, setSession]);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail ?? "Email or password is incorrect.");
    setSession(data);
    router.replace("/dashboard");
  };
  const acceptInvite = async (token: string, password: string) => {
    const response = await fetch("/api/auth/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.detail ?? "The invitation could not be accepted.");
    setSession(data);
    router.replace("/dashboard");
  };
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession({ access: "", role: undefined });
    setAccess(null);
    setAccessToken(null);
    if (pathname !== "/login") router.replace("/login");
  };

  const auth = { ready, access, role, login, acceptInvite, logout };
  const tenant = {
    config,
    loading: loadingConfig,
    error: configError,
    refresh: refreshConfig,
  };
  return (
    <TenantContext.Provider value={tenant}>
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </TenantContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AppProviders");
  return value;
}
export function useTenant() {
  const value = useContext(TenantContext);
  if (!value) throw new Error("useTenant must be inside AppProviders");
  return value;
}
