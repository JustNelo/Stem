import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { common, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";

const lowlight = createLowlight(common);

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  let highlightedHtml: string;
  try {
    const tree = lowlight.highlight(language, code);
    highlightedHtml = toHtml(tree);
  } catch {
    highlightedHtml = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border-metallic shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02),0_2px_8px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between border-b border-border bg-surface-hover/40 px-3 py-1.5">
        <span className="font-mono text-[10px] font-medium lowercase tracking-wide text-text-muted">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="btn-sculpted flex h-5 w-5 cursor-pointer items-center justify-center text-text-ghost transition-colors hover:text-text-muted"
          title="Copier le code"
        >
          {copied ? <Check size={9} /> : <Copy size={9} />}
        </button>
      </div>
      <div
        className="overflow-x-auto font-mono text-[12px] leading-[1.7] text-text-secondary"
        style={{ padding: "12px 14px", background: "var(--color-surface-deep)" }}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </div>
  );
}
