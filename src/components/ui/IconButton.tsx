import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface IconButtonProps {
  variant?: "ghost" | "danger";
  size?: "sm" | "md";
  label: string;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}

export function IconButton({
  variant = "ghost",
  size = "sm",
  label,
  className,
  children,
  onClick,
  onMouseDown,
  disabled,
}: IconButtonProps) {
  const sizeClass = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const variantClass =
    variant === "danger"
      ? "text-text-muted hover:bg-red-500/10 hover:text-red-500"
      : "text-text-muted hover:bg-surface-hover hover:text-text";

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-md transition-colors",
        sizeClass,
        variantClass,
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
