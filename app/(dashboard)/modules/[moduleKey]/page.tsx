"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { modulePrimaryPath } from "@/lib/module-experience";

const dedicatedModuleRoutes: Record<string, string> = {
  website_pages: "/pages",
  media_library: "/media",
  user_management: "/members",
  blog: "/posts",
};

export default function ModulePage({
  params,
}: {
  params: Promise<{ moduleKey: string }>;
}) {
  const router = useRouter();

  useEffect(() => {
    params.then(({ moduleKey }) =>
      router.replace(dedicatedModuleRoutes[moduleKey] ?? modulePrimaryPath(moduleKey)),
    );
  }, [params, router]);

  return (
    <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
      <LoaderCircle className="mr-2 size-4 animate-spin" /> Opening workspace…
    </div>
  );
}
