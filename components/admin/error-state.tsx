import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ title = "Something went wrong", description, retry, icon: Icon = AlertCircle }: { title?: string; description: string; retry?: () => void; icon?: LucideIcon }) {
  return <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center"><Icon className="mb-3 size-5 text-destructive" /><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>{retry ? <Button variant="outline" size="sm" className="mt-4" onClick={retry}>Try again</Button> : null}</div>;
}
