import { useCallback, useRef } from "react";
import { Channel } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";

interface StreamChunk {
  token: string;
  done: boolean;
}

interface UseStreamingMessageOptions {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

/**
 * Hook that streams tokens from the ollama_chat_stream Tauri command.
 * Uses Tauri 2 Channel IPC for real-time token delivery.
 */
export function useStreamingMessage({
  onToken,
  onDone,
  onError,
}: UseStreamingMessageOptions) {
  const accumulatedRef = useRef("");

  const stream = useCallback(
    async (
      messages: Array<{ role: string; content: string }>,
      model: string,
      ollamaUrl: string,
    ) => {
      accumulatedRef.current = "";

      const channel = new Channel<StreamChunk>();

      channel.onmessage = (chunk) => {
        if (chunk.done) {
          onDone(accumulatedRef.current);
          return;
        }
        accumulatedRef.current += chunk.token;
        onToken(chunk.token);
      };

      try {
        await invoke("ollama_chat_stream", {
          messages,
          model,
          ollamaUrl,
          channel,
        });
      } catch (err) {
        onError(String(err));
      }
    },
    [onToken, onDone, onError],
  );

  return { stream };
}
