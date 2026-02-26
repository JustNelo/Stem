/**
 * Minimal loading spinner used as Suspense fallback.
 * Matches the Deep Obsidian Metallic theme.
 */
export function AppLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-deep">
      <div className="flex flex-col items-center gap-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-metallic border-t-accent" />
        <span className="select-none font-mono text-[10px] uppercase tracking-[0.25em] text-text-ghost">
          STEM
        </span>
      </div>
    </div>
  );
}
