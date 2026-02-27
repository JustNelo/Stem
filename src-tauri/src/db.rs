use crate::error::StemError;
use rusqlite::{Connection, Result};
use serde_json::Value;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, MutexGuard};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    #[cfg(test)]
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn init(&self) -> Result<()> {
        let conn = self.lock()?;

        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT 'Sans titre',
                content TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;
        // Migration: add is_pinned column if missing (ignore error if already exists)
        let _ = conn.execute(
            "ALTER TABLE notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0",
            [],
        );
        // Migration: add folder_id column if missing
        let _ = conn.execute(
            "ALTER TABLE notes ADD COLUMN folder_id TEXT DEFAULT NULL",
            [],
        );
        // Migration: drop legacy tag tables (ignore errors if they don't exist)
        let _ = conn.execute("DROP TABLE IF EXISTS note_tags", []);
        let _ = conn.execute("DROP TABLE IF EXISTS tags", []);

        // Folders table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id TEXT DEFAULT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Embeddings table for semantic search (RAG)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS note_embeddings (
                note_id TEXT PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE,
                embedding BLOB NOT NULL,
                model TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Chat messages table for persistent AI chat history
        conn.execute(
            "CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                command TEXT,
                msg_type TEXT NOT NULL DEFAULT 'assistant',
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Migration v1: BlockNote JSON → Markdown
        let version: i32 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap_or(0);

        if version < 1 {
            let mut stmt = conn.prepare("SELECT id, content FROM notes WHERE content IS NOT NULL")?;
            let rows: Vec<(String, String)> = stmt
                .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
                .filter_map(|r| r.ok())
                .collect();

            for (id, content) in &rows {
                if let Some(md) = blocknote_to_markdown(content) {
                    let _ = conn.execute(
                        "UPDATE notes SET content = ?1 WHERE id = ?2",
                        [&md, id],
                    );
                }
            }

            conn.execute_batch("PRAGMA user_version = 1")?;
        }

        Ok(())
    }

    fn lock(&self) -> Result<MutexGuard<'_, Connection>> {
        self.conn
            .lock()
            .map_err(|e| rusqlite::Error::InvalidParameterName(format!("Mutex poisoned: {}", e)))
    }

    /// Returns a reference to the connection, panics only if mutex is poisoned.
    /// Prefer `try_connection()` in production paths.
    #[allow(dead_code)]
    pub fn connection(&self) -> MutexGuard<'_, Connection> {
        self.lock().expect("Database mutex poisoned")
    }

    /// Returns a reference to the connection (required for transactions).
    pub fn connection_mut(&self) -> MutexGuard<'_, Connection> {
        self.lock().expect("Database mutex poisoned")
    }

    /// Safe connection accessor that returns a Result instead of panicking.
    pub fn try_connection(&self) -> std::result::Result<MutexGuard<'_, Connection>, StemError> {
        self.lock().map_err(StemError::from)
    }

    /// Runs a blocking closure on a separate thread to avoid blocking the IPC thread.
    pub async fn spawn<F, T>(self, f: F) -> std::result::Result<T, StemError>
    where
        F: FnOnce(Database) -> std::result::Result<T, StemError> + Send + 'static,
        T: Send + 'static,
    {
        tauri::async_runtime::spawn_blocking(move || f(self))
            .await
            .map_err(|e| StemError::Validation(format!("Task failed: {}", e)))?
    }
}

/// Converts BlockNote JSON content to Markdown.
/// Returns `Some(markdown)` if the input is valid BlockNote JSON, `None` otherwise.
fn blocknote_to_markdown(content: &str) -> Option<String> {
    let blocks: Vec<Value> = serde_json::from_str(content).ok()?;
    if blocks.is_empty() {
        return None;
    }
    // Verify it looks like BlockNote (first block should have a "type" field)
    blocks.first()?.get("type")?;

    let mut lines: Vec<String> = Vec::new();

    for block in &blocks {
        let block_type = block.get("type")?.as_str().unwrap_or("paragraph");
        let text = extract_inline_content(block.get("content"));

        match block_type {
            "heading" => {
                let level = block
                    .get("props")
                    .and_then(|p| p.get("level"))
                    .and_then(|l| l.as_u64())
                    .unwrap_or(1);
                let prefix = "#".repeat(level as usize);
                lines.push(format!("{} {}", prefix, text));
            }
            "bulletListItem" => {
                lines.push(format!("- {}", text));
            }
            "numberedListItem" => {
                lines.push(format!("1. {}", text));
            }
            "checkListItem" => {
                let checked = block
                    .get("props")
                    .and_then(|p| p.get("checked"))
                    .and_then(|c| c.as_bool())
                    .unwrap_or(false);
                let marker = if checked { "[x]" } else { "[ ]" };
                lines.push(format!("- {} {}", marker, text));
            }
            "codeBlock" => {
                let lang = block
                    .get("props")
                    .and_then(|p| p.get("language"))
                    .and_then(|l| l.as_str())
                    .unwrap_or("");
                lines.push(format!("```{}", lang));
                lines.push(text);
                lines.push("```".to_string());
            }
            _ => {
                // paragraph, image, etc. — just output the text
                lines.push(text);
            }
        }

        // Process children (nested blocks)
        if let Some(children) = block.get("children") {
            if let Some(arr) = children.as_array() {
                for child in arr {
                    let child_type = child.get("type").and_then(|t| t.as_str()).unwrap_or("paragraph");
                    let child_text = extract_inline_content(child.get("content"));
                    match child_type {
                        "bulletListItem" => lines.push(format!("  - {}", child_text)),
                        "numberedListItem" => lines.push(format!("  1. {}", child_text)),
                        _ => {
                            if !child_text.is_empty() {
                                lines.push(format!("  {}", child_text));
                            }
                        }
                    }
                }
            }
        }
    }

    let result = lines.join("\n").trim().to_string();
    if result.is_empty() { None } else { Some(result) }
}

