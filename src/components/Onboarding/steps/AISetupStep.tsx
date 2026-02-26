import { motion } from "framer-motion";
import { Bot, Terminal, Download, ExternalLink } from "lucide-react";

export function AISetupStep() {
  return (
    <div className="flex h-full flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-text">
          Intelligence Artificielle
        </h1>
        <p className="mt-3 text-text-secondary">
          STEM utilise <strong className="text-text">Ollama</strong> pour l'IA locale — vos données restent sur votre machine.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 space-y-4"
      >
        {/* Steps */}
        <div className="space-y-3">
          <StepCard
            icon={<Download size={16} />}
            title="1. Installer Ollama"
            description="Téléchargez et installez Ollama depuis ollama.com"
            link="https://ollama.com"
          />
          <StepCard
            icon={<Terminal size={16} />}
            title="2. Télécharger un modèle"
            description="Ouvrez un terminal et exécutez :"
            code="ollama pull mistral"
          />
          <StepCard
            icon={<Bot size={16} />}
            title="3. C'est prêt !"
            description="STEM détectera automatiquement Ollama au démarrage."
          />
        </div>

        <p className="text-center text-[11px] text-text-muted">
          Vous pouvez aussi désactiver l'IA dans les paramètres.
        </p>
      </motion.div>
    </div>
  );
}

function StepCard({
  icon,
  title,
  description,
  code,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  code?: string;
  link?: string;
}) {
  return (
    <div className="rounded-xl border border-border-metallic bg-surface-elevated p-4">
      <div className="flex items-start gap-3">
        <div className="btn-sculpted flex h-8 w-8 shrink-0 items-center justify-center text-text-secondary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">{title}</p>
          <p className="mt-0.5 text-[12px] text-text-muted">
            {description}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex items-center gap-0.5 text-accent underline underline-offset-2 transition-colors hover:text-text"
              >
                ollama.com
                <ExternalLink size={10} />
              </a>
            )}
          </p>
          {code && (
            <code className="mt-2 block rounded-lg border border-border-metallic bg-surface-deep px-3 py-1.5 font-mono text-xs text-accent">
              {code}
            </code>
          )}
        </div>
      </div>
    </div>
  );
}
