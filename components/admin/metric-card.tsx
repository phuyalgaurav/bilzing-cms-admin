import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({ label, value, icon: Icon, detail, className }: { label: string; value: string | number; icon?: LucideIcon; detail?: string; className?: string }) {
  return <div className={cn("border-r px-4 py-3 last:border-r-0", className)}><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">{Icon ? <Icon className="size-3.5" /> : null}{label}</div><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>{detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}</div>;
}
