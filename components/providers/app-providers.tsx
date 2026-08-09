"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage, setAccessToken } from "@/lib/api-client";
import {
  applyTheme,
  fetchTenantConfig,
  normalizeTheme,
} from "@/lib/tenant-config";
import type { Role, TenantConfig, TenantTheme } from "@/lib/types";

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

interface SessionResponse {
  access: string;
  role?: Role;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TenantContext = createContext<TenantContextValue | null>(null);

const initialConfig: TenantConfig = {
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
};

function TenantProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(initialConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentTheme = useRef<TenantTheme>(initialConfig.admin_theme);
  const bootstrapStarted = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchTenantConfig();
      currentTheme.current = next.admin_theme;
      setConfig(next);
      applyTheme(next.admin_theme);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Couldn’t load workspace settings.",
      );
      applyTheme(currentTheme.current);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;
    void refresh();
  }, [refresh]);

  const value = useMemo<TenantContextValue>(
    () => ({ config, loading, error, refresh }),
    [config, error, loading, refresh],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<string | null>(null);
  const [role, setRole] = useState<Role>();
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const lastRefreshAt = useRef(0);
  const bootstrapStarted = useRef(false);

  const clearSession = useCallback(() => {
    setAccess(null);
    setAccessToken(null);
    setRole(undefined);
  }, []);

  const setSession = useCallback((session: SessionResponse) => {
    setAccess((current) => (current === session.access ? current : session.access));
    setAccessToken(session.access);
    setRole((current) => (current === session.role ? current : session.role));
  }, []);

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;
    fetch("/api/auth/refresh", { method: "POST" })
      .then(async (response) => {
        if (response.ok) setSession(await response.json());
      })
      .catch(() => undefined)
      .finally(() => {
        lastRefreshAt.current = Date.now();
        setReady(true);
      });
  }, [setSession]);

  const revalidateSession = useCallback(() => {
    if (refreshInFlight.current) return refreshInFlight.current;
    if (Date.now() - lastRefreshAt.current < 15_000)
      return Promise.resolve();

    const request = (async () => {
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        lastRefreshAt.current = Date.now();
        if (response.ok) {
          setSession(await response.json());
          return;
        }
        clearSession();
        router.replace("/login");
      } catch {
        return;
      }
    })().finally(() => {
      refreshInFlight.current = null;
    });
    refreshInFlight.current = request;
    return request;
  }, [clearSession, router, setSession]);

  useEffect(() => {
    if (!access) return;
    const onFocus = () => void revalidateSession();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void revalidateSession();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [access, revalidateSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(apiErrorMessage(data, response.status, response.headers.get("Retry-After")));
      setSession(data);
      lastRefreshAt.current = Date.now();
      router.replace("/dashboard");
    },
    [router, setSession],
  );

  const acceptInvite = useCallback(
    async (token: string, password: string) => {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(apiErrorMessage(data, response.status, response.headers.get("Retry-After")));
      setSession(data);
      lastRefreshAt.current = Date.now();
      router.replace("/dashboard");
    },
    [router, setSession],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearSession();
    router.replace("/login");
  }, [clearSession, router]);

  const value = useMemo<AuthContextValue>(
    () => ({ ready, access, role, login, acceptInvite, logout }),
    [acceptInvite, access, login, logout, ready, role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <AuthProvider>{children}</AuthProvider>
    </TenantProvider>
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
