import { useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "framer-motion";
import { Minus, Square, X, Settings } from "lucide-react";

export type { SaveStatus } from "@/types";

interface TitleBarProps {
  onOpenSettings?: () => void;
}

export function TitleBar({ onOpenSettings }: TitleBarProps) {
  const appWindow = useRef(getCurrentWindow()).current;

  const handleMinimize = async () => {
    try {
      await appWindow.minimize();
    } catch (e) {
      console.error("Minimize failed:", e);
    }
  };
  
  const handleMaximize = async () => {
    try {
      await appWindow.toggleMaximize();
    } catch (e) {
      console.error("Maximize failed:", e);
    }
  };
  
  const handleClose = async () => {
    try {
      await appWindow.close();
    } catch (e) {
      console.error("Close failed:", e);
    }
  };

  const handleDrag = async (e: React.MouseEvent) => {
    // Only start drag on left click
    if (e.button === 0) {
      try {
        await appWindow.startDragging();
      } catch (err) {
        console.error("Drag failed:", err);
      }
    }
  };

  return (
    <div
      onMouseDown={handleDrag}
      className="fixed left-0 right-0 top-0 z-50 flex h-8 cursor-default items-center justify-between bg-surface-inset border-b border-white/6"
    >
      {/* Left side — draggable area */}
      <div
        onMouseDown={handleDrag}
        className="flex flex-1 items-center px-4"
      />


      {/* Right side - Settings + Window controls */}
      <div className="flex items-center gap-1 pr-3">
        {onOpenSettings && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-all duration-200 hover:bg-surface-hover hover:text-accent hover:shadow-[0_0_8px_rgba(180,180,195,0.06)]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Settings"
            title="Paramètres (Ctrl+,)"
          >
            <Settings size={11} />
          </motion.button>
        )}

        <div className="mx-1 h-3 w-px bg-border-metallic/40" />
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleMinimize();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-all duration-200 hover:bg-surface-hover hover:text-text hover:shadow-[0_0_6px_rgba(180,180,195,0.05)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Minimize"
        >
          <Minus size={10} />
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleMaximize();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-all duration-200 hover:bg-surface-hover hover:text-text hover:shadow-[0_0_6px_rgba(180,180,195,0.05)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Maximize"
        >
          <Square size={10} />
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.1)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Close"
        >
          <X size={10} />
        </motion.button>
      </div>
    </div>
  );
}
