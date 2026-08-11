"use client";

import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Code2,
  SearchCheck,
} from "lucide-react";
import { Input, Textarea } from "@/components/ui/input";
import { resolveMediaUrl } from "@/lib/media-url";
import type { ResourceField } from "@/lib/types";

const fieldCopy: Record<
  string,
  { label: string; help?: string; placeholder?: string }
> = {
  page: {
    label: "Page path",
    help: "The website page this SEO entry belongs to.",
    placeholder: "/about",
  },
  meta_title: {
    label: "Search result title",
    help: "Aim for 30–60 characters and put the important phrase first.",
    placeholder: "Page title | Business name",
  },
  meta_description: {
    label: "Search result description",
    help: "Summarize the page clearly in roughly 120–160 characters.",
    placeholder: "Explain what visitors will find on this page.",
  },
  canonical_url: {
    label: "Preferred page URL",
    help: "Use the main public URL that search engines should index.",
    placeholder: "https://example.com/about",
  },
  og_image: {
    label: "Social sharing image",
    help: "Shown when this page is shared. A 1200 × 630 image works best.",
  },
  robots: {
    label: "Search engine access",
    help: "Choose whether search engines may index this page and follow its links.",
  },
  sitemap_priority: {
    label: "Page importance",
    help: "A hint for your sitemap—not a search ranking score.",
  },
  from_path: {
    label: "Old URL path",
    help: "Visitors arriving here will be redirected.",
    placeholder: "/old-page",
  },
  to_path: {
    label: "Send visitors to",
    help: "Use a website path or a complete external URL.",
    placeholder: "/new-page",
  },
  code: {
    label: "Redirect type",
    help: "Use Permanent when the old address will not return.",
  },
  schema_type: {
    label: "Content type",
    help: "Tell search engines what kind of information this represents.",
  },
  json_ld: {
    label: "Structured data",
    help: "Fill in the common details. Advanced JSON is optional.",
  },
};

export function seoFieldPresentation(field: ResourceField) {
  return fieldCopy[field.key] ?? { label: field.label, help: field.help_text };
}

function lengthTone(value: string, minimum: number, maximum: number) {
  if (!value) return "text-muted-foreground";
  return value.length >= minimum && value.length <= maximum
    ? "text-emerald-700"
    : "text-amber-700";
}

