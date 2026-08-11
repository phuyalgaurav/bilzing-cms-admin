import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
      outline: "border-input bg-background text-foreground hover:bg-accent",
      ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
      destructive: "bg-destructive text-white hover:bg-destructive/90",
      link: "h-auto border-0 p-0 text-primary underline-offset-4 hover:underline",
    },
    size: { default: "h-9 px-3.5", sm: "h-8 px-3 text-xs", lg: "h-10 px-4", icon: "size-9 p-0" },
  }, defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />; }
export { buttonVariants };
