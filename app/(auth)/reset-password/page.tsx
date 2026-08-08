"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PasswordResetCard } from "@/components/auth/password-reset-card";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  return <PasswordResetCard token={token} resetLink />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
