import { Check } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { THEMES, FONTS, FONT_SIZES } from "@/types/settings";
import type { ThemeId, FontId, FontSize } from "@/types/settings";

export function AppearanceTab() {
  const theme = useSettingsStore((s) => s.theme);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const setFontSize = useSettingsStore((s) => s.setFontSize);

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
