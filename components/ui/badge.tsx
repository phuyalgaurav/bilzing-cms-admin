import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "neutral" | "success" | "warning" | "brand" | "danger" }) {
  const variants = { neutral: "border-zinc-200 bg-zinc-50 text-zinc-600", success: "border-emerald-200 bg-emerald-50 text-emerald-700", warning: "border-amber-200 bg-amber-50 text-amber-700", brand: "border-blue-200 bg-blue-50 text-blue-700", danger: "border-red-200 bg-red-50 text-red-700" };
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-5", variants[variant], className)} {...props} />;
}
