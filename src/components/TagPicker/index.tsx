import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import { useTagsStore } from "@/store/useTagsStore";
import { TAG_COLORS } from "@/types/tag";
import type { Tag } from "@/types/tag";

interface TagPickerProps {
  noteId: string;
}

export function TagPicker({ noteId }: TagPickerProps) {
  const {
    tags: allTags,
    noteTagsCache,
    fetchTags,
    createTag,
    addTagToNote,
    removeTagFromNote,
    getTagsForNote,
  } = useTagsStore();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[5].value);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const noteTags = noteTagsCache[noteId] || [];

  // Fetch tags on mount
  useEffect(() => {
    fetchTags();
    getTagsForNote(noteId);
  }, [noteId, fetchTags, getTagsForNote]);

  // Focus input when picker opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Position dropdown relative to trigger button
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  // Close on click outside (check both container and portal dropdown)
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const portalEl = document.getElementById("tagpicker-portal");
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!portalEl || !portalEl.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, updatePosition]);

  const availableTags = allTags.filter(
    (tag) =>
      !noteTags.some((nt) => nt.id === tag.id) &&
      tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddTag = async (tag: Tag) => {
    await addTagToNote(noteId, tag.id);
    setSearch("");
  };

  const handleRemoveTag = async (tagId: string) => {
    await removeTagFromNote(noteId, tagId);
  };

  const handleCreateAndAdd = async () => {
    if (!search.trim()) return;
    const newTag = await createTag({ name: search.trim(), color: selectedColor });
    if (newTag) {
      await addTagToNote(noteId, newTag.id);
      setSearch("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (availableTags.length > 0) {
        handleAddTag(availableTags[0]);
      } else if (search.trim()) {
        handleCreateAndAdd();
      }
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Tag chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <AnimatePresence mode="popLayout">
          {noteTags.map((tag) => (
            <motion.span
              key={tag.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              layout
              className="group inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: tag.color + "18",
                color: tag.color,
                border: `1px solid ${tag.color}30`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-0.5 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={10} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        {/* Add tag button */}
        <motion.button
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-text-muted transition-colors hover:border-text-muted hover:text-text-secondary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isOpen ? <X size={10} /> : <Plus size={10} />}
          <TagIcon size={10} />
        </motion.button>
      </div>

      {/* Dropdown via portal — escapes overflow clipping */}
      {createPortal(
        <AnimatePresence>
          {isOpen && dropdownPos && (
            <motion.div
              id="tagpicker-portal"
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="fixed z-100 w-64 overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-xl"
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
            >
              {/* Search input */}
              <div className="border-b border-border p-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Rechercher ou créer..."
                  className="w-full bg-transparent px-2 py-1 text-sm text-text outline-none placeholder:text-text-ghost"
                />
              </div>

              {/* Available tags */}
              <div className="max-h-40 overflow-y-auto p-1">
                {availableTags.length > 0 ? (
                  availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddTag(tag)}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-text">{tag.name}</span>
                    </button>
                  ))
                ) : search.trim() ? (
                  <div className="px-2 py-2">
                    <p className="mb-2 text-xs text-text-muted">
                      Créer le tag "{search.trim()}"
                    </p>
                    {/* Color picker */}
                    <div className="mb-2 flex flex-wrap gap-1">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setSelectedColor(c.value)}
                          className={`h-5 w-5 cursor-pointer rounded-full border-2 transition-transform hover:scale-110 ${
                            selectedColor === c.value
                              ? "border-text scale-110"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleCreateAndAdd}
                      className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md bg-text px-3 py-1.5 text-xs font-medium text-surface transition-opacity hover:opacity-90"
                    >
                      <Plus size={12} />
                      Créer et ajouter
                    </button>
                  </div>
                ) : (
                  <p className="px-2 py-3 text-center text-xs text-text-muted">
                    Aucun tag disponible
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
