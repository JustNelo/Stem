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
        // Migration: drop legacy tag tables (ignore errors if they don't exist)
        let _ = conn.execute("DROP TABLE IF EXISTS note_tags", []);
        let _ = conn.execute("DROP TABLE IF EXISTS tags", []);
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