/// Extracts inline text from a BlockNote "content" array, applying styles.
fn extract_inline_content(content: Option<&Value>) -> String {
    let arr = match content.and_then(|c| c.as_array()) {
        Some(a) => a,
        None => return String::new(),
    };

    let mut result = String::new();
    for item in arr {
        let text = item.get("text").and_then(|t| t.as_str()).unwrap_or("");
        if text.is_empty() {
            continue;
        }

        let styles = item.get("styles");
        let bold = styles.and_then(|s| s.get("bold")).and_then(|b| b.as_bool()).unwrap_or(false);
        let italic = styles.and_then(|s| s.get("italic")).and_then(|b| b.as_bool()).unwrap_or(false);
        let code = styles.and_then(|s| s.get("code")).and_then(|b| b.as_bool()).unwrap_or(false);
        let strike = styles.and_then(|s| s.get("strikethrough")).and_then(|b| b.as_bool()).unwrap_or(false);

        let mut formatted = text.to_string();
        if code {
            formatted = format!("`{}`", formatted);
        } else {
            if bold {
                formatted = format!("**{}**", formatted);
            }
            if italic {
                formatted = format!("*{}*", formatted);
            }
            if strike {
                formatted = format!("~~{}~~", formatted);
            }
        }
        result.push_str(&formatted);
    }
    result
}

#[cfg(test)]
mod migration_tests {
    use super::*;

    #[test]
    fn test_paragraph() {
        let json = r#"[{"type":"paragraph","content":[{"type":"text","text":"Hello world"}],"children":[]}]"#;
        assert_eq!(blocknote_to_markdown(json), Some("Hello world".to_string()));
    }

    #[test]
    fn test_heading() {
        let json = r#"[{"type":"heading","props":{"level":2},"content":[{"type":"text","text":"Title"}],"children":[]}]"#;
        assert_eq!(blocknote_to_markdown(json), Some("## Title".to_string()));
    }

    #[test]
    fn test_bold_italic() {
        let json = r#"[{"type":"paragraph","content":[{"type":"text","text":"bold","styles":{"bold":true}},{"type":"text","text":" and "},{"type":"text","text":"italic","styles":{"italic":true}}],"children":[]}]"#;
        assert_eq!(blocknote_to_markdown(json), Some("**bold** and *italic*".to_string()));
    }

    #[test]
    fn test_bullet_list() {
        let json = r#"[{"type":"bulletListItem","content":[{"type":"text","text":"item one"}],"children":[]},{"type":"bulletListItem","content":[{"type":"text","text":"item two"}],"children":[]}]"#;
        assert_eq!(blocknote_to_markdown(json), Some("- item one\n- item two".to_string()));
    }

    #[test]
    fn test_code_block() {
        let json = r#"[{"type":"codeBlock","props":{"language":"rust"},"content":[{"type":"text","text":"fn main() {}"}],"children":[]}]"#;
        assert_eq!(blocknote_to_markdown(json), Some("```rust\nfn main() {}\n```".to_string()));
    }

    #[test]
    fn test_not_blocknote_returns_none() {
        assert_eq!(blocknote_to_markdown("just plain text"), None);
        assert_eq!(blocknote_to_markdown("[]"), None);
        assert_eq!(blocknote_to_markdown("[1,2,3]"), None);
    }

    #[test]
    fn test_migration_runs_once() {
        let db = Database::in_memory().expect("Failed to create in-memory DB");
        db.init().expect("First init should succeed");

        // Insert a BlockNote JSON note
        let conn = db.connection();
        conn.execute(
            "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES ('m1', 'Test', ?1, 1000, 1000)",
            [r#"[{"type":"paragraph","content":[{"type":"text","text":"Hello"}],"children":[]}]"#],
        ).unwrap();

        // Reset user_version to 0 to simulate pre-migration state
        conn.execute_batch("PRAGMA user_version = 0").unwrap();
        drop(conn);

        // Re-init triggers migration
        db.init().expect("Second init should succeed");

        let conn = db.connection();
        let content: String = conn.query_row(
            "SELECT content FROM notes WHERE id = 'm1'", [], |r| r.get(0)
        ).unwrap();
        assert_eq!(content, "Hello");

        let version: i32 = conn.query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap();
        assert_eq!(version, 1);
    }
}
