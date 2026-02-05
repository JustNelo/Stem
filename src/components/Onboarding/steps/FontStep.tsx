import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { FONTS } from "@/types/settings";
import type { FontId } from "@/types/settings";

interface FontStepProps {
  selected: FontId;
  onSelect: (id: FontId) => void;
}

export function FontStep({ selected, onSelect }: FontStepProps) {
  return (
    <div className="flex h-full flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-text">
          Choisissez votre police
        </h1>
        <p className="mt-3 text-text-secondary">
          La police utilisée dans toute l'application.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 space-y-3"
      >
        {FONTS.map((font) => (
          <motion.button
            key={font.id}
            onClick={() => onSelect(font.id)}
            className={`flex w-full cursor-pointer items-center justify-between rounded-xl border-2 px-5 py-4 text-left transition-all ${
              selected === font.id
                ? "border-text shadow-lg"
                : "border-border hover:border-text-muted"
            }`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div>
              <p
                className="text-lg font-medium text-text"
                style={{ fontFamily: font.cssFamily }}
              >
                {font.name}
              </p>
              <p
                className="mt-1 text-sm text-text-secondary"
                style={{ fontFamily: font.cssFamily }}
              >
                Le renard brun rapide saute par-dessus le chien paresseux.
              </p>
            </div>
            {selected === font.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-text"
              >
                <Check size={14} className="text-surface" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
