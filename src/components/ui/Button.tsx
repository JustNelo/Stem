import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-text text-bg hover:bg-text-secondary border-2 border-text",
  secondary: "bg-bg text-text hover:bg-bg-hover border-2 border-text",
  ghost: "bg-transparent text-text hover:bg-bg-hover border-2 border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
