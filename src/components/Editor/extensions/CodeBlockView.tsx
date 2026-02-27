import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

const LANGUAGES = [
  { value: "", label: "Plain text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "xml", label: "XML" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
];

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const currentLang = (node.attrs.language as string) || "";

  return (
    <NodeViewWrapper as="pre" className="code-block-node" spellCheck={false}>
      <div className="code-block-header" contentEditable={false}>
        <select
          value={currentLang}
          onChange={(e) => updateAttributes({ language: e.target.value || null })}
          className="code-block-lang-select"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
      <NodeViewContent as={"code" as "div"} />
    </NodeViewWrapper>
  );
}
