import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleAnalytics } from "@/lib/analytics-api";
import { moduleExperience, modulePrimaryPath } from "@/lib/module-experience";
import { cn } from "@/lib/utils";

const formatNumber = new Intl.NumberFormat();

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ModuleAnalyticsCard({ module }: { module: ModuleAnalytics }) {
  const experience = moduleExperience(module.key);
  const Icon = experience.icon;
  const change = module.change_percent;
  const ChangeIcon = change === null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  const maxStatus = Math.max(...module.statuses.map((item) => item.count), 1);

  return (
    <Card className="flex min-h-80 flex-col">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted/40"><Icon className="size-4 text-muted-foreground" /></span>
          <div className="min-w-0 flex-1">
            <CardTitle>{module.label}</CardTitle>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{module.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-muted-foreground">All records</p><p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber.format(module.total)}</p></div>
          <div><p className="text-xs text-muted-foreground">Added this period</p><div className="mt-1 flex items-center gap-1.5"><p className="text-2xl font-semibold tabular-nums">{formatNumber.format(module.created)}</p><span className={cn("inline-flex items-center text-xs", change !== null && change > 0 ? "text-emerald-700 dark:text-emerald-400" : change !== null && change < 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}><ChangeIcon className="size-3" />{change === null ? "new" : `${Math.abs(change)}%`}</span></div></div>
        </div>

        {module.value_metric ? <div className="mt-4 border-t pt-3"><p className="text-xs text-muted-foreground">{module.value_metric.label}</p><p className="mt-1 font-medium tabular-nums">{formatNumber.format(module.value_metric.value)}</p></div> : null}

        {module.statuses.length ? (
          <div className="mt-4 border-t pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Current status</p>
            <div className="space-y-2">{module.statuses.slice(0, 3).map((item) => <div key={item.status} className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2 text-xs"><div><div className="mb-1 flex justify-between gap-2"><span className="truncate">{label(item.status)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground/55" style={{ width: `${(item.count / maxStatus) * 100}%` }} /></div></div><span className="text-right font-medium tabular-nums">{formatNumber.format(item.count)}</span></div>)}</div>
          </div>
        ) : (
          <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">{module.resources.slice(0, 2).map((item) => <div key={item.name} className="flex justify-between gap-3 py-1"><span>{item.name}</span><span className="font-medium tabular-nums text-foreground">{formatNumber.format(item.total)}</span></div>)}</div>
        )}

        <Link href={modulePrimaryPath(module.key)} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-auto self-end px-0 text-xs")}>Open {experience.label}<ArrowRight className="size-3.5" /></Link>
      </CardContent>
    </Card>
  );
}
