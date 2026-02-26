import { useState, useEffect, useCallback, useMemo } from "react";
import { z } from "zod";
import { Loader, Wifi, WifiOff } from "lucide-react";
import { safeInvoke } from "@/lib/tauri";
import { OllamaModelsSchema, OllamaUrlSchema } from "@/types/schemas";
import { useSettingsStore } from "@/store/useSettingsStore";

export function AITab() {
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const setAiEnabled = useSettingsStore((s) => s.setAiEnabled);
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const setOllamaModel = useSettingsStore((s) => s.setOllamaModel);
  const setOllamaUrl = useSettingsStore((s) => s.setOllamaUrl);

  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const urlError = useMemo(() => {
    if (!ollamaUrl.trim()) return null;
    const result = OllamaUrlSchema.safeParse(ollamaUrl);
    return result.success ? null : result.error.issues[0]?.message ?? "URL invalide";
  }, [ollamaUrl]);

  const checkConnection = useCallback(async () => {
    if (urlError) return;
    setOllamaConnected(null);
    try {
      const connected = await safeInvoke("check_ollama_connection", z.boolean(), { ollamaUrl });
      setOllamaConnected(connected);
      if (connected) {
        const models = await safeInvoke("get_ollama_models", OllamaModelsSchema, { ollamaUrl });
        setAvailableModels(models);
      }
    } catch {
      setOllamaConnected(false);
    }
  }, [ollamaUrl]);

  useEffect(() => {
    if (!aiEnabled || urlError) {
      setOllamaConnected(false);
      setAvailableModels([]);
      return;
    }
    const timer = setTimeout(() => {
      checkConnection();
    }, 500);
    return () => clearTimeout(timer);
  }, [checkConnection, urlError, aiEnabled]);

  return (
    <div className="space-y-5">
      {/* AI toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border-metallic bg-surface-elevated px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text">Activer l'IA</p>
          <p className="text-[11px] text-text-muted">
            Copilot, commandes slash, recherche sémantique
          </p>
        </div>
        <button
          onClick={() => setAiEnabled(!aiEnabled)}
          className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 ${
            aiEnabled ? "bg-accent" : "bg-border-metallic"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-surface-deep shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 ${
              aiEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {aiEnabled && (
        <>
          {/* Connection status */}
          <div className="flex items-center justify-between rounded-xl border border-border-metallic bg-surface-elevated px-4 py-3">
            <div className="flex items-center gap-2">
              {ollamaConnected === null ? (
                <Loader size={14} className="animate-spin text-text-muted" />
              ) : ollamaConnected ? (
                <Wifi size={14} className="text-emerald-500" />
              ) : (
                <WifiOff size={14} className="text-red-400" />
              )}
              <span className="text-sm text-text-secondary">
                {ollamaConnected === null
                  ? "Vérification..."
                  : ollamaConnected
                  ? "Ollama connecté"
                  : "Ollama non disponible"}
              </span>
            </div>
            <button
              onClick={checkConnection}
              className="btn-sculpted cursor-pointer px-3 py-1 text-xs text-text-muted transition-all duration-200 hover:text-text"
            >
              Tester
            </button>
          </div>

          {/* URL */}
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-text-muted">
              URL Ollama
            </label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className={`w-full rounded-xl border bg-surface-elevated px-4 py-2.5 font-mono text-sm text-text outline-none transition-all duration-200 focus:border-border-metallic focus:shadow-[0_0_8px_rgba(180,180,195,0.04)] ${
                urlError ? "border-red-400" : "border-border-metallic"
              }`}
            />
            {urlError && (
              <p className="mt-1.5 text-[11px] text-red-400">{urlError}</p>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-text-muted">
              Modèle
            </label>
            {availableModels.length > 0 ? (
              <select
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-border-metallic bg-surface-elevated px-4 py-2.5 text-sm text-text outline-none transition-all duration-200 focus:border-border-metallic focus:shadow-[0_0_8px_rgba(180,180,195,0.04)]"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="mistral"
                className="w-full rounded-xl border border-border-metallic bg-surface-elevated px-4 py-2.5 text-sm text-text outline-none transition-all duration-200 focus:border-border-metallic focus:shadow-[0_0_8px_rgba(180,180,195,0.04)]"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
