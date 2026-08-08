"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/components/providers/app-providers";
import { DEMO_MODE } from "@/lib/tenant-config";

type Credentials = { email: string; password: string };

export function AuthCard({
  mode,
  onSubmit,
}: {
  mode: "login" | "invite";
  onSubmit(values: Credentials): Promise<void>;
}) {
  const { config } = useTenant();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const invite = mode === "invite";

  async function authenticate(credentials: Credentials) {
    setPending(true);
    setError("");
    try {
      await onSubmit(credentials);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong.",
      );
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await authenticate({ email, password });
  }

  async function enterDemo() {
    const credentials = { email: "admin@bilzing.test", password: "demo1234" };
    setEmail(credentials.email);
    setPassword(credentials.password);
    await authenticate(credentials);
  }

  return (
    <main
      className="subtle-grid grid min-h-screen place-items-center bg-cover bg-center px-5 py-10"
      style={
        config.admin_theme.login_background_url
          ? {
              backgroundImage: `linear-gradient(rgb(255 255 255 / 0.78), rgb(255 255 255 / 0.9)), url("${config.admin_theme.login_background_url}")`,
            }
          : undefined
      }
    >
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-[0_24px_80px_rgb(0_0_0/0.08)] sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="relative grid size-11 place-items-center overflow-hidden rounded-xl bg-primary text-primary-foreground">
            {config.admin_theme.logo_url ? (
              <Image
                src={config.admin_theme.logo_url}
                alt=""
                fill
                sizes="44px"
                unoptimized
                className="object-contain"
              />
            ) : (
              <LockKeyhole className="size-5" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {config.name}
            </p>
            <h1 className="font-semibold">{config.admin_theme.brand_name}</h1>
          </div>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">
          {invite ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {invite
            ? "Choose a secure password to accept your workspace invitation."
            : "Sign in to manage content for your website."}
        </p>

        {DEMO_MODE && !invite && (
          <div className="mt-6 rounded-xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Demo workspace</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Includes editable sample content.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={enterDemo}
                disabled={pending}
              >
                Enter demo
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-[72px_1fr] gap-y-1 border-t border-primary/10 pt-3 font-mono text-xs">
              <span className="text-muted-foreground">Email</span>
              <span>admin@bilzing.test</span>
              <span className="text-muted-foreground">Password</span>
              <span>demo1234</span>
            </div>
          </div>
        )}

        <form className="mt-7 space-y-5" onSubmit={submit}>
          {!invite && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Email address
              </span>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
              />
            </label>
          )}
          <label className="block">
            <span className="mb-2 flex items-center justify-between text-sm font-medium">
              {invite ? "Create password" : "Password"}
              {!invite && (
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </span>
            <span className="relative block">
              <Input
                className="pr-11"
                type={show ? "text" : "password"}
                autoComplete={invite ? "new-password" : "current-password"}
                minLength={invite ? 8 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                className="absolute right-1 top-1 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </span>
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <Button className="w-full" size="lg" disabled={pending}>
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <>
                {invite ? "Accept invitation" : "Sign in"}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access is limited to invited workspace members.
        </p>
      </section>
    </main>
  );
}
