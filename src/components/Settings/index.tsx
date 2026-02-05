import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Palette,
  Bot,
  Download,
  Upload,
  Check,
  Loader,
  Wifi,
  WifiOff,
  User,
  RotateCcw,
  Database,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNotesStore } from "@/store/useNotesStore";
import { THEMES, FONTS, FONT_SIZES } from "@/types/settings";
import type { ThemeId, FontId, FontSize } from "@/types/settings";
import { cn } from "@/lib";

type SettingsTab = "profile" | "appearance" | "ai" | "data";

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profil", icon: <User size={14} /> },
  { id: "appearance", label: "Apparence", icon: <Palette size={14} /> },
  { id: "ai", label: "IA", icon: <Bot size={14} /> },
  { id: "data", label: "Données", icon: <Database size={14} /> },
];

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const {
    userName,
    theme,
    fontFamily,
    fontSize,
    ollamaModel,
    ollamaUrl,
    setUserName,
    setTheme,
    setFontFamily,
    setFontSize,
    setOllamaModel,
    setOllamaUrl,
    resetOnboarding,
  } = useSettingsStore();

  const { fetchNotes } = useNotesStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setOllamaConnected(null);
    try {
      const connected = await invoke<boolean>("check_ollama_connection", { ollamaUrl });
      setOllamaConnected(connected);
      if (connected) {
        const models = await invoke<string[]>("get_ollama_models", { ollamaUrl });
        setAvailableModels(models);
      }
    } catch {
      setOllamaConnected(false);
    }
  }, [ollamaUrl]);

  // Check Ollama connection when AI tab is active and URL changes (debounced)
  useEffect(() => {
    if (activeTab !== "ai") return;
    const timer = setTimeout(() => {
      checkConnection();
    }, 500);
    return () => clearTimeout(timer);
  }, [checkConnection, activeTab]);

  const handleExport = useCallback(async () => {
    try {
      setExportStatus("exporting");
      const data = await invoke<string>("export_all_data");

      const filePath = await save({
        defaultPath: `stem-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (!filePath) {
        setExportStatus(null);
        return;
      }

      await writeTextFile(filePath, data);

      setExportStatus("done");
      setTimeout(() => setExportStatus(null), 2000);
    } catch (error) {
      console.error("Export failed:", error);
      setExportStatus(null);
    }
  }, []);

  const handleImport = useCallback(async () => {
    try {
      const filePath = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
        directory: false,
      });

      if (!filePath) return;

      setImportStatus("importing");
      const text = await readTextFile(filePath);
      const result = await invoke<string>("import_all_data", { data: text });
      setImportStatus(result);
      fetchNotes();
      setTimeout(() => setImportStatus(null), 3000);
    } catch (error) {
      console.error("Import failed:", error);
      setImportStatus(`Erreur: ${error}`);
      setTimeout(() => setImportStatus(null), 3000);
    }
  }, [fetchNotes]);

  return (
    <div className="flex h-screen w-screen flex-col bg-surface pt-10">
      <div className="texture-overlay pointer-events-none fixed inset-0 z-50" />
      <div className="theme-effect pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <motion.button
            onClick={onClose}
            className="flex cursor-pointer items-center gap-2 text-text-muted transition-colors hover:text-text"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft size={16} />
          </motion.button>
          <h1 className="text-2xl font-bold tracking-tight text-text">Paramètres</h1>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-surface-elevated p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all",
                activeTab === tab.id
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "profile" && (
                <ProfileTab
                  userName={userName}
                  setUserName={setUserName}
                  resetOnboarding={resetOnboarding}
                />
              )}
              {activeTab === "appearance" && (
                <AppearanceTab
                  theme={theme}
                  fontFamily={fontFamily}
                  fontSize={fontSize}
                  setTheme={setTheme}
                  setFontFamily={setFontFamily}
                  setFontSize={setFontSize}
                />
              )}
              {activeTab === "ai" && (
                <AITab
                  ollamaModel={ollamaModel}
                  ollamaUrl={ollamaUrl}
                  ollamaConnected={ollamaConnected}
                  availableModels={availableModels}
                  setOllamaModel={setOllamaModel}
                  setOllamaUrl={setOllamaUrl}
                  checkConnection={checkConnection}
                />
              )}
              {activeTab === "data" && (
                <DataTab
                  exportStatus={exportStatus}
                  importStatus={importStatus}
                  handleExport={handleExport}
                  handleImport={handleImport}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="py-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-ghost">
              STEM v0.1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== TAB COMPONENTS =====

function ProfileTab({
  userName,
  setUserName,
  resetOnboarding,
}: {
  userName: string;
  setUserName: (name: string) => void;
  resetOnboarding: () => void;
}) {
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

function AppearanceTab({
  theme,
  fontFamily,
  fontSize,
  setTheme,
  setFontFamily,
  setFontSize,
}: {
  theme: ThemeId;
  fontFamily: FontId;
  fontSize: FontSize;
  setTheme: (theme: ThemeId) => void;
  setFontFamily: (font: FontId) => void;
  setFontSize: (size: FontSize) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Theme */}
      <div>
        <label className="mb-3 block font-mono text-[10px] uppercase tracking-widest text-text-muted">
          Thème
        </label>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as ThemeId)}
              className={`cursor-pointer rounded-lg border-2 p-2.5 text-left transition-all ${
                theme === t.id
                  ? "border-text"
                  : "border-border hover:border-text-muted"
              }`}
            >
              <div
                className="mb-2 h-8 rounded border"
                style={{
                  backgroundColor: t.preview.surface,
                  borderColor: t.preview.accent + "40",
                }}
              />
              <p className="text-xs font-medium text-text">{t.name}</p>
              <p className="text-[10px] text-text-muted">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div>
        <label className="mb-3 block font-mono text-[10px] uppercase tracking-widest text-text-muted">
          Police
        </label>
        <div className="space-y-2">
          {FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFontFamily(f.id as FontId)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg border-2 px-4 py-3 text-left transition-all ${
                fontFamily === f.id
                  ? "border-text"
                  : "border-border hover:border-text-muted"
              }`}
            >
              <span
                className="text-sm text-text"
                style={{ fontFamily: f.cssFamily }}
              >
                {f.name}
              </span>
              {fontFamily === f.id && <Check size={14} className="text-text" />}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="mb-3 block font-mono text-[10px] uppercase tracking-widest text-text-muted">
          Taille de police
        </label>
        <div className="flex gap-2">
          {(Object.keys(FONT_SIZES) as FontSize[]).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`flex-1 cursor-pointer rounded-lg border-2 px-3 py-2 text-center text-sm capitalize transition-all ${
                fontSize === size
                  ? "border-text font-medium text-text"
                  : "border-border text-text-secondary hover:border-text-muted"
              }`}
            >
              {size === "small" ? "Petit" : size === "medium" ? "Moyen" : "Grand"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AITab({
  ollamaModel,
  ollamaUrl,
  ollamaConnected,
  availableModels,
  setOllamaModel,
  setOllamaUrl,
  checkConnection,
}: {
  ollamaModel: string;
  ollamaUrl: string;
  ollamaConnected: boolean | null;
  availableModels: string[];
  setOllamaModel: (model: string) => void;
  setOllamaUrl: (url: string) => void;
  checkConnection: () => void;
}) {
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
          className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-2.5 font-mono text-sm text-text outline-none transition-colors focus:border-text-muted"
        />
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

function DataTab({
  exportStatus,
  importStatus,
  handleExport,
  handleImport,
}: {
  exportStatus: string | null;
  importStatus: string | null;
  handleExport: () => void;
  handleImport: () => void;
}) {
  return (
    <div className="space-y-3">
      <button
        onClick={handleExport}
        disabled={exportStatus === "exporting"}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-3 text-left transition-colors hover:bg-surface-hover disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <Download size={16} className="text-text-muted" />
          <div>
            <p className="text-sm font-medium text-text">Exporter les données</p>
            <p className="text-xs text-text-muted">
              Notes, tags et associations en JSON
            </p>
          </div>
        </div>
        {exportStatus === "exporting" && (
          <Loader size={14} className="animate-spin text-text-muted" />
        )}
        {exportStatus === "done" && (
          <Check size={14} className="text-emerald-500" />
        )}
      </button>

      <button
        onClick={handleImport}
        disabled={importStatus === "importing"}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-3 text-left transition-colors hover:bg-surface-hover disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <Upload size={16} className="text-text-muted" />
          <div>
            <p className="text-sm font-medium text-text">Importer des données</p>
            <p className="text-xs text-text-muted">
              {importStatus && importStatus !== "importing"
                ? importStatus
                : "Fusionner depuis un fichier JSON"}
            </p>
          </div>
        </div>
        {importStatus === "importing" && (
          <Loader size={14} className="animate-spin text-text-muted" />
        )}
      </button>
    </div>
  );
}