export function SeoEditorPreview({
  resourceKey,
  values,
}: {
  resourceKey: string;
  values: Record<string, unknown>;
}) {
  if (resourceKey === "redirects") {
    const source = String(values.from_path || "/old-page");
    const destination = String(values.to_path || "/new-page");
    const code = String(values.code || "301");
    return (
      <section className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-950">
          <ArrowRight className="size-4" /> Redirect preview
        </div>
        <div className="mt-3 grid items-center gap-2 text-sm sm:grid-cols-[1fr_auto_1fr]">
          <code className="truncate rounded-lg border bg-white px-3 py-2">{source}</code>
          <ArrowRight className="mx-auto size-4 text-blue-500" />
          <code className="truncate rounded-lg border bg-white px-3 py-2">{destination}</code>
        </div>
        <p className="mt-3 text-xs text-blue-800">
          {code === "301" || code === "308"
            ? `${code} permanent redirect — search engines should replace the old URL.`
            : `${code} temporary redirect — search engines may keep the old URL indexed.`}
        </p>
      </section>
    );
  }

  if (resourceKey === "schema") {
    return (
      <section className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-950">
          <Code2 className="size-4" /> Structured search information
        </div>
        <p className="mt-2 text-xs leading-5 text-violet-800">
          Add one entry for each major content type. Search engines can use this for rich results, but availability is never guaranteed.
        </p>
      </section>
    );
  }

  const title = String(values.meta_title || "Your page title");
  const description = String(
    values.meta_description ||
      "A clear description of this page will appear here in search results.",
  );
  const page = String(values.canonical_url || values.page || "https://example.com/page");
  const image = resolveMediaUrl(values.og_image);
  const checks = [
    { label: "Title", ready: Boolean(values.meta_title) },
    { label: "Description", ready: Boolean(values.meta_description) },
    { label: "Preferred URL", ready: Boolean(values.canonical_url) },
    { label: "Sharing image", ready: Boolean(image) },
  ];

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-neutral-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SearchCheck className="size-4 text-primary" /> Google result preview
        </div>
      </div>
      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-4">
          <p className="truncate text-xs text-emerald-800">{page}</p>
          <p className="mt-1 line-clamp-1 text-xl text-[#1a0dab]">{title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-600">
            {description}
          </p>
          {image ? (
            <div className="relative mt-3 aspect-[1.91/1] max-w-xs overflow-hidden rounded-lg border bg-muted">
              <Image src={image} alt="Social sharing preview" fill sizes="320px" unoptimized className="object-cover" />
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center gap-2 text-xs">
              {check.ready ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <CircleAlert className="size-4 text-amber-500" />
              )}
              <span className={check.ready ? "text-foreground" : "text-muted-foreground"}>
                {check.label}
              </span>
            </div>
          ))}
          <div className="border-t pt-2 text-[11px] text-muted-foreground">
            <p className={lengthTone(String(values.meta_title || ""), 30, 60)}>
              Title: {String(values.meta_title || "").length}/60
            </p>
            <p className={lengthTone(String(values.meta_description || ""), 120, 160)}>
              Description: {String(values.meta_description || "").length}/160
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const schemaFields: Record<string, Array<[string, string, string]>> = {
  Organization: [
    ["name", "Organization name", "Bilzing"],
    ["url", "Website URL", "https://example.com"],
    ["logo", "Logo URL", "https://example.com/logo.png"],
    ["description", "Description", "What the organization does"],
  ],
  LocalBusiness: [
    ["name", "Business name", "Business name"],
    ["url", "Website URL", "https://example.com"],
    ["telephone", "Phone", "+977 ..."],
    ["address", "Address", "Full business address"],
  ],
  Article: [
    ["headline", "Headline", "Article headline"],
    ["description", "Summary", "Short article summary"],
    ["image", "Image URL", "https://example.com/article.jpg"],
    ["datePublished", "Published date", "2026-08-11"],
  ],
  Product: [
    ["name", "Product name", "Product name"],
    ["description", "Description", "Product summary"],
    ["image", "Image URL", "https://example.com/product.jpg"],
    ["sku", "SKU", "PRODUCT-001"],
  ],
  Event: [
    ["name", "Event name", "Event name"],
    ["description", "Description", "Event summary"],
    ["startDate", "Start date", "2026-08-11T10:00:00+05:45"],
    ["location", "Location", "Venue or online URL"],
  ],
  WebSite: [
    ["name", "Website name", "Website name"],
    ["url", "Website URL", "https://example.com"],
    ["description", "Description", "What visitors can find here"],
  ],
};

function parseSchema(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

export function SeoSchemaEditor({
  value,
  schemaType,
  onChange,
}: {
  value: unknown;
  schemaType: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseSchema(value);
  const fields = schemaFields[schemaType] ?? [];

  function update(key: string, nextValue: string) {
    onChange(
      JSON.stringify({
        ...parsed,
        "@context": "https://schema.org",
        "@type": schemaType || "Organization",
        [key]: nextValue,
      }),
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      {fields.length ? (
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label, placeholder]) => (
          <label key={key} className="text-sm font-medium">
            {label}
            {key === "description" ? (
              <Textarea
                className="mt-2 min-h-24 bg-white"
                value={String(parsed[key] ?? "")}
                placeholder={placeholder}
                onChange={(event) => update(key, event.target.value)}
              />
            ) : (
              <Input
                className="mt-2 bg-white"
                value={String(parsed[key] ?? "")}
                placeholder={placeholder}
                onChange={(event) => update(key, event.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      ) : (
        <p className="rounded-lg border border-dashed bg-white p-4 text-sm text-muted-foreground">
          This content type needs a more detailed structure. Add its validated JSON-LD under Advanced JSON-LD.
        </p>
      )}
      <details className="rounded-lg border bg-white">
        <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-muted-foreground">
          Advanced JSON-LD
        </summary>
        <div className="border-t p-3">
          <Textarea
            className="min-h-44 font-mono text-xs"
            value={typeof value === "string" ? value : JSON.stringify(parsed, null, 2)}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
          />
        </div>
      </details>
    </div>
  );
}
