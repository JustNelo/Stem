import { Button, FileTextIcon, PlusIcon } from "../ui";

interface EmptyStateProps {
  onCreateNote: () => void;
}

export function EmptyState({ onCreateNote }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2">
        <FileTextIcon className="h-12 w-12 text-text-muted" />
        <p className="text-lg font-medium text-text-secondary">No note selected</p>
        <p className="text-sm text-text-muted">
          Select a note from the sidebar or create a new one
        </p>
      </div>
      <Button onClick={onCreateNote} size="lg">
        <PlusIcon className="mr-2 h-4 w-4" />
        New Note
      </Button>
    </div>
  );
}
