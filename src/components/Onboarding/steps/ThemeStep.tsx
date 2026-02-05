import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { THEMES } from "@/types/settings";
import type { ThemeId } from "@/types/settings";

interface ThemeStepProps {
  selected: ThemeId;
  onSelect: (id: ThemeId) => void;
}

export function ThemeStep({ selected, onSelect }: ThemeStepProps) {
  return (
    <div className="flex h-full flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-text">
          Choisissez votre thème
        </h1>
        <p className="mt-3 text-text-secondary">
          Vous pourrez le changer à tout moment dans les paramètres.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 grid grid-cols-3 gap-3"
      >
        {THEMES.map((theme) => (
          <motion.button
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 p-3 text-left transition-all ${
              selected === theme.id
                ? "border-text shadow-lg"
                : "border-border hover:border-text-muted"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Theme preview */}
            <div
              className="mb-3 h-16 rounded-lg border"
              style={{
                backgroundColor: theme.preview.surface,
                borderColor: theme.preview.accent + "40",
              }}
            >
              <div className="flex h-full flex-col justify-center gap-1.5 px-3">
                <div
                  className="h-1.5 w-3/4 rounded-full"
                  style={{ backgroundColor: theme.preview.text }}
                />
                <div
                  className="h-1.5 w-1/2 rounded-full opacity-50"
                  style={{ backgroundColor: theme.preview.text }}
                />
                <div
                  className="h-1.5 w-2/3 rounded-full opacity-25"
                  style={{ backgroundColor: theme.preview.text }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">{theme.name}</p>
                <p className="text-[10px] text-text-muted">{theme.description}</p>
              </div>
              {selected === theme.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-text"
                >
                  <Check size={12} className="text-surface" />
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
