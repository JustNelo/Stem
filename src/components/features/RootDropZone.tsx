import { useState, useRef, useCallback } from "react";

interface RootDropZoneProps {
  children: React.ReactNode;
  onDropItem: (type: string, itemId: string, targetFolderId: string | null) => void;
}

export function RootDropZone({ children, onDropItem }: RootDropZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const countRef = useRef(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    countRef.current++;
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    countRef.current--;
    if (countRef.current <= 0) {
      countRef.current = 0;
      setIsOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      countRef.current = 0;
      setIsOver(false);
      const type = e.dataTransfer.getData("application/stem-type");
      const itemId = e.dataTransfer.getData("application/stem-id");
      if (type && itemId) {
        onDropItem(type, itemId, null);
      }
    },
    [onDropItem],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-[2rem] rounded-md transition-colors ${isOver ? "bg-accent/5" : ""}`}
    >
      {children}
    </div>
  );
}
