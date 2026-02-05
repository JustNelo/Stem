import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { THEMES, FONTS } from "@/types/settings";
import type { ThemeId, FontId } from "@/types/settings";

const TOTAL_STEPS = 4;

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export function Onboarding() {
  const { setUserName, setTheme, setFontFamily, completeOnboarding, theme, fontFamily } =
    useSettingsStore();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(theme);
  const [selectedFont, setSelectedFont] = useState<FontId>(fontFamily);

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const handleThemeSelect = (id: ThemeId) => {
    setSelectedTheme(id);
    setTheme(id);
  };

  const handleFontSelect = (id: FontId) => {
    setSelectedFont(id);
    setFontFamily(id);
  };

  const handleFinish = () => {
    if (name.trim()) {
      setUserName(name.trim());
    }
    completeOnboarding();
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    return true;
  };

  return (
    <div className="flex min-h-screen w-screen flex-col overflow-y-auto bg-surface pt-10">
      <div className="texture-overlay pointer-events-none fixed inset-0 z-50" />
      <div className="theme-effect pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10 m-auto w-full max-w-lg px-6 py-12">
        {/* Progress bar */}
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <motion.div
              key={i}
              className="h-1 flex-1 rounded-full"
              initial={false}
              animate={{
                backgroundColor: i <= step ? "var(--color-text)" : "var(--color-border)",
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="relative min-h-85">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <StepWrapper key="step-0" direction={direction}>
                <WelcomeStep name={name} onNameChange={setName} onSubmit={goNext} />
              </StepWrapper>
            )}
            {step === 1 && (
              <StepWrapper key="step-1" direction={direction}>
                <ThemeStep selected={selectedTheme} onSelect={handleThemeSelect} />
              </StepWrapper>
            )}
            {step === 2 && (
              <StepWrapper key="step-2" direction={direction}>
                <FontStep selected={selectedFont} onSelect={handleFontSelect} />
              </StepWrapper>
            )}
            {step === 3 && (
              <StepWrapper key="step-3" direction={direction}>
                <SummaryStep name={name} theme={selectedTheme} font={selectedFont} />
              </StepWrapper>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            {step > 0 && (
              <motion.button
                onClick={goBack}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft size={14} />
                Retour
              </motion.button>
            )}
          </div>

          <div>
            {step < TOTAL_STEPS - 1 ? (
              <motion.button
                onClick={goNext}
                disabled={!canProceed()}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-text px-5 py-2.5 text-sm font-medium text-surface transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continuer
                <ArrowRight size={14} />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleFinish}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-text px-5 py-2.5 text-sm font-medium text-surface transition-all hover:opacity-90"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles size={14} />
                Commencer
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepWrapper({
  children,
  direction,
}: {
  children: React.ReactNode;
  direction: number;
}) {
  return (
    <motion.div
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

// --- Step 1: Welcome ---
function WelcomeStep({
  name,
  onNameChange,
  onSubmit,
}: {
  name: string;
  onNameChange: (v: string) => void;
  onSubmit: () => void;
}) {
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

// --- Step 2: Theme ---
function ThemeStep({
  selected,
  onSelect,
}: {
  selected: ThemeId;
  onSelect: (id: ThemeId) => void;
}) {
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

// --- Step 3: Font ---
function FontStep({
  selected,
  onSelect,
}: {
  selected: FontId;
  onSelect: (id: FontId) => void;
}) {
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

// --- Step 4: Summary ---
function SummaryStep({
  name,
  theme,
  font,
}: {
  name: string;
  theme: ThemeId;
  font: FontId;
}) {
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
