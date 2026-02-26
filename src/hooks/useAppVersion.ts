import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";

/**
 * Fetches the app version from Tauri once on mount.
 * Returns null while loading, then the version string (e.g. "1.0.0").
 */
export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);

  return version;
}
