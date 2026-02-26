import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { StepWrapper } from "@/components/Onboarding/steps/StepWrapper";
import { WelcomeStep } from "@/components/Onboarding/steps/WelcomeStep";
import { SummaryStep } from "@/components/Onboarding/steps/SummaryStep";

const TOTAL_STEPS = 2;

export function Onboarding() {
  const setUserName = useSettingsStore((s) => s.setUserName);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");

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
    <div className="flex min-h-screen w-screen flex-col overflow-y-auto bg-surface-deep pt-8">
      <div className="texture-overlay pointer-events-none fixed inset-0 z-50" />

      <div className="relative z-10 m-auto w-full max-w-lg px-6 py-12">
        {/* Progress bar */}
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <motion.div
              key={i}
              className="h-1 flex-1 rounded-full"
              initial={false}
              animate={{
                backgroundColor: i <= step ? "var(--color-accent)" : "var(--color-border-metallic)",
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
                <SummaryStep name={name} />
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
                className="btn-sculpted flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-text transition-all hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continuer
                <ArrowRight size={14} />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleFinish}
                className="btn-sculpted flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-text transition-all hover:text-accent"
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
