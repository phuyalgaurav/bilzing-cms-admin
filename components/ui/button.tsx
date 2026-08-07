import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground shadow-sm hover:brightness-95",
      secondary: "bg-muted text-foreground hover:bg-neutral-200",
      outline: "border bg-card hover:bg-muted",
      ghost: "hover:bg-muted",
      destructive: "bg-destructive text-white hover:brightness-95",
    },
    size: { default: "h-10 px-4", sm: "h-8 px-3 text-xs", lg: "h-11 px-5", icon: "size-10" },
  }, defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />; }
export { buttonVariants };
