import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
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
  const dangerClass =
    variant === "danger"
      ? "text-text-muted hover:bg-red-500/10 hover:text-red-500"
      : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "icon-sm" : "icon"}
          aria-label={label}
          onClick={onClick}
          onMouseDown={onMouseDown}
          disabled={disabled}
          className={cn("text-text-muted hover:text-text", dangerClass, className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
