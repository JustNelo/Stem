import { cn } from "@/lib/cn";

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
