/* Generate by @shikijs/codegen */
import type {
  DynamicImportLanguageRegistration,
  DynamicImportThemeRegistration,
  HighlighterGeneric,
} from '@shikijs/types'
import {
  createBundledHighlighter,
  createSingletonShorthands,
} from '@shikijs/core'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'

type BundledLanguage =
  | 'python'
  | 'py'
  | 'javascript'
  | 'js'
  | 'cjs'
  | 'mjs'
  | 'typescript'
  | 'ts'
  | 'cts'
  | 'mts'
  | 'java'
  | 'c'
  | 'cpp'
  | 'c++'
  | 'csharp'
  | 'c#'
  | 'cs'
  | 'rust'
  | 'rs'
  | 'go'
  | 'html'
  | 'css'
  | 'json'
  | 'shellscript'
  | 'bash'
  | 'sh'
  | 'shell'
  | 'zsh'
  | 'sql'
  | 'markdown'
  | 'md'
  | 'yaml'
  | 'yml'
  | 'toml'
  | 'lua'
  | 'ruby'
  | 'rb'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'kt'
  | 'kts'
  | 'dart'
  | 'docker'
  | 'dockerfile'
  | 'xml'
type BundledTheme = 'light-plus' | 'dark-plus'
type Highlighter = HighlighterGeneric<BundledLanguage, BundledTheme>

const bundledLanguages = {
  python: () => import('@shikijs/langs-precompiled/python'),
  py: () => import('@shikijs/langs-precompiled/python'),
  javascript: () => import('@shikijs/langs-precompiled/javascript'),
  js: () => import('@shikijs/langs-precompiled/javascript'),
  cjs: () => import('@shikijs/langs-precompiled/javascript'),
  mjs: () => import('@shikijs/langs-precompiled/javascript'),
  typescript: () => import('@shikijs/langs-precompiled/typescript'),
  ts: () => import('@shikijs/langs-precompiled/typescript'),
  cts: () => import('@shikijs/langs-precompiled/typescript'),
  mts: () => import('@shikijs/langs-precompiled/typescript'),
  java: () => import('@shikijs/langs-precompiled/java'),
  c: () => import('@shikijs/langs-precompiled/c'),
  cpp: () => import('@shikijs/langs-precompiled/cpp'),
  'c++': () => import('@shikijs/langs-precompiled/cpp'),
  csharp: () => import('@shikijs/langs-precompiled/csharp'),
  'c#': () => import('@shikijs/langs-precompiled/csharp'),
  cs: () => import('@shikijs/langs-precompiled/csharp'),
  rust: () => import('@shikijs/langs-precompiled/rust'),
  rs: () => import('@shikijs/langs-precompiled/rust'),
  go: () => import('@shikijs/langs-precompiled/go'),
  html: () => import('@shikijs/langs-precompiled/html'),
  css: () => import('@shikijs/langs-precompiled/css'),
  json: () => import('@shikijs/langs-precompiled/json'),
  shellscript: () => import('@shikijs/langs-precompiled/shellscript'),
  bash: () => import('@shikijs/langs-precompiled/shellscript'),
  sh: () => import('@shikijs/langs-precompiled/shellscript'),
  shell: () => import('@shikijs/langs-precompiled/shellscript'),
  zsh: () => import('@shikijs/langs-precompiled/shellscript'),
  sql: () => import('@shikijs/langs-precompiled/sql'),
  markdown: () => import('@shikijs/langs-precompiled/markdown'),
  md: () => import('@shikijs/langs-precompiled/markdown'),
  yaml: () => import('@shikijs/langs-precompiled/yaml'),
  yml: () => import('@shikijs/langs-precompiled/yaml'),
  toml: () => import('@shikijs/langs-precompiled/toml'),
  lua: () => import('@shikijs/langs-precompiled/lua'),
  ruby: () => import('@shikijs/langs-precompiled/ruby'),
  rb: () => import('@shikijs/langs-precompiled/ruby'),
  php: () => import('@shikijs/langs-precompiled/php'),
  swift: () => import('@shikijs/langs-precompiled/swift'),
  kotlin: () => import('@shikijs/langs-precompiled/kotlin'),
  kt: () => import('@shikijs/langs-precompiled/kotlin'),
  kts: () => import('@shikijs/langs-precompiled/kotlin'),
  dart: () => import('@shikijs/langs-precompiled/dart'),
  docker: () => import('@shikijs/langs-precompiled/docker'),
  dockerfile: () => import('@shikijs/langs-precompiled/docker'),
  xml: () => import('@shikijs/langs-precompiled/xml'),
} as Record<BundledLanguage, DynamicImportLanguageRegistration>

const bundledThemes = {
  'light-plus': () => import('@shikijs/themes/light-plus'),
  'dark-plus': () => import('@shikijs/themes/dark-plus'),
} as Record<BundledTheme, DynamicImportThemeRegistration>

const createHighlighter = /* @__PURE__ */ createBundledHighlighter<
  BundledLanguage,
  BundledTheme
>({
  langs: bundledLanguages,
  themes: bundledThemes,
  engine: () => createJavaScriptRegexEngine(),
})

const {
  codeToHtml,
  codeToHast,
  codeToTokensBase,
  codeToTokens,
  codeToTokensWithThemes,
  getSingletonHighlighter,
  getLastGrammarState,
} = /* @__PURE__ */ createSingletonShorthands<BundledLanguage, BundledTheme>(
  createHighlighter,
)

export {
  bundledLanguages,
  bundledThemes,
  codeToHast,
  codeToHtml,
  codeToTokens,
  codeToTokensBase,
  codeToTokensWithThemes,
  createHighlighter,
  getLastGrammarState,
  getSingletonHighlighter,
}
export type { BundledLanguage, BundledTheme, Highlighter }
