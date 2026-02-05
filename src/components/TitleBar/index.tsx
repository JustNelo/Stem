import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion, AnimatePresence } from "framer-motion";

export type SaveStatus = "idle" | "saving" | "saved";

interface TitleBarProps {
  saveStatus?: SaveStatus;
}

export function TitleBar({ saveStatus = "idle" }: TitleBarProps) {
  const appWindow = getCurrentWindow();

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
      className="fixed left-0 right-0 top-0 z-50 flex h-10 cursor-default items-center justify-between bg-surface border-b"
    >
      {/* Left side - App name with save indicator */}
      <div
        onMouseDown={handleDrag}
        className="flex flex-1 items-center gap-2 px-4"
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
          STEM
        </span>
        
        {/* Save status indicator */}
        <AnimatePresence>
          {saveStatus !== "idle" && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className={`h-2 w-2 rounded-full ${
                saveStatus === "saving" 
                  ? "bg-amber-400" 
                  : "bg-emerald-400"
              }`}
              title={saveStatus === "saving" ? "Saving..." : "Saved"}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Right side - Window controls */}
      <div className="flex items-center gap-1 pr-3">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleMinimize();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Minimize"
        >
          <svg
            width="10"
            height="2"
            viewBox="0 0 10 2"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="10" height="2" rx="1" fill="currentColor" />
          </svg>
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleMaximize();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Maximize"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-600"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Close"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
