import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "ghost";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-transparent text-text outline-none transition-colors duration-150",
          "placeholder:text-text-muted",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "border-2 border-text px-3 py-2 focus:bg-bg-hover",
          variant === "ghost" && "border-none",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
