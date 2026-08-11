import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return <section className={cn("grid gap-4 border-b py-5 last:border-b-0 md:grid-cols-[180px_minmax(0,1fr)]", className)}><div><h3 className="text-sm font-semibold">{title}</h3>{description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}</div><div className="grid min-w-0 gap-4 sm:max-w-2xl">{children}</div></section>;
}
