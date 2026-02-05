import { motion } from "framer-motion";
import { THEMES, FONTS } from "@/types/settings";
import type { ThemeId, FontId } from "@/types/settings";

interface SummaryStepProps {
  name: string;
  theme: ThemeId;
  font: FontId;
}

export function SummaryStep({ name, theme, font }: SummaryStepProps) {
  const themeInfo = THEMES.find((t) => t.id === theme);
  const fontInfo = FONTS.find((f) => f.id === font);

  return (
    <div className="flex h-full flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-text">
          Tout est prêt{name ? `, ${name}` : ""} !
        </h1>
        <p className="mt-3 text-text-secondary">
          Voici un résumé de vos préférences.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 space-y-4"
      >
        <div className="rounded-xl border border-border bg-surface-elevated p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                Thème
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: themeInfo?.preview.surface }}
                />
                <span className="text-sm font-medium text-text">
                  {themeInfo?.name}
                </span>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                Police
              </span>
              <span
                className="text-sm font-medium text-text"
                style={{ fontFamily: fontInfo?.cssFamily }}
              >
                {fontInfo?.name}
              </span>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                IA
              </span>
              <span className="text-sm font-medium text-text">
                Ollama (Mistral)
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted">
          Modifiable à tout moment dans les paramètres
        </p>
      </motion.div>
    </div>
  );
}
