import { Brain, Eye, Plus, Pencil, Minus, FilePlus, Search } from "lucide-react";

const TOOL_META: Record<string, { label: string; icon: React.ReactNode }> = {
  list_notes: { label: "Lecture des notes", icon: <Eye size={10} /> },
  read_note: { label: "Lecture d'une note", icon: <Eye size={10} /> },
  create_note: { label: "Création d'une note", icon: <Plus size={10} /> },
  update_note: { label: "Mise à jour d'une note", icon: <Pencil size={10} /> },
  delete_note: { label: "Suppression d'une note", icon: <Minus size={10} /> },
  append_to_note: { label: "Ajout de contenu", icon: <FilePlus size={10} /> },
  search_notes: { label: "Recherche", icon: <Search size={10} /> },
};

export function ToolCallBadge({ toolName }: { toolName: string }) {
  const meta = TOOL_META[toolName];
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="text-text-ghost">{meta?.icon ?? <Brain size={10} />}</span>
      <span className="text-[11px] text-text-ghost">
        {meta?.label ?? toolName}
      </span>
    </div>
  );
}
