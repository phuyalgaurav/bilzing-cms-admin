"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { useAuth } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { HeroEditor } from "@/components/website/hero-editor";
import { apiFetch } from "@/lib/api-client";

type Renderer = { site_hero: Record<string, unknown>; manifest_version: number };
const endpoint = "/api/v1/admin/react-renderer/";

export default function WebsitePage() {
  const { ready, isDeveloper } = useAuth();
  const [data, setData] = useState<Renderer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try { setData(await apiFetch<Renderer>(endpoint)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load the React source."); }
  }, []);

  useEffect(() => { if (ready && isDeveloper) void load(); }, [ready, isDeveloper, load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(publish = false) {
    if (!data || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      let next = await apiFetch<Renderer>(endpoint, {
        method: "PATCH", body: JSON.stringify({ site_hero: data.site_hero }),
      });
      if (publish) next = await apiFetch<Renderer>(endpoint, {
        method: "POST", body: JSON.stringify({ action: "publish" }),
      });
      setData(next); setDirty(false);
      setMessage(publish ? "React source published." : "Draft saved. The live site is unchanged.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the React source.");
    } finally { setBusy(false); }
  }

  if (!ready) return <p role="status">Checking developer access…</p>;
  if (!isDeveloper) return <PageHeader title="Developer access required" description="The React renderer is an internal platform tool, not a tenant feature." />;

  return <>
    <PageHeader title="React renderer" description="Internal developer workspace. Edit React, run it below, then publish when ready." actions={
      <div className="flex gap-2">
        <Button variant="outline" disabled={!data || busy} onClick={() => void save()}>Save draft</Button>
        <Button disabled={!data || busy} onClick={() => void save(true)}>{busy ? "Saving…" : "Publish React"}</Button>
      </div>
    } />
    {error && <div role="alert" className="mb-4 text-sm text-destructive"><p>{error}</p>{!data && <Button variant="outline" className="mt-3" onClick={() => void load()}>Retry loading source</Button>}</div>}
    {message && <p role="status" className="mb-4 text-sm text-muted-foreground">{message}</p>}
    {!data && !error && <p role="status">Loading React source…</p>}
    {data && <fieldset disabled={busy} className="min-w-0">
      <HeroEditor hero={data.site_hero} onChange={(site_hero) => {
        setData({ ...data, site_hero }); setDirty(true); setMessage("");
      }} />
      <p className="mt-3 text-xs text-muted-foreground">{dirty ? "Unsaved changes · " : ""}Published version {data.manifest_version}</p>
    </fieldset>}
  </>;
}
