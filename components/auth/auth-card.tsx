"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/components/providers/app-providers";
import { DEMO_MODE } from "@/lib/tenant-config";
import { resolveMediaUrl } from "@/lib/media-url";

type Credentials = { email: string; password: string };
const loginSchema = z.object({ email: z.email("Enter a valid email address."), password: z.string().min(1, "Enter your password.") });
const inviteSchema = z.object({ email: z.string(), password: z.string().min(8, "Use at least 8 characters.") });

export function AuthCard({
  mode,
  onSubmit,
  notice,
}: {
  mode: "login" | "invite";
  onSubmit(values: Credentials): Promise<void>;
  notice?: string;
}) {
  const { config } = useTenant();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const invite = mode === "invite";
  const form = useForm<Credentials>({ resolver: zodResolver(invite ? inviteSchema : loginSchema), defaultValues: { email: "", password: "" } });

  async function authenticate(credentials: Credentials) {
    setError("");
    try {
      await onSubmit(credentials);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong.",
      );
    }
  }

  async function enterDemo() {
    const credentials = { email: "admin@bilzing.test", password: "demo1234" };
    form.reset(credentials);
    await authenticate(credentials);
  }

  return (
    <main
      className="grid min-h-screen place-items-center bg-cover bg-center px-5 py-10"
      style={
        resolveMediaUrl(config.admin_theme.login_background_url)
          ? {
              backgroundImage: `url("${resolveMediaUrl(config.admin_theme.login_background_url)}")`,
            }
          : undefined
      }
    >
      <section className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="relative grid size-10 place-items-center overflow-hidden rounded-md bg-primary text-primary-foreground">
            {config.admin_theme.logo_url ? (
              <Image
                src={resolveMediaUrl(config.admin_theme.logo_url)}
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
            <p className="text-xs font-medium text-muted-foreground">
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

        {notice ? (
          <div role="status" className="mt-5 flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        {DEMO_MODE && !invite && (
          <div className="mt-6 rounded-md border border-primary/15 bg-primary/5 p-4">
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
                disabled={form.formState.isSubmitting}
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

        <form className="mt-7 space-y-5" onSubmit={form.handleSubmit(authenticate)}>
          {!invite && (
            <div>
              <Label htmlFor="auth-email">Email address</Label>
              <Input
                id="auth-email"
                className="mt-1.5"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...form.register("email")}
              />
              {form.formState.errors.email ? <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p> : null}
            </div>
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
                {...form.register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShow((value) => !value)}
                className="absolute right-0.5 top-0.5 size-8"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </span>
            {form.formState.errors.password ? <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p> : null}
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <Button className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
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
