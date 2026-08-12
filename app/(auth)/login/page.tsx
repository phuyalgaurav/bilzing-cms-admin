"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { useAuth } from "@/components/providers/app-providers";

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const notice = reason === "session-expired"
    ? "Your session expired. Sign in again to continue."
    : reason === "session-unavailable"
      ? "We couldn’t verify your session because the server is unavailable. Try again in a moment."
      : undefined;
  return <AuthCard mode="login" notice={notice} onSubmit={({ email, password }) => login(email, password)} />;
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
