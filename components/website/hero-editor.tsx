"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildHeroDocument, HERO_RUNTIME_GUIDE } from "@/lib/hero-sandbox";

type Json = Record<string, unknown>;
type Props = { hero: Json; onChange: (hero: Json) => void };

export function HeroEditor({ hero, onChange }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const source = typeof hero.source === "string" ? hero.source : "";
  const height = typeof hero.height === "number" ? hero.height : 520;
  const [runningSource, setRunningSource] = useState(source);
  const [revision, setRevision] = useState(0);
  const [width, setWidth] = useState("100%");
  const [outputHeight, setOutputHeight] = useState(height);
  const document = useMemo(() => buildHeroDocument(runningSource), [runningSource]);

  useEffect(() => {
    function bridge(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || typeof event.data?.id !== "string") return;
      const { id, method, params } = event.data;
      const cta = { label: hero.cta_label ?? "", href: hero.cta_href ?? "" };
      let result: unknown;
      switch (method) {
        case "bilzing.site.get": result = { site: { name: "Developer preview" }, hero }; break;
        case "bilzing.cta.get": result = cta; break;
        case "bilzing.cta.activate": result = { preview: true, href: cta.href }; break;
        case "bilzing.navigation.go": result = { preview: true, href: params?.href }; break;
        case "bilzing.analytics.track": result = { tracked: false, preview: true }; break;
        case "bilzing.frame.resize": {
          const next = Number(params?.height);
          if (!Number.isFinite(next)) return;
          const clamped = Math.min(900, Math.max(320, Math.round(next)));
          setOutputHeight(clamped); result = { height: clamped, preview: true }; break;
        }
        default: return;
      }
      frame.current?.contentWindow?.postMessage({ id, result }, "*");
    }
    window.addEventListener("message", bridge);
    return () => window.removeEventListener("message", bridge);
  }, [hero]);

  function update(nextSource: string, nextHeight = height) {
    onChange({ ...hero, mode: "custom", source: nextSource, height: nextHeight, sdk_version: "1" });
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label htmlFor="react-source" className="text-sm font-medium">React / JSX</label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">Height <input aria-label="Frame height in pixels" className="w-20 rounded-md border bg-background px-2 py-1" type="number" min={320} max={900} value={height} onChange={(event) => {
          const value = Math.min(900, Math.max(320, Math.round(Number(event.target.value) || 520)));
          update(source, value); setOutputHeight(value);
        }} /></label>
        <select aria-label="Preview viewport" className="rounded-md border bg-background px-2 py-1 text-sm" value={width} onChange={(event) => setWidth(event.target.value)}>
          <option value="100%">Desktop</option><option value="768px">Tablet</option><option value="390px">Mobile</option>
        </select>
        <Button variant="outline" onClick={() => { setRunningSource(source); setRevision((value) => value + 1); setOutputHeight(height); }}>Run React</Button>
      </div>
    </div>
    <textarea id="react-source" className="min-h-[360px] w-full resize-y rounded-md bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-offset-4" spellCheck={false} value={source} placeholder="Write React JSX and call render(<App />)." onChange={(event) => update(event.target.value)} />
    <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Rendered output</span><span>{source !== runningSource ? "Source changed — run to update" : "Isolated React runtime"}</span></div>
    <div className="overflow-x-auto">
      <iframe key={revision} ref={frame} title="React rendered output" className="mx-auto block border-0 bg-white" style={{ height: outputHeight, width, maxWidth: "100%" }} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={document} />
    </div>
    <details className="text-sm text-muted-foreground"><summary className="cursor-pointer">Runtime API</summary><p className="mt-2 max-w-4xl leading-6">{HERO_RUNTIME_GUIDE} The preview does not perform real navigation or send analytics. Source is isolated from admin credentials.</p></details>
  </section>;
}
