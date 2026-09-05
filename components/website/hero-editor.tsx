"use client";
import { useEffect, useRef } from "react";
import { buildHeroDocument, HERO_RUNTIME_GUIDE, HERO_STARTER_SOURCE } from "@/lib/hero-sandbox";

type Json = Record<string, unknown>;
type Props = { hero: Json; layout: Json; onChange: (hero: Json, layout: Json) => void };

export function HeroEditor({ hero, layout, onChange }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const source = typeof hero.source === "string" ? hero.source : HERO_STARTER_SOURCE;
  const height = typeof hero.height === "number" ? hero.height : 520;
  useEffect(() => {
    function bridge(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || !event.data?.id) return;
      if (event.data.method === "bilzing.site.get") frame.current.contentWindow?.postMessage({id:event.data.id,result:{site:{name:"Draft preview"},hero:{cta_label:typeof hero.cta_label === "string" ? hero.cta_label : "",cta_href:typeof hero.cta_href === "string" ? hero.cta_href : ""}}},"*");
      if (event.data.method === "bilzing.cta.get") frame.current.contentWindow?.postMessage({id:event.data.id,result:{label:typeof hero.cta_label === "string" ? hero.cta_label : "",href:typeof hero.cta_href === "string" ? hero.cta_href : ""}},"*");
      if (event.data.method === "bilzing.cta.activate") frame.current.contentWindow?.postMessage({id:event.data.id,result:{preview:true,href:hero.cta_href}},"*");
      if (event.data.method === "bilzing.navigation.go") frame.current.contentWindow?.postMessage({id:event.data.id,result:{preview:true,href:event.data.params?.href}},"*");
      if (event.data.method === "bilzing.analytics.track") frame.current.contentWindow?.postMessage({id:event.data.id,result:{tracked:true,preview:true}},"*");
      if (event.data.method === "bilzing.frame.resize") frame.current.contentWindow?.postMessage({id:event.data.id,result:{height:event.data.params?.height,preview:true}},"*");
    }
    window.addEventListener("message", bridge); return () => window.removeEventListener("message", bridge);
  }, [hero]);
  function update(nextSource:string, nextHeight=height) {
    const nextHero = {...hero,mode:"custom",source:nextSource,height:nextHeight,sdk_version:"1"};
    const pages = layout.pages && typeof layout.pages === "object" ? layout.pages as Json : {};
    const home = pages["/"] && typeof pages["/"] === "object" ? pages["/"] as Json : {};
    const sections = Array.isArray(home.sections) ? home.sections.filter((item):item is Json=>Boolean(item)&&typeof item==="object") : [];
    const index = sections.findIndex((item)=>item.type==="hero"||item.type==="custom_hero");
    const section = {id:String(sections[index]?.id??"hero"),type:"custom_hero"};
    const nextSections = index >= 0 ? sections.map((item,position)=>position===index?section:item) : [section,...sections];
    onChange(nextHero,{...layout,pages:{...pages,"/":{...home,sections:nextSections}}});
  }
  return <section className="mb-5 rounded-lg border bg-card p-5"><div><h2 className="font-semibold">React hero runtime</h2><p className="mt-1 text-sm text-muted-foreground">Write executable React and JSX. This is compiled and mounted as a React root in an isolated frame, not rendered as static HTML. It can use approved packages while network requests, nested frames, forms and parent-page access remain blocked.</p></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><div><div className="mb-2 flex items-center justify-between"><label htmlFor="hero-source" className="text-sm font-medium">React source</label><button type="button" className="text-xs text-muted-foreground underline" onClick={()=>update(HERO_STARTER_SOURCE)}>Restore starter</button></div><textarea id="hero-source" className="min-h-[560px] w-full rounded-md border bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100" spellCheck={false} value={source} onChange={(event)=>update(event.target.value)} /><label className="mt-3 block text-sm">Frame height<input className="ml-3 w-24 rounded-md border bg-background px-2 py-1" type="number" min={320} max={900} value={height} onChange={(event)=>update(source,Number(event.target.value))} /> px</label></div><div><p className="mb-2 text-sm font-medium">Live React output</p><iframe ref={frame} title="Hero code preview" className="w-full rounded-md border bg-white" style={{height}} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={buildHeroDocument(source)} /></div></div><details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">React runtime and Bilzing SDK</summary><pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{HERO_RUNTIME_GUIDE}{"\n\n"}{`await bilzing.site.get()\nawait bilzing.navigation.go("/contact")\nawait bilzing.analytics.track("hero_action", { placement: "primary" })\nawait bilzing.frame.resize(640)`}</pre></details></section>;
}
