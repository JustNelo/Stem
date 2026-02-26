<div align="center">

# 🌱 STEM

**A secure, performant desktop note-taking app with local AI**

Built with [Tauri 2](https://tauri.app/) · [React 19](https://react.dev/) · [Rust](https://www.rust-lang.org/) · [Ollama](https://ollama.com/)

[![Release](https://img.shields.io/github/v/release/JustNelo/Stem?style=flat-square)](https://github.com/JustNelo/Stem/releases)
[![License](https://img.shields.io/github/license/JustNelo/Stem?style=flat-square)](LICENSE)

</div>

---

STEM is a privacy-first note-taking application that runs entirely on your machine. Your notes never leave your device — AI features are powered by local Ollama models, and data is stored in a local SQLite database.

## Features

### Editor
- **Block-based editor** — Rich text editing powered by [BlockNote](https://www.blocknoteeditor.org/) with Markdown support
- **Auto-save** — Notes are saved automatically as you type
- **Word count** — Real-time word counter in the status bar
- **Pin notes** — Keep important notes at the top of your sidebar

### Organization
- **Folders & sub-folders** — Organize notes into a nested folder tree
- **Drag & drop** — Move notes between folders or reorder them freely
- **Search & filter** — Instant keyword filtering in the sidebar
- **Command palette** (`Ctrl+K`) — Quick note switching with fuzzy search (powered by [Fuse.js](https://www.fusejs.io/))

### AI (Local via Ollama)

All AI features run **100% locally** through [Ollama](https://ollama.com/) — no API keys, no cloud, no data leaks.

- **AI Sidebar** (`Ctrl+J`) — Conversational chat with full context of your current note
- **Tool use (MCP)** — The AI can list, read, create, update, delete and search your notes autonomously
- **Slash commands** in the editor:
  - `/expliquer` — Didactic explanation of selected content
  - `/resume` — Executive summary (3-5 key points)
  - `/refactorer` — Clean up and optimize code
  - `/taches` — Extract implicit tasks as a checklist
  - `/idees` — Brainstorm creative ideas
- **Sidebar commands** — `/resume`, `/traduire`, `/corriger`, `/expliquer`, `/idees`
- **Semantic search** — Find notes by meaning, not just keywords (via local embeddings with `nomic-embed-text`)
- **Review mode** — AI generates self-assessment questions (comprehension, application, analysis) from your notes

### Sync & Backup
- **Git sync** — Version your notes as `.md` files in a Git repository
- **Auto-sync** — Automatic pull on launch, commit & push every 5 minutes
- **Export / Import** — Full data export (notes + folders) as JSON, with 10 MB import size limit
- **Auto-updater** — In-app update notifications and one-click install

### Appearance
- **6 themes** — Light, Dark, Sepia, Nord, Sakura, Ocean
- **3 fonts** — Satoshi, Inter, JetBrains Mono
- **3 font sizes** — Small, Medium, Large
- **Minimal UI** — Distraction-free writing with collapsible sidebars

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+K` | Command palette |
| `Ctrl+B` | Toggle notes sidebar |
| `Ctrl+J` | Toggle AI sidebar |
| `Ctrl+,` | Settings |
| `Escape` | Close palette / Deselect note |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Desktop framework** | Tauri 2 (Rust) |
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS 4, Radix UI, Framer Motion |
| **State** | Zustand |
| **Editor** | BlockNote |
| **Database** | SQLite (via rusqlite) |
| **AI** | Ollama (local), Vercel AI SDK |
| **Search** | Fuse.js (keyword) + cosine similarity (semantic) |
| **Git** | Native git commands via Rust `std::process::Command` |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)
- [Rust](https://rustup.rs/) (stable)
- [Ollama](https://ollama.com/) (for AI features)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/JustNelo/Stem.git
cd Stem

# Install frontend dependencies
bun install

# Run in development mode
bun tauri dev
```

### AI Setup

1. Install [Ollama](https://ollama.com/)
2. Pull a model for chat (e.g. `ollama pull qwen2.5:32b`)
3. Pull the embedding model: `ollama pull nomic-embed-text`
4. Configure the model name and URL in **Settings → IA**

### Build for Production

```bash
bun tauri build
```

Installers will be generated in `src-tauri/target/release/bundle/`.

## Project Structure

```
stem/
├── src/                    # React frontend
│   ├── components/         # UI components (Editor, AISidebar, Settings, ...)
│   ├── hooks/              # React hooks (useAutoSave, useGitSync, useAutoUpdate, ...)
│   ├── lib/                # Utilities, AI tools, slash commands
│   ├── services/           # Backend service adapters (db, ai, git, embeddings)
│   ├── store/              # Zustand stores (notes, folders, settings, app, toast)
│   └── types/              # TypeScript types and schemas
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands.rs     # Tauri IPC commands
│   │   ├── db.rs           # SQLite database management
│   │   ├── embeddings.rs   # Vector embeddings & semantic search
│   │   ├── git.rs          # Git operations
│   │   ├── ollama.rs       # Ollama API integration
│   │   └── lib.rs          # App entry point & plugin registration
│   └── Cargo.toml
└── .github/workflows/      # CI/CD release pipeline
```

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## License

Copyright (c) 2026 Léon Gallet. This is a "Source Available" project. You are welcome to explore the code and run it for personal use. However, redistribution, sub-licensing, or any commercial exploitation of the code or the application is strictly forbidden.

---

<div align="center">
  <sub>Built with care by <a href="https://github.com/JustNelo">JustNelo</a></sub>
</div>
