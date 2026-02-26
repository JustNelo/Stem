import { motion } from "framer-motion";
import { useSettingsStore } from "@/store/useSettingsStore";

interface SummaryStepProps {
  name: string;
}

export function SummaryStep({ name }: SummaryStepProps) {
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);

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
          Votre espace de notes intelligent est configuré.
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
                IA locale
              </span>
              <span className="text-sm font-medium text-text">
                Ollama ({ollamaModel})
              </span>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                Recherche sémantique
              </span>
              <span className="text-sm font-medium text-text">
                nomic-embed-text
              </span>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                Stockage
              </span>
              <span className="text-sm font-medium text-text">
                SQLite local
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
