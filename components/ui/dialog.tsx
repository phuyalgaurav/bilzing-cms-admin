"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-neutral-950/40" /><DialogPrimitive.Content className={cn("dialog-content fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-card p-5 shadow-lg sm:p-6", className)} {...props}>{children}<DialogPrimitive.Close className="absolute right-3 top-3 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close"><X className="size-4" /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>;
}
export const DialogTitle = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => <DialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
export const DialogDescription = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => <DialogPrimitive.Description className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
