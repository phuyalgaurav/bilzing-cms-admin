import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground shadow-sm hover:brightness-[0.96]",
      secondary: "border-neutral-200 bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
      outline: "border-neutral-300 bg-card text-foreground shadow-[0_1px_1px_rgb(0_0_0/0.03)] hover:border-neutral-400 hover:bg-neutral-50",
      ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
      destructive: "bg-destructive text-white shadow-sm hover:bg-red-800",
    },
    size: { default: "h-10 px-4", sm: "h-9 px-3 text-xs", lg: "h-11 px-5", icon: "size-10 p-0" },
  }, defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />; }
export { buttonVariants };
