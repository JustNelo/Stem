import { useState, useEffect } from "react";
import { GitBranch, FolderOpen, RefreshCw, Check, AlertCircle } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { GitService, type GitRepoStatus } from "@/services/git";

export function GitTab() {
  const gitRepoPath = useSettingsStore((s) => s.gitRepoPath);
  const setGitRepoPath = useSettingsStore((s) => s.setGitRepoPath);
  const gitAutoSync = useSettingsStore((s) => s.gitAutoSync);
  const setGitAutoSync = useSettingsStore((s) => s.setGitAutoSync);

  const [repoStatus, setRepoStatus] = useState<GitRepoStatus | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refresh status when path changes
  useEffect(() => {
    if (!gitRepoPath.trim()) {
      setRepoStatus(null);
      return;
    }
    GitService.getStatus(gitRepoPath)
      .then(setRepoStatus)
      .catch(() => setRepoStatus(null));
  }, [gitRepoPath]);

  const handleInit = async () => {
    if (!gitRepoPath.trim()) return;
    try {
      await GitService.init(gitRepoPath);
      const status = await GitService.getStatus(gitRepoPath);
      setRepoStatus(status);
      setSyncMessage("Repository initialisé");
    } catch (err) {
      setSyncMessage(String(err));
    }
  };

  const handleSync = async () => {
    if (!gitRepoPath.trim()) return;
    setIsSyncing(true);
    try {
      const msg = await GitService.sync(gitRepoPath);
      setSyncMessage(msg);
      const status = await GitService.getStatus(gitRepoPath);
      setRepoStatus(status);
    } catch (err) {
      setSyncMessage(String(err));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-sm font-semibold text-text">Git Sync</h2>
        <p className="text-xs text-text-muted">
          Sauvegardez et versionnez vos notes via Git.
        </p>
      </div>

      {/* Repo path */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary">
          Chemin du dépôt Git
        </label>
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="text-text-muted" />
          <input
            type="text"
            value={gitRepoPath}
            onChange={(e) => setGitRepoPath(e.target.value)}
            placeholder="C:\Users\...\stem-notes"
            className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-ghost focus:border-text-muted"
          />
        </div>
        <p className="text-[10px] text-text-ghost">
          Dossier où vos notes seront exportées en .md et versionnées.
        </p>
      </div>

      {/* Auto-sync toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text">Synchronisation automatique</p>
          <p className="text-xs text-text-muted">Pull au lancement, commit toutes les 5 min</p>
        </div>
        <button
          onClick={() => setGitAutoSync(!gitAutoSync)}
          className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
            gitAutoSync ? "bg-emerald-500" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              gitAutoSync ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Repo status */}
      {repoStatus && (
        <div className="rounded-lg border border-border bg-surface-elevated p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <GitBranch size={14} className="text-text-muted" />
            <span className="text-text-secondary">
              {repoStatus.initialized
                ? `Branche: ${repoStatus.branch || "main"}`
                : "Non initialisé"}
            </span>
            {repoStatus.clean && repoStatus.initialized && (
              <Check size={12} className="text-emerald-400" />
            )}
          </div>
          {repoStatus.has_remote && (
            <p className="text-xs text-text-ghost">Remote configuré</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {(!repoStatus || !repoStatus.initialized) && gitRepoPath.trim() && (
          <button
            onClick={handleInit}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm text-text transition-colors hover:bg-surface-hover"
          >
            <GitBranch size={14} />
            Initialiser le dépôt
          </button>
        )}

        {repoStatus?.initialized && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm text-text transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Synchronisation..." : "Synchroniser maintenant"}
          </button>
        )}
      </div>

      {/* Sync message */}
      {syncMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-elevated p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-text-muted" />
          <p className="text-xs text-text-secondary">{syncMessage}</p>
        </div>
      )}
    </div>
  );
}
