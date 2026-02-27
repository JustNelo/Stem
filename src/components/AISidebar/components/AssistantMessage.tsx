import { Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { CodeBlock } from "./CodeBlock";

export function AssistantMessage({ content, command }: { content: string; command?: string }) {
  return (
    <div>
      {command && (
        <div className="mb-1 flex items-center gap-1.5">
          <Sparkles size={9} className="text-text-ghost" />
          <span className="text-[10px] text-text-ghost">{command}</span>
        </div>
      )}
      <div className="ai-markdown text-[13px] leading-[1.6] text-text-secondary [&_h1]:mb-1.5 [&_h1]:mt-3 [&_h1]:text-[14px] [&_h1]:font-semibold [&_h1]:text-text [&_h2]:mb-1 [&_h2]:mt-2.5 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-text [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-[13px] [&_h3]:font-medium [&_h3]:text-text [&_li]:mb-0.5 [&_li]:text-[13px] [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1 [&_strong]:font-semibold [&_strong]:text-text [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4">
        <Markdown
          rehypePlugins={[rehypeSanitize]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const codeStr = String(children).replace(/\n$/, "");

              if (match) {
                return <CodeBlock code={codeStr} language={match[1]} />;
              }

              return (
                <code
                  className="rounded bg-surface-hover/80 px-1 py-0.5 font-mono text-[12px] text-text-secondary"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre({ children }) {
              return <>{children}</>;
            },
          }}
        >
          {content}
        </Markdown>
      </div>
    </div>
  );
}
