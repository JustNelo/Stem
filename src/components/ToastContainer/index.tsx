import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Info } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";
import type { Toast } from "@/store/useToastStore";

const ICON_MAP: Record<Toast["type"], React.ReactNode> = {
  success: <Check size={12} className="text-emerald-500" />,
  error: <X size={12} className="text-red-400" />,
  info: <Info size={12} className="text-blue-400" />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={() => removeToast(toast.id)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 shadow-lg"
          >
            {ICON_MAP[toast.type]}
            <span className="text-xs text-text-secondary">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
