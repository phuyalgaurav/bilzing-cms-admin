"use client";
import { AuthCard } from "@/components/auth/auth-card";
import { useAuth } from "@/components/providers/app-providers";
export default function LoginPage() { const { login } = useAuth(); return <AuthCard mode="login" onSubmit={({ email, password }) => login(email, password)} />; }
