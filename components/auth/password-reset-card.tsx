"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTenant } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorMessage } from "@/lib/api-client";

type PasswordResetFields = {
  email: string;
  password: string;
  confirmation: string;
};

export function PasswordResetCard({
  token,
  resetLink = false,
}: {
  token?: string;
  resetLink?: boolean;
}) {
  const { config } = useTenant();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const confirming = resetLink;
  const invalidLink = resetLink && !token;
  const schema = useMemo(() => z.object({
    email: confirming ? z.string() : z.string().trim().email("Enter a valid email address."),
    password: confirming ? z.string().min(8, "Use at least 8 characters.") : z.string(),
    confirmation: z.string(),
  }).superRefine((values, context) => {
    if (confirming && values.password !== values.confirmation) {
      context.addIssue({ code: "custom", path: ["confirmation"], message: "The passwords do not match." });
    }
  }), [confirming]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordResetFields>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmation: "" },
  });

  async function submit(values: PasswordResetFields) {
    setError("");
    try {
      const response = await fetch(
        confirming ? "/api/auth/reset-password" : "/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(confirming ? { token, password: values.password } : { email: values.email }),
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
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="auth-stage w-full max-w-md rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-7 grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
          <LockKeyhole className="size-5" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">
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
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
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
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mr-2 inline size-4" />
            {message}
            <div className="mt-4">
              <Link href="/login" className="font-semibold hover:underline">
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={handleSubmit(submit)} noValidate>
            {confirming ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.password)}
                    {...register("password")}
                  />
                  {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.confirmation)}
                    {...register("confirmation")}
                  />
                  {errors.confirmation ? <p className="text-xs text-destructive">{errors.confirmation.message}</p> : null}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            <Button className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
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
