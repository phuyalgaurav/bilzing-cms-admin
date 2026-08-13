"use client";

import Link from "next/link";
import {
  ChevronRight,
  FileText,
  ImageIcon,
  LayoutTemplate,
  Newspaper,
  Settings2,
  UsersRound,
} from "lucide-react";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, useTenant } from "@/components/providers/app-providers";
import { moduleExperience, modulePrimaryPath } from "@/lib/module-experience";

const websiteTools = [
  {
    href: "/pages",
    title: "Pages",
    description: "Create and update the pages visitors see on your website.",
    icon: FileText,
  },
  {
    href: "/navigation",
    title: "Menus",
    description: "Choose the links that appear in your header and footer.",
    icon: LayoutTemplate,
  },
  {
    href: "/media",
    title: "Media library",
    description: "Upload and manage images and files used across your site.",
    icon: ImageIcon,
  },
  {
    href: "/posts",
    title: "Blog posts",
    description: "Write and publish news, updates, and articles.",
    icon: Newspaper,
    requiredModule: "blog",
  },
];

const setupModules = [
  "seo_management",
  "analytics",
  "notifications",
  "document_management",
  "gallery",
  "faq",
] as const;

export default function SettingsPage() {
  const { config } = useTenant();
  const { role } = useAuth();
  const tools = websiteTools.filter(
    (tool) =>
      !tool.requiredModule || config.enabled_modules.includes(tool.requiredModule),
  );
  const advancedTools = setupModules
    .filter((moduleKey) => config.enabled_modules.includes(moduleKey))
    .map((moduleKey) => ({
      moduleKey,
      experience: moduleExperience(moduleKey),
      href: modulePrimaryPath(moduleKey),
    }));

  return (
    <>
      <PageHeading
        title="Settings"
        description="Set up your workspace and website. Day-to-day business tools stay in the main menu."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Website & content</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage the parts of your website that are usually changed less often.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {tools.map(({ href, title, description, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-card text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-medium">{title}</h2>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="size-4 text-muted-foreground" />
              <CardTitle>Workspace</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/modules/settings/business-profile"
              className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Business details <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            {role === "super_admin" ? (
              <>
                <Link
                  href="/team-access"
                  className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <UsersRound className="size-4 text-muted-foreground" />
                    Team access
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {advancedTools.length ? (
        <Card className="mt-5">
          <CardHeader className="border-b pb-4">
            <CardTitle>Advanced setup</CardTitle>
            <p className="text-sm text-muted-foreground">
              Optional configuration tools for your website and workspace.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {advancedTools.map(({ moduleKey, experience, href }) => {
              const Icon = experience.icon;
              return (
                <Link
                  key={moduleKey}
                  href={href}
                  className="group flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{experience.label}</span>
                    <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                      {experience.description}
                    </span>
                  </span>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
