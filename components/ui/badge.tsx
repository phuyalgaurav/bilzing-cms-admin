import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "neutral" | "success" | "warning" | "brand" }) {
  const variants = { neutral: "bg-neutral-100 text-neutral-600", success: "bg-emerald-50 text-emerald-700", warning: "bg-amber-50 text-amber-700", brand: "bg-primary/10 text-primary" };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", variants[variant], className)} {...props} />;
}
