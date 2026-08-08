"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { getAdminModuleDirectory, getAdminModuleRecords, saveAdminModuleRecord } from "@/lib/module-api";
import type { ModuleRecord } from "@/lib/types";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { slugify } from "@/lib/utils";

function label(value: string) { return value.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()); }

export default function ModuleResourcePage({ params }: { params: Promise<{ moduleKey: string; resourceKey: string }> }) {
  const [keys, setKeys] = useState<{ moduleKey: string; resourceKey: string }>();
  const [items, setItems] = useState<ModuleRecord[]>([]); const [error, setError] = useState<string>(); const [creating, setCreating] = useState(false); const [title, setTitle] = useState(""); const [data, setData] = useState("{}"); const [saving, setSaving] = useState(false);
  useEffect(() => { params.then(setKeys); }, [params]);
  async function load() {
    if (!keys) return;
    setError(undefined);
    try {
      const directory = await getAdminModuleDirectory(); const contract = directory.find(item => item.key === keys.moduleKey);
      if (!contract?.resources.some(resource => resource.key === keys.resourceKey)) throw new Error("This resource is not enabled for the current tenant.");
      const response = await getAdminModuleRecords(keys.moduleKey, keys.resourceKey); setItems(Array.isArray(response) ? response : response.results);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This resource could not be loaded."); }
  }
  useEffect(() => { load(); }, [keys]); // eslint-disable-line react-hooks/exhaustive-deps
  async function create(event: React.FormEvent) {
    event.preventDefault(); if (!keys) return;
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(data) as Record<string, unknown>; } catch { setError("Extra data must be valid JSON."); return; }
    setSaving(true); setError(undefined);
    try { const saved = await saveAdminModuleRecord(keys.moduleKey, keys.resourceKey, { title, slug: slugify(title), data: parsed, status: "draft", visibility: "private", sort_order: 0 }); setItems(current => [saved, ...current]); setCreating(false); setTitle(""); setData("{}"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The record could not be saved."); } finally { setSaving(false); }
  }
  const resourceName = keys ? label(keys.resourceKey) : "Module resource";
  return <><PageHeading eyebrow={keys ? label(keys.moduleKey) : "Modules"} title={resourceName} description="Manage records for this enabled tenant module." actions={<div className="flex gap-2"><Button variant="outline" onClick={load}><RefreshCw className="size-4" />Refresh</Button><Button onClick={() => setCreating(true)}><Plus className="size-4" />New record</Button></div>} />{error && <Card className="mb-4 border-destructive/30"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>}<Card><CardContent className="p-0"><div className="divide-y">{items.length ? items.map(item => <div key={item.id} className="flex items-center gap-4 p-4"><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.title || item.slug}</p><p className="truncate text-xs text-muted-foreground">/{item.slug}</p></div><span className="text-xs capitalize text-muted-foreground">{item.status}</span></div>) : <p className="p-5 text-sm text-muted-foreground">No {resourceName.toLowerCase()} yet.</p>}</div></CardContent></Card>{creating && <Card className="mt-5"><CardContent className="p-5"><form onSubmit={create} className="space-y-4"><label className="block text-sm font-medium">Title<Input className="mt-2" value={title} onChange={event => setTitle(event.target.value)} required /></label><label className="block text-sm font-medium">Extra data (JSON)<Textarea className="mt-2 min-h-28 font-mono text-xs" value={data} onChange={event => setData(event.target.value)} /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <LoaderCircle className="size-4 animate-spin" />}Create draft</Button></div></form></CardContent></Card>}</>;
}
