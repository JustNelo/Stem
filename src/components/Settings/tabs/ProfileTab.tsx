import { RotateCcw } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";

export function ProfileTab() {
  const userName = useSettingsStore((s) => s.userName);
  const setUserName = useSettingsStore((s) => s.setUserName);
  const resetOnboarding = useSettingsStore((s) => s.resetOnboarding);

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-text-muted">
          Prénom
        </label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Votre prénom..."
          className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-text outline-none transition-colors focus:border-text-muted"
        />
      </div>

      <div className="border-t border-border pt-6">
        <button
          onClick={resetOnboarding}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-left transition-colors hover:bg-surface-hover"
        >
          <RotateCcw size={16} className="text-text-muted" />
          <div>
            <p className="text-sm font-medium text-text">Relancer l'onboarding</p>
            <p className="text-xs text-text-muted">Revoir l'écran de bienvenue</p>
          </div>
        </button>
      </div>
    </div>
  );
}
