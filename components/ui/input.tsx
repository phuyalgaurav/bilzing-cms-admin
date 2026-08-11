import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10 w-full rounded-lg border border-neutral-300 bg-card px-3 text-sm shadow-[0_1px_1px_rgb(0_0_0/0.02)] transition-[border-color,box-shadow] placeholder:text-neutral-400 focus:border-primary focus:ring-3 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-60", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-28 w-full resize-y rounded-lg border border-neutral-300 bg-card px-3 py-2.5 text-sm leading-6 shadow-[0_1px_1px_rgb(0_0_0/0.02)] transition-[border-color,box-shadow] placeholder:text-neutral-400 focus:border-primary focus:ring-3 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-60", className)} {...props} />;
}
