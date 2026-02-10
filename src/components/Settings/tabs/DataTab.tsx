import { useState, useCallback } from "react";
import { z } from "zod";
import { Download, Upload, Check, Loader } from "lucide-react";
import { safeInvoke } from "@/lib/tauri";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { useNotesStore } from "@/store/useNotesStore";
import { useToastStore } from "@/store/useToastStore";

export function DataTab() {
  const fetchNotes = useNotesStore((s) => s.fetchNotes);
  const addToast = useToastStore((s) => s.addToast);

  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    try {
      setExportStatus("exporting");
      const data = await safeInvoke("export_all_data", z.string());

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
      addToast("Données exportées avec succès", "success");
      setTimeout(() => setExportStatus(null), 2000);
    } catch (error) {
      console.error("Export failed:", error);
      addToast("Échec de l'export", "error");
      setExportStatus(null);
    }
  }, [addToast]);

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
      const result = await safeInvoke("import_all_data", z.string(), { data: text });
      setImportStatus(result);
      fetchNotes();
      addToast("Données importées avec succès", "success");
      setTimeout(() => setImportStatus(null), 3000);
    } catch (error) {
      console.error("Import failed:", error);
      setImportStatus(`Erreur: ${error}`);
      addToast("Échec de l'import", "error");
      setTimeout(() => setImportStatus(null), 3000);
    }
  }, [fetchNotes, addToast]);

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
              Notes en JSON
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
