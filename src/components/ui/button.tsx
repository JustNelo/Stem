import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-text text-surface hover:bg-text/90 shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
        secondary:
          "bg-surface-elevated border border-border-metallic text-text hover:bg-surface-hover shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_3px_rgba(0,0,0,0.2)]",
        ghost:
          "text-text-secondary hover:bg-surface-hover hover:text-text hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
        destructive:
          "bg-red-500/90 text-white hover:bg-red-500 shadow-[0_1px_3px_rgba(239,68,68,0.2)]",
        outline:
          "border border-border-metallic bg-transparent text-text hover:bg-surface-hover hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
        link:
          "text-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6",
        icon: "h-8 w-8",
        "icon-sm": "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
