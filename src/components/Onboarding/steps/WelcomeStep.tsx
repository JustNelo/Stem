import { motion } from "framer-motion";

interface WelcomeStepProps {
  name: string;
  onNameChange: (v: string) => void;
  onSubmit: () => void;
}

export function WelcomeStep({ name, onNameChange, onSubmit }: WelcomeStepProps) {
  return (
    <div className="flex h-full flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-text">
          Bienvenue sur STEM
        </h1>
        <p className="mt-3 text-text-secondary">
          Votre espace de notes intelligent. Comment vous appelez-vous ?
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSubmit();
          }}
          placeholder="Votre prénom..."
          autoFocus
          className="w-full border-b-2 border-border bg-transparent pb-3 text-2xl font-medium text-text outline-none placeholder:text-text-ghost transition-colors focus:border-text"
        />
      </motion.div>
    </div>
  );
}
