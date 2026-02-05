import { cn } from "@/lib";
import { Input, IconButton } from "@/components/ui";
import { Menu, Check, Loader } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved";

interface HeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  onToggleSidebar: () => void;
  saveStatus: SaveStatus;
  hasNote: boolean;
}

export function Header({
  title,
  onTitleChange,
  onToggleSidebar,
  saveStatus,
  hasNote,
}: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-border-light px-3">
      <IconButton
        icon={<Menu />}
        label="Toggle sidebar"
        onClick={onToggleSidebar}
        size="sm"
      />

      {hasNote ? (
        <>
          <Input
            variant="ghost"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Sans titre"
            className="flex-1 text-lg font-semibold"
          />
          <SaveIndicator status={saveStatus} />
        </>
      ) : (
        <h1 className="flex-1 text-lg font-bold tracking-tight">STEM</h1>
      )}
    </header>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs transition-opacity duration-150",
        status === "saving" ? "text-text-muted" : "text-text-secondary"
      )}
    >
      {status === "saving" ? (
        <>
          <Loader className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Check className="h-3 w-3" />
          <span>Saved</span>
        </>
      )}
    </div>
  );
}
