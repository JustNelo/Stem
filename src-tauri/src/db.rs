use rusqlite::{Connection, Result};
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
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL
            )",
            [],
        )?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS note_tags (
                note_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY (note_id, tag_id),
                FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            )",
            [],
        )?;
        Ok(())
    }

    fn lock(&self) -> Result<MutexGuard<'_, Connection>> {
        self.conn
            .lock()
            .map_err(|e| rusqlite::Error::InvalidParameterName(format!("Mutex poisoned: {}", e)))
    }

    /// Returns an immutable reference to the connection (for reads and simple writes).
    pub fn connection(&self) -> MutexGuard<'_, Connection> {
        self.lock().expect("Database mutex poisoned")
    }

    /// Returns a mutable reference to the connection (required for transactions).
    pub fn connection_mut(&self) -> MutexGuard<'_, Connection> {
        self.lock().expect("Database mutex poisoned")
    }
}
