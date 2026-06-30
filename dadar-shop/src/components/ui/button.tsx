import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-px active:scale-[0.94] active:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_24px_-8px_color-mix(in_oklab,var(--color-primary)_50%,transparent)] hover:brightness-110",
        hero:
          "bg-hero-gradient text-primary-foreground shadow-[0_12px_32px_-12px_color-mix(in_oklab,var(--color-primary)_70%,transparent)] hover:brightness-110",
        amber:
          "bg-amber-gradient text-amber-foreground shadow-[0_8px_24px_-10px_color-mix(in_oklab,var(--color-amber)_60%,transparent)] hover:brightness-105",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        soft:
          "bg-primary-soft text-primary hover:brightness-95",
        outline:
          "border border-border-strong bg-surface text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        glass:
          "glass text-foreground hover:bg-surface/70",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110",
        link: "text-primary underline-offset-4 hover:underline px-0 h-auto",
        brand:
          "bg-gradient-to-r from-[oklch(0.68_0.26_305)] to-[oklch(0.72_0.28_350)] text-white shadow-[0_0_20px_-6px_oklch(0.68_0.26_305/0.8)] hover:brightness-110",
      },
      size: {
        default: "h-10 px-4 text-sm rounded-pill",
        sm: "h-8 px-3.5 text-xs rounded-pill",
        lg: "h-12 px-6 text-sm rounded-pill",
        xl: "h-14 px-7 text-base rounded-pill tracking-tight",
        icon: "h-10 w-10 rounded-pill",
        iconSm: "h-8 w-8 rounded-pill",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
