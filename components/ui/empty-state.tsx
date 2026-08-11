import type { LucideIcon } from "lucide-react";
import { Button } from "./button";

export function EmptyState({ icon: Icon, title, description, action, onAction }: { icon: LucideIcon; title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-3 flex size-10 items-center justify-center rounded-md bg-muted"><Icon className="size-5 text-muted-foreground" /></div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>{action && <Button className="mt-4" onClick={onAction}>{action}</Button>}</div>;
}
