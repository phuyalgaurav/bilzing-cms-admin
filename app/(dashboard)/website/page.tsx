"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { HeroEditor } from "@/components/website/hero-editor";
import { VisitorPagesEditor, type SiteFeature } from "@/components/website/visitor-pages-editor";
import { ThemeEditor } from "@/components/website/theme-editor";

type Json = Record<string, unknown>;
type Domain = { id:number; hostname:string; kind:string; is_primary:boolean; is_verified:boolean; required_dns?:{type:string;name:string;value:string}|null };
type Builder = { site_layout:Json; site_seo:Json; site_footer:Json; site_hero:Json; site_theme:Json; site_access:string; has_site_password:boolean; manifest_version:number; domains:Domain[]; site_features?:SiteFeature[] };
const fieldClass = "mt-2 min-h-10 w-full rounded-md border bg-background px-3 text-sm";
const pretty = (value: object) => JSON.stringify(value, null, 2);

export default function WebsitePage() {
  const [data, setData] = useState<Builder | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [domain, setDomain] = useState("");
  const load = () => apiFetch<Builder>("/api/v1/admin/site-builder/").then(setData);
  useEffect(() => { void load().catch(showError); }, []);
  function showError(cause: unknown) { setError(cause instanceof Error ? cause.message : "The website settings request failed."); }
  function setObject(key: "site_seo"|"site_footer", field:string, value:string) { setData((current) => current ? {...current, [key]: {...current[key], [field]:value}} : current); }
  async function saveDraft() { if (!data) return null; setSaving(true); setError(""); try { const body = {...data, ...(password ? {site_password:password}:{})}; const next = await apiFetch<Builder>("/api/v1/admin/site-builder/", {method:"PATCH", body:JSON.stringify(body)}); setData(next); setPassword(""); return next; } catch (cause) { showError(cause); return null; } finally { setSaving(false); } }
  async function action(name:"preview"|"publish") { if (!await saveDraft()) return; try { const result = await apiFetch<Builder & {preview_url?:string}>("/api/v1/admin/site-builder/", {method:"POST", body:JSON.stringify({action:name})}); if (result.preview_url) window.open(result.preview_url, "_blank", "noopener,noreferrer"); else setData(result); } catch (cause) { showError(cause); } }
  function updateJson(key:"site_layout"|"site_hero", raw:string) { try { setData((current) => current ? {...current,[key]:JSON.parse(raw)}:current); setError(""); } catch { setError(`${key.replaceAll("_"," ")} must contain valid JSON.`); } }
  async function addDomain() { try { await apiFetch("/api/v1/admin/site-domains/", {method:"POST",body:JSON.stringify({hostname:domain})}); setDomain(""); await load(); } catch (cause) { showError(cause); } }
  async function removeDomain(id:number) { try { await apiFetch(`/api/v1/admin/site-domains/${id}/`, {method:"DELETE"}); await load(); } catch (cause) { showError(cause); } }
  if (!data) return <p className="text-sm text-muted-foreground">{error || "Loading website settings…"}</p>;
  const publicDomains = data.domains.filter((item) => item.is_verified && item.kind !== "admin");
  const publicDomain = publicDomains.find((item) => item.kind === "custom" && item.is_primary)?.hostname
    ?? publicDomains.find((item) => item.kind === "custom")?.hostname
    ?? publicDomains.find((item) => item.kind === "demo" && item.is_primary)?.hostname
    ?? publicDomains.find((item) => item.kind === "demo")?.hostname;
  const publicBaseUrl = publicDomain ? `${publicDomain.endsWith("localhost") ? "http" : "https"}://${publicDomain}${publicDomain.endsWith("localhost") ? ":3000" : ""}` : undefined;
  return <><PageHeader title="Website" description="Edit a draft, preview it on the shared consumer, then publish deliberately." actions={<div className="flex gap-2"><Button variant="outline" onClick={() => void saveDraft()} disabled={saving}>Save draft</Button><Button variant="outline" onClick={() => void action("preview")} disabled={saving}>Preview</Button><Button onClick={() => void action("publish")} disabled={saving}>Publish</Button></div>} />
    {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
    <div className="mb-5"><VisitorPagesEditor features={data.site_features ?? []} layout={data.site_layout} publicBaseUrl={publicBaseUrl} onChange={(site_layout) => setData({...data,site_layout})} /></div>
    <HeroEditor hero={data.site_hero} layout={data.site_layout} onChange={(site_hero,site_layout)=>setData({...data,site_hero,site_layout})} />
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-lg border bg-card p-5"><h2 className="font-semibold">Search and sharing</h2><label className="mt-4 block text-sm">Default title<input className={fieldClass} value={String(data.site_seo.title??"")} onChange={(e)=>setObject("site_seo","title",e.target.value)} /></label><label className="mt-4 block text-sm">Description<textarea className={`${fieldClass} min-h-24 py-2`} value={String(data.site_seo.description??"")} onChange={(e)=>setObject("site_seo","description",e.target.value)} /></label><label className="mt-4 block text-sm">Robots<input className={fieldClass} value={String(data.site_seo.robots??"")} onChange={(e)=>setObject("site_seo","robots",e.target.value)} placeholder="index,follow" /></label></section>
      <section className="rounded-lg border bg-card p-5"><h2 className="font-semibold">Footer</h2><label className="mt-4 block text-sm">Footer text<textarea className={`${fieldClass} min-h-24 py-2`} value={String(data.site_footer.text??"")} onChange={(e)=>setObject("site_footer","text",e.target.value)} /></label></section>
      <section className="rounded-lg border bg-card p-5"><h2 className="font-semibold">Visitor access</h2><select className={fieldClass} value={data.site_access} onChange={(e)=>setData({...data,site_access:e.target.value})}><option value="public">Public</option><option value="password_protected">Password protected</option><option value="authenticated">Authenticated</option><option value="invite_only">Invite only</option></select>{data.site_access==="password_protected"?<label className="mt-4 block text-sm">New password<input type="password" className={fieldClass} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder={data.has_site_password?"Password already set":"At least 8 characters"} /></label>:null}</section>
    </div>
    <div className="mt-5"><ThemeEditor theme={data.site_theme} onChange={(site_theme) => setData({ ...data, site_theme })} /></div>
    <section className="mt-5 rounded-lg border bg-card p-5"><h2 className="font-semibold">Domains</h2><div className="mt-3 flex gap-2"><input className={fieldClass} value={domain} onChange={(e)=>setDomain(e.target.value)} placeholder="www.customer-domain.com" /><Button variant="outline" onClick={()=>void addDomain()} disabled={!domain}>Add domain</Button></div><div className="mt-4 space-y-2">{data.domains.map((item)=><div key={item.id} className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm"><span>{item.hostname} · {item.kind} · {item.is_verified?"verified":"pending"}{item.required_dns?<small className="mt-1 block text-muted-foreground">DNS: {item.required_dns.type} {item.required_dns.name} → {item.required_dns.value}</small>:null}</span>{item.kind==="custom"?<Button variant="outline" onClick={()=>void removeDomain(item.id)}>Remove</Button>:null}</div>)}</div></section>
    <details className="mt-5 rounded-lg border bg-card p-5"><summary className="cursor-pointer font-semibold">Advanced composition</summary><p className="mt-2 text-sm text-muted-foreground">Ordered page sections for complex layouts. Invalid JSON is never saved.</p><label className="mt-4 block text-sm">Page layout<textarea key={pretty(data.site_layout)} className={`${fieldClass} min-h-80 p-3 font-mono text-xs`} defaultValue={pretty(data.site_layout)} onBlur={(e)=>updateJson("site_layout",e.target.value)} /></label></details>
    <p className="mt-4 text-xs text-muted-foreground">Published manifest version {data.manifest_version}.</p>
  </>;
}
