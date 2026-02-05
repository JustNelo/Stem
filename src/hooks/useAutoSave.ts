import { useRef, useCallback, useState } from "react";
import type { SaveStatus } from "@/types";

export type { SaveStatus };

interface UseAutoSaveOptions {
  delay?: number;
  onSave: (content: string) => Promise<unknown>;
}

export function useAutoSave({ delay = 500, onSave }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (content: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }

      setStatus("saving");

      timeoutRef.current = setTimeout(async () => {
        try {
          await onSave(content);
          setStatus("saved");

          savedTimeoutRef.current = setTimeout(() => {
            setStatus("idle");
          }, 2000);
        } catch (error) {
          console.error("Auto-save failed:", error);
          setStatus("idle");
        }
      }, delay);
    },
    [delay, onSave]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = null;
    }
    setStatus("idle");
  }, []);

  return { status, save, cancel };
}
