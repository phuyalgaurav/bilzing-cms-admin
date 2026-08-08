"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Boxes, ChevronRight, RefreshCw } from "lucide-react";
import { getAdminModuleDirectory } from "@/lib/module-api";
import type { ModuleContract } from "@/lib/types";
import { useTenant } from "@/components/providers/app-providers";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function label(value: string) { return value.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()); }

export default function ModulePage({ params }: { params: Promise<{ moduleKey: string }> }) {
  const [moduleKey, setModuleKey] = useState<string>();
  const [module, setModule] = useState<ModuleContract>();
  const [error, setError] = useState<string>();
  const { config } = useTenant();
  useEffect(() => { params.then(value => setModuleKey(value.moduleKey)); }, [params]);
  async function load() {
    if (!moduleKey) return;
    setError(undefined);
    try { setModule((await getAdminModuleDirectory()).find(item => item.key === moduleKey)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "This module could not be loaded."); }
  }
  useEffect(() => { load(); }, [moduleKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!moduleKey || !config.enabled_modules.includes(moduleKey)) return <PageHeading eyebrow="Modules" title="Module unavailable" description="This module is not enabled for the current tenant." />;
  const moduleName = module?.name ?? label(moduleKey);
  return <><PageHeading eyebrow="Enabled module" title={moduleName} description={module?.description ?? "Loading this tenant module."} actions={<Button variant="outline" onClick={load}><RefreshCw className="size-4" />Refresh</Button>} />{error ? <Card><CardContent className="p-5"><p className="font-medium">Couldn’t load {moduleName}</p><p className="mt-1 text-sm text-muted-foreground">{error}</p></CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{module?.resources.map(resource => <Link key={resource.key} href={`/modules/${moduleKey}/${resource.key}`}><Card className="h-full transition hover:border-primary/40"><CardHeader className="flex-row items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Boxes className="size-4" /></div><div><CardTitle>{label(resource.key)}</CardTitle><p className="mt-1 text-xs text-muted-foreground">Manage {label(resource.key).toLowerCase()}</p></div><ChevronRight className="ml-auto size-4 text-muted-foreground" /></CardHeader></Card></Link>)}</div>}</>;
}
