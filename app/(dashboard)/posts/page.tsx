"use client";

import { Newspaper } from "lucide-react";
import { ContentManager } from "@/components/content-editor/content-manager";
import { useTenant } from "@/components/providers/app-providers";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function PostsPage() {
  const { config, loading } = useTenant();
  if (loading) return <div className="h-72 animate-pulse rounded-xl border bg-card" />;
  if (!config.enabled_modules.includes("blog")) return <Card><EmptyState icon={Newspaper} title="Blog is not enabled" description="This tenant was created without the Blog module." /></Card>;
  return <ContentManager type="posts" />;
}
