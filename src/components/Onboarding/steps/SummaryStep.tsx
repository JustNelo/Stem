import { motion } from "framer-motion";
import { Sparkles, Shield, Search } from "lucide-react";

interface SummaryStepProps {
  name: string;
}

export function SummaryStep({ name }: SummaryStepProps) {
  return (
    <div className="flex h-full flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-text">
          C'est parti{name ? `, ${name}` : ""} !
        </h1>
        <p className="mt-3 text-text-secondary">
          Votre espace de notes est prêt. Voici ce que vous pouvez faire :
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 space-y-3"
      >
        <FeatureCard
          icon={<Sparkles size={16} />}
          title="Un assistant à portée de main"
          description="Résumez, corrigez ou explorez vos notes grâce à l'IA intégrée."
        />
        <FeatureCard
          icon={<Search size={16} />}
          title="Retrouvez tout, instantanément"
          description="Recherchez vos notes par mots-clés ou par sens, même si vous ne vous souvenez plus du titre."
        />
        <FeatureCard
          icon={<Shield size={16} />}
          title="Vos données restent chez vous"
          description="Tout est stocké localement sur votre machine. Rien n'est envoyé en ligne."
        />

        <p className="pt-2 text-center text-[11px] text-text-muted">
          Vous pouvez ajuster tout cela dans les paramètres à tout moment.
        </p>
      </motion.div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-metallic bg-surface-elevated p-4">
      <div className="btn-sculpted flex h-8 w-8 shrink-0 items-center justify-center text-text-secondary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="mt-0.5 text-[12px] text-text-muted">{description}</p>
      </div>
    </div>
  );
}
