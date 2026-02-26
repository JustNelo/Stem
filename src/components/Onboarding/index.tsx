import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { ThemeId, FontId } from "@/types/settings";
import { StepWrapper } from "@/components/Onboarding/steps/StepWrapper";
import { WelcomeStep } from "@/components/Onboarding/steps/WelcomeStep";
import { ThemeStep } from "@/components/Onboarding/steps/ThemeStep";
import { FontStep } from "@/components/Onboarding/steps/FontStep";
import { SummaryStep } from "@/components/Onboarding/steps/SummaryStep";

const TOTAL_STEPS = 4;

export function Onboarding() {
  const theme = useSettingsStore((s) => s.theme);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const setUserName = useSettingsStore((s) => s.setUserName);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

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
    <div className="flex min-h-screen w-screen flex-col overflow-y-auto bg-surface pt-8">
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
