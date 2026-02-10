import { useState, useEffect, useRef, useCallback } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { GitService, type GitRepoStatus } from "@/services/git";
import type { GitSyncStatus } from "@/types";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Manages automatic git sync:
 * - Pull on mount (if configured)
 * - Periodic sync (export + commit + push) every 5 minutes
 * - Exposes manual sync trigger and status
 */
export function useGitSync() {
  const gitRepoPath = useSettingsStore((s) => s.gitRepoPath);
  const gitAutoSync = useSettingsStore((s) => s.gitAutoSync);

  const [syncStatus, setSyncStatus] = useState<GitSyncStatus>("idle");
  const [repoStatus, setRepoStatus] = useState<GitRepoStatus | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isConfigured = gitRepoPath.trim().length > 0;

  // Refresh repo status
  const refreshStatus = useCallback(async () => {
    if (!isConfigured) {
      setRepoStatus(null);
      return;
    }
    try {
      const status = await GitService.getStatus(gitRepoPath);
      setRepoStatus(status);
    } catch {
      setRepoStatus(null);
    }
  }, [gitRepoPath, isConfigured]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isConfigured) return;
    setSyncStatus("syncing");
    try {
      const msg = await GitService.sync(gitRepoPath);
      setLastMessage(msg);
      setSyncStatus("synced");
      await refreshStatus();
      // Reset to idle after a few seconds
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err) {
      setLastMessage(String(err));
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 5000);
    }
  }, [gitRepoPath, isConfigured, refreshStatus]);

  // Pull on mount
  useEffect(() => {
    if (!isConfigured || !gitAutoSync) return;

    GitService.pull(gitRepoPath).catch((err) =>
      console.debug("[git] Pull skipped:", err),
    );
    refreshStatus();
  }, [gitRepoPath, gitAutoSync, isConfigured, refreshStatus]);

  // Periodic sync
  useEffect(() => {
    if (!isConfigured || !gitAutoSync) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      triggerSync();
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConfigured, gitAutoSync, triggerSync]);

  return {
    syncStatus,
    repoStatus,
    lastMessage,
    isConfigured,
    triggerSync,
    refreshStatus,
  };
}
