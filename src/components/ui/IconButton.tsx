import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const iconSizeStyles = {
  sm: "[&>svg]:h-3 [&>svg]:w-3",
  md: "[&>svg]:h-4 [&>svg]:w-4",
  lg: "[&>svg]:h-5 [&>svg]:w-5",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center justify-center transition-colors duration-150",
          "text-text-secondary hover:bg-bg-hover hover:text-text",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text",
          "disabled:pointer-events-none disabled:opacity-50",
          sizeStyles[size],
          iconSizeStyles[size],
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
