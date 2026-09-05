"use client";

type Theme = Record<string, unknown>;

const colors = [
  ["primary_color", "Primary"], ["secondary_color", "Secondary"],
  ["accent_color", "Accent"], ["background_color", "Page background"],
  ["surface_color", "Surface"], ["text_color", "Text"],
  ["muted_text_color", "Muted text"], ["border_color", "Borders"],
] as const;

const measurements = [
  ["content_width", "Content width", "100%"], ["content_gutter", "Side gutter", "28px"],
  ["header_height", "Header height", "82px"], ["section_spacing", "Section spacing", "104px"],
  ["page_spacing", "Page spacing", "72px"], ["card_padding", "Card padding", "36px"],
] as const;

const radii = [
  ["border_radius", "Base radius", "18px"], ["card_radius", "Card radius", "18px"],
  ["media_radius", "Media radius", "18px"], ["control_radius", "Button and chip radius", "999px"],
  ["panel_radius", "Menu and field radius", "13px"], ["border_width", "Border width", "1px"],
] as const;

const fieldClass = "mt-1 min-h-10 w-full rounded-md border bg-background px-3 text-sm";

export function ThemeEditor({ theme, onChange }: { theme: Theme; onChange: (next: Theme) => void }) {
  const set = (key: string, value: string) => onChange({ ...theme, [key]: value });
  const value = (key: string, fallback = "") => String(theme[key] ?? fallback);
  return <section className="rounded-lg border bg-card p-5">
    <div><h2 className="font-semibold">Site design system</h2><p className="mt-1 text-sm text-muted-foreground">These values control the shared consumer site only. Save a draft, preview, then publish when the system looks right.</p></div>

    <fieldset className="mt-6"><legend className="text-sm font-medium">Color system</legend><div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{colors.map(([key, label]) => <label className="block text-sm" key={key}>{label}<input type="color" className={`${fieldClass} h-10 p-1`} value={value(key, "#000000")} onChange={(event) => set(key, event.target.value)} /></label>)}</div></fieldset>

    <fieldset className="mt-6"><legend className="text-sm font-medium">Layout and rhythm</legend><div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{measurements.map(([key, label, placeholder]) => <label className="block text-sm" key={key}>{label}<input className={fieldClass} value={value(key)} placeholder={placeholder} onChange={(event) => set(key, event.target.value)} /></label>)}</div></fieldset>

    <fieldset className="mt-6"><legend className="text-sm font-medium">Corners and borders</legend><div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{radii.map(([key, label, placeholder]) => <label className="block text-sm" key={key}>{label}<input className={fieldClass} value={value(key)} placeholder={placeholder} onChange={(event) => set(key, event.target.value)} /></label>)}</div></fieldset>

    <fieldset className="mt-6"><legend className="text-sm font-medium">Typography and movement</legend><div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <label className="block text-sm">Body font<input className={fieldClass} value={value("font_family")} placeholder="Arial, sans-serif" onChange={(event) => set("font_family", event.target.value)} /></label>
      <label className="block text-sm">Heading font<input className={fieldClass} value={value("heading_font_family")} placeholder="Arial, sans-serif" onChange={(event) => set("heading_font_family", event.target.value)} /></label>
      <label className="block text-sm">Body size<input className={fieldClass} value={value("body_size")} placeholder="16px" onChange={(event) => set("body_size", event.target.value)} /></label>
      <label className="block text-sm">Body line height<input className={fieldClass} value={value("body_line_height")} placeholder="1.6" onChange={(event) => set("body_line_height", event.target.value)} /></label>
      <label className="block text-sm">Heading tracking<input className={fieldClass} value={value("heading_tracking")} placeholder="-0.06em" onChange={(event) => set("heading_tracking", event.target.value)} /></label>
      <label className="block text-sm">Motion duration<input className={fieldClass} value={value("motion_duration")} placeholder="220ms" onChange={(event) => set("motion_duration", event.target.value)} /></label>
      <label className="block text-sm">Motion distance<input className={fieldClass} value={value("motion_distance")} placeholder="8px" onChange={(event) => set("motion_distance", event.target.value)} /></label>
    </div></fieldset>

    <fieldset className="mt-6"><legend className="text-sm font-medium">Component treatment</legend><div className="mt-2 grid gap-3 sm:grid-cols-3">
      <label className="block text-sm">Cards<select className={fieldClass} value={value("card_style", "bordered")} onChange={(event) => set("card_style", event.target.value)}><option value="flat">Flat</option><option value="bordered">Bordered</option><option value="elevated">Elevated</option></select></label>
      <label className="block text-sm">Navigation<select className={fieldClass} value={value("navigation_style", "glass")} onChange={(event) => set("navigation_style", event.target.value)}><option value="glass">Translucent</option><option value="solid">Solid</option></select></label>
      <label className="block text-sm">Shadows<select className={fieldClass} value={value("shadow_style", "soft")} onChange={(event) => set("shadow_style", event.target.value)}><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label>
    </div></fieldset>
  </section>;
}
