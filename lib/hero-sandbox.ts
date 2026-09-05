const sdk = String.raw`
  const pending = new Map();
  addEventListener("message", (event) => {
    const message = event.data || {};
    if (!message.id || !pending.has(message.id)) return;
    const entry = pending.get(message.id); pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error)); else entry.resolve(message.result);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = crypto.randomUUID(); pending.set(id, { resolve, reject });
    parent.postMessage({ id, method, params }, "*");
  });
const libraryUrls = Object.freeze({
  "lucide-react": "https://esm.sh/lucide-react@0.468.0?bundle",
  "motion": "https://esm.sh/motion@12.34.3?bundle"
});
const libraryCache = new Map();
const importLibrary = (name) => {
  const url = libraryUrls[name];
  if (!url) return Promise.reject(new Error("That package is not enabled for custom heroes."));
  if (!libraryCache.has(name)) libraryCache.set(name, import(url));
  return libraryCache.get(name);
};
window.bilzing = Object.freeze({
  version: "1",
  site: Object.freeze({ get: () => call("bilzing.site.get") }),
  navigation: Object.freeze({ go: (href) => call("bilzing.navigation.go", { href }) }),
  analytics: Object.freeze({ track: (name, metadata = {}) => call("bilzing.analytics.track", { name, metadata }) }),
  frame: Object.freeze({ resize: (height) => call("bilzing.frame.resize", { height }) }),
  libraries: Object.freeze({ available: () => Object.keys(libraryUrls), import: importLibrary })
});`;

export const HERO_STARTER_SOURCE = String.raw`const Hero = () => {
  const [ready, setReady] = React.useState(false);
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:"8vw",background:"#111827",color:"white",fontFamily:"system-ui,sans-serif"}}>
    <div style={{width:"min(900px,100%)"}}>
      <small>ACME FIELDWORK</small>
      <h1 style={{margin:"12px 0",fontSize:"clamp(3rem,9vw,7rem)",lineHeight:.9,letterSpacing:"-.06em"}}>Built for hard jobs.</h1>
      <p style={{color:"#cbd5e1",fontSize:"1.1rem",lineHeight:1.6}}>This is executable React, not a static HTML mockup.</p>
      <button onClick={() => { setReady(true); bilzing.navigation.go("/contact"); }} style={{marginTop:20,border:0,borderRadius:999,padding:"13px 20px",font:"inherit",fontWeight:700,cursor:"pointer"}}>{ready ? "Opening contact…" : "Start a project"}</button>
    </div>
  </main>;
};
render(<Hero />);`;

export const HERO_RUNTIME_GUIDE = `React is available as React. Render with render(<Hero />). Use hooks normally. Load approved packages asynchronously with bilzing.libraries.import("lucide-react") or bilzing.libraries.import("motion").`;

export function buildHeroDocument(source: string) {
  const encodedSource = JSON.stringify(source).replaceAll("<", "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://esm.sh; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data: https:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><script src="https://unpkg.com/@babel/standalone@7.26.0/babel.min.js"></script></head><body><div id="root"></div><script type="module">
import React from "https://esm.sh/react@19.2.0";
import { createRoot } from "https://esm.sh/react-dom@19.2.0/client";
${sdk}
const root = createRoot(document.querySelector("#root"));
const render = (node) => root.render(node);
const source = ${encodedSource};
try {
  const compiled = Babel.transform(source, { presets: [["react", { runtime: "classic" }]] }).code;
  new Function("React", "render", "bilzing", '"use strict";\\n' + compiled + "\\n//# sourceURL=bilzing-custom-hero.jsx")(React, render, window.bilzing);
} catch (error) {
  root.render(React.createElement("pre", { style: { margin: 0, padding: "20px", color: "#b91c1c", fontFamily: "ui-monospace, monospace", whiteSpace: "pre-wrap" } }, "Hero runtime error: " + (error instanceof Error ? error.message : String(error))));
}
</script></body></html>`;
}
