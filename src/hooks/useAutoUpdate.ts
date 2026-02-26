import { useEffect, useState, useCallback } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useToastStore } from "@/store/useToastStore";

interface UpdateState {
  available: boolean;
  version: string | null;
  installing: boolean;
}

/**
 * Checks for app updates on mount via Tauri's updater plugin.
 * If an update is available, exposes `install()` to download + relaunch.
 */
export function useAutoUpdate() {
  const [state, setState] = useState<UpdateState>({
    available: false,
    version: null,
    installing: false,
  });
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdate() {
      try {
        const update = await check();
        if (cancelled) return;

        if (update) {
          setState({ available: true, version: update.version, installing: false });
          addToast(`Mise à jour ${update.version} disponible`, "info");
        }
      } catch (err) {
        console.debug("[updater] Check skipped:", err);
      }
    }

    checkForUpdate();
    return () => { cancelled = true; };
  }, [addToast]);

  const install = useCallback(async () => {
    setState((s) => ({ ...s, installing: true }));
    try {
      const update = await check();
      if (!update) {
        setState((s) => ({ ...s, installing: false }));
        return;
      }
      await update.downloadAndInstall();
      await relaunch();
    } catch (err) {
      console.error("[updater] Install failed:", err);
      addToast("Échec de la mise à jour", "error");
      setState((s) => ({ ...s, installing: false }));
    }
  }, [addToast]);

  return { ...state, install };
}
