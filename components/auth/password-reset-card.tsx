"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { useTenant } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api-client";

export function PasswordResetCard({
  token,
  resetLink = false,
}: {
  token?: string;
  resetLink?: boolean;
}) {
  const { config } = useTenant();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const confirming = resetLink;
  const invalidLink = resetLink && !token;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (confirming && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(
        confirming ? "/api/auth/reset-password" : "/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(confirming ? { token, password } : { email }),
        },
      );
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(data, response.status, response.headers.get("Retry-After")),
        );
      }
      setMessage(String(data.detail ?? "The request was completed."));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The request could not be completed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="subtle-grid grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-[0_24px_80px_rgb(0_0_0/0.08)] sm:p-9">
        <div className="mb-7 grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
          <LockKeyhole className="size-5" />
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {config.name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          {confirming ? "Choose a new password" : "Reset your password"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {confirming
            ? "Use a strong password you have not used before."
            : "We will email a reset link if this address belongs to an active member."}
        </p>
        {invalidLink ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            This password reset link is incomplete.
            <div className="mt-4">
              <Link
                href="/forgot-password"
                className="font-semibold hover:underline"
              >
                Request a new link
              </Link>
            </div>
          </div>
        ) : message ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mr-2 inline size-4" />
            {message}
            <div className="mt-4">
              <Link href="/login" className="font-semibold hover:underline">
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={submit}>
            {confirming ? (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    New password
                  </span>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Confirm password
                  </span>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    required
                  />
                </label>
              </>
            ) : (
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Email address
                </span>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            <Button className="w-full" size="lg" disabled={pending}>
              {pending && <LoaderCircle className="size-4 animate-spin" />}
              {confirming ? "Update password" : "Send reset link"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <Link href="/login" className="font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
