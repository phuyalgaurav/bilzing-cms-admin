"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { useAuth } from "@/components/providers/app-providers";
function InviteForm() { const token = useSearchParams().get("token") ?? ""; const { acceptInvite } = useAuth(); return <AuthCard mode="invite" onSubmit={({ password }) => { if (!token) throw new Error("This invitation link is incomplete."); return acceptInvite(token, password); }} />; }
export default function InvitePage() { return <Suspense fallback={<main className="grid min-h-screen place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></main>}><InviteForm /></Suspense>; }
