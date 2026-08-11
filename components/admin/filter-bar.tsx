import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilterBar({ children, trailing, className }: { children: ReactNode; trailing?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 border-b bg-card px-4 py-3 sm:flex-row sm:items-center", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">{children}</div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
