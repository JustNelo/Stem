import { useState, useEffect, useCallback, useMemo } from "react";
import { z } from "zod";
import { Loader, Wifi, WifiOff } from "lucide-react";
import { safeInvoke } from "@/lib/tauri";
import { OllamaModelsSchema, OllamaUrlSchema } from "@/types/schemas";
import { useSettingsStore } from "@/store/useSettingsStore";

export function AITab() {
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

  // Check Ollama connection when URL changes (debounced), only if valid
  useEffect(() => {
    if (urlError) {
      setOllamaConnected(false);
      setAvailableModels([]);
      return;
    }
    const timer = setTimeout(() => {
      checkConnection();
    }, 500);
    return () => clearTimeout(timer);
  }, [checkConnection, urlError]);

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-3">
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
          className="cursor-pointer text-xs text-text-muted transition-colors hover:text-text"
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
          className={`w-full rounded-lg border bg-surface-elevated px-4 py-2.5 font-mono text-sm text-text outline-none transition-colors focus:border-text-muted ${
            urlError ? "border-red-400" : "border-border"
          }`}
        />
        {urlError && (
          <p className="mt-1 text-xs text-red-400">{urlError}</p>
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
            className="w-full cursor-pointer rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-text outline-none transition-colors focus:border-text-muted"
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
            className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-text outline-none transition-colors focus:border-text-muted"
          />
        )}
      </div>
    </div>
  );
}
