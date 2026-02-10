import { z } from "zod";
import { safeInvoke } from "@/lib/tauri";

const GitStatusSchema = z.object({
  initialized: z.boolean(),
  has_remote: z.boolean(),
  clean: z.boolean(),
  branch: z.string(),
  last_error: z.string().nullable(),
});

export type GitRepoStatus = z.infer<typeof GitStatusSchema>;

/**
 * Git sync service — abstracts git IPC commands.
 */
export const GitService = {
  async getStatus(repoPath: string): Promise<GitRepoStatus> {
    return safeInvoke("git_status", GitStatusSchema, { repoPath });
  },

  async init(repoPath: string): Promise<string> {
    return safeInvoke("git_init", z.string(), { repoPath });
  },

  async pull(repoPath: string): Promise<string> {
    return safeInvoke("git_pull", z.string(), { repoPath });
  },

  async sync(repoPath: string): Promise<string> {
    return safeInvoke("git_sync", z.string(), { repoPath });
  },
};
