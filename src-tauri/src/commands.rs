use crate::db::Database;
use crate::error::StemError;
use rusqlite::{OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use uuid::Uuid;

const DEFAULT_TITLE: &str = "Sans titre";

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_pinned: bool,
    pub folder_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub position: i32,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateFolderPayload {
    pub name: String,
    pub parent_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RenameFolderPayload {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateNotePayload {
    pub title: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNotePayload {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
}

fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn row_to_note(row: &Row) -> Result<Note, rusqlite::Error> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
        is_pinned: row.get::<_, i32>(5).unwrap_or(0) != 0,
        folder_id: row.get(6)?,
    })
}

fn row_to_folder(row: &Row) -> Result<Folder, rusqlite::Error> {
    Ok(Folder {
        id: row.get(0)?,
        name: row.get(1)?,
        parent_id: row.get(2)?,
        position: row.get(3)?,
        created_at: row.get(4)?,
    })
}

/// Private sync helper — used internally by update_note & toggle_pin_note.
fn get_note_sync(db: &Database, id: &str) -> Result<Option<Note>, StemError> {
    let conn = db.try_connection()?;
    let mut stmt = conn.prepare("SELECT id, title, content, created_at, updated_at, is_pinned, folder_id FROM notes WHERE id = ?1")?;
    Ok(stmt.query_row([id], row_to_note).optional()?)
}

#[tauri::command]
pub fn init_database(db: State<'_, Database>) -> Result<(), StemError> {
    db.init().map_err(StemError::from)
}

#[tauri::command]
pub async fn create_note(db: State<'_, Database>, payload: CreateNotePayload) -> Result<Note, StemError> {
    db.inner().clone().spawn(move |db| {
        let id = Uuid::new_v4().to_string();
        let title = payload.title.unwrap_or_else(|| DEFAULT_TITLE.to_string());
        let content = payload.content;
        let now = current_timestamp();
        let conn = db.try_connection()?;
        conn.execute(
            "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            (&id, &title, &content, &now, &now),
        )?;
        Ok(Note { id, title, content, created_at: now, updated_at: now, is_pinned: false, folder_id: None })
    }).await
}

#[tauri::command]
pub async fn get_note(db: State<'_, Database>, id: String) -> Result<Option<Note>, StemError> {
    db.inner().clone().spawn(move |db| get_note_sync(&db, &id)).await
}

#[tauri::command]
pub async fn get_all_notes(db: State<'_, Database>) -> Result<Vec<Note>, StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        let mut stmt = conn.prepare("SELECT id, title, content, created_at, updated_at, is_pinned, folder_id FROM notes ORDER BY is_pinned DESC, updated_at DESC")?;
        let notes = stmt.query_map([], row_to_note)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(notes)
    }).await
}

#[tauri::command]
pub async fn update_note(db: State<'_, Database>, payload: UpdateNotePayload) -> Result<Note, StemError> {
    db.inner().clone().spawn(move |db| {
        let now = current_timestamp();
        let conn = db.try_connection()?;
        if let Some(title) = &payload.title {
            conn.execute(
                "UPDATE notes SET title = ?1, updated_at = ?2 WHERE id = ?3",
                (title, &now, &payload.id),
            )?;
        }
        if let Some(content) = &payload.content {
            conn.execute(
                "UPDATE notes SET content = ?1, updated_at = ?2 WHERE id = ?3",
                (content, &now, &payload.id),
            )?;
        }
        drop(conn);
        get_note_sync(&db, &payload.id)?.ok_or_else(|| StemError::NotFound(format!("Note {}", payload.id)))
    }).await
}

#[tauri::command]
pub async fn delete_note(db: State<'_, Database>, id: String) -> Result<(), StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        conn.execute("DELETE FROM notes WHERE id = ?1", [&id])?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn toggle_pin_note(db: State<'_, Database>, id: String) -> Result<Note, StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        conn.execute(
            "UPDATE notes SET is_pinned = CASE WHEN is_pinned = 0 THEN 1 ELSE 0 END WHERE id = ?1",
            [&id],
        )?;
        drop(conn);
        get_note_sync(&db, &id)?.ok_or_else(|| StemError::NotFound(format!("Note {}", id)))
    }).await
}

// ===== EXPORT / IMPORT =====

#[derive(Serialize, Deserialize)]
pub struct ExportData {
    pub version: u32,
    pub notes: Vec<Note>,
    #[serde(default)]
    pub folders: Vec<Folder>,
}

#[tauri::command]
pub async fn export_all_data(db: State<'_, Database>) -> Result<String, StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;

        let mut stmt = conn.prepare("SELECT id, title, content, created_at, updated_at, is_pinned, folder_id FROM notes ORDER BY updated_at DESC")?;
        let notes = stmt.query_map([], row_to_note)?
            .collect::<Result<Vec<_>, _>>()?;

        let mut folder_stmt = conn.prepare("SELECT id, name, parent_id, position, created_at FROM folders ORDER BY position ASC")?;
        let folders = folder_stmt.query_map([], row_to_folder)?
            .collect::<Result<Vec<_>, _>>()?;

        let export = ExportData { version: 1, notes, folders };
        serde_json::to_string_pretty(&export).map_err(|e| StemError::Validation(e.to_string()))
    }).await
}

const MAX_IMPORT_SIZE: usize = 10 * 1024 * 1024; // 10 MB

#[tauri::command]
pub async fn import_all_data(db: State<'_, Database>, data: String) -> Result<String, StemError> {
    if data.len() > MAX_IMPORT_SIZE {
        return Err(StemError::Validation(format!("Fichier trop volumineux ({:.1} MB, max {} MB)", data.len() as f64 / 1_048_576.0, MAX_IMPORT_SIZE / 1_048_576)));
    }

    db.inner().clone().spawn(move |db| {
        let export: ExportData = serde_json::from_str(&data)
            .map_err(|e| StemError::Validation(format!("Format de fichier invalide: {}", e)))?;

        let mut conn = db.connection_mut();
        let tx = conn.transaction()?;

        let mut notes_imported = 0u32;
        let mut folders_imported = 0u32;

        for folder in &export.folders {
            let exists: bool = tx
                .query_row("SELECT COUNT(*) > 0 FROM folders WHERE id = ?1", [&folder.id], |row| row.get(0))?;
            if !exists {
                tx.execute(
                    "INSERT INTO folders (id, name, parent_id, position, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                    (&folder.id, &folder.name, &folder.parent_id, &folder.position, &folder.created_at),
                )?;
                folders_imported += 1;
            }
        }

        for note in &export.notes {
            let exists: bool = tx
                .query_row("SELECT COUNT(*) > 0 FROM notes WHERE id = ?1", [&note.id], |row| row.get(0))?;
            if !exists {
                tx.execute(
                    "INSERT INTO notes (id, title, content, created_at, updated_at, is_pinned, folder_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    (&note.id, &note.title, &note.content, &note.created_at, &note.updated_at, &(note.is_pinned as i32), &note.folder_id),
                )?;
                notes_imported += 1;
            }
        }

        tx.commit()?;
        Ok(format!("{} notes, {} dossiers importés", notes_imported, folders_imported))
    }).await
}

// ===== FOLDERS =====

#[tauri::command]
pub async fn get_all_folders(db: State<'_, Database>) -> Result<Vec<Folder>, StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        let mut stmt = conn.prepare("SELECT id, name, parent_id, position, created_at FROM folders ORDER BY position ASC, created_at ASC")?;
        let folders = stmt.query_map([], row_to_folder)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(folders)
    }).await
}

#[tauri::command]
pub async fn create_folder(db: State<'_, Database>, payload: CreateFolderPayload) -> Result<Folder, StemError> {
    db.inner().clone().spawn(move |db| {
        let id = Uuid::new_v4().to_string();
        let now = current_timestamp();
        let conn = db.try_connection()?;

        let position: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(position), -1) + 1 FROM folders WHERE parent_id IS ?1",
                [&payload.parent_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        conn.execute(
            "INSERT INTO folders (id, name, parent_id, position, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            (&id, &payload.name, &payload.parent_id, &position, &now),
        )?;

        Ok(Folder { id, name: payload.name, parent_id: payload.parent_id, position, created_at: now })
    }).await
}

#[tauri::command]
pub async fn rename_folder(db: State<'_, Database>, payload: RenameFolderPayload) -> Result<Folder, StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        conn.execute(
            "UPDATE folders SET name = ?1 WHERE id = ?2",
            (&payload.name, &payload.id),
        )?;
        drop(conn);

        let conn = db.try_connection()?;
        let mut stmt = conn.prepare("SELECT id, name, parent_id, position, created_at FROM folders WHERE id = ?1")?;
        stmt.query_row([&payload.id], row_to_folder)
            .map_err(|_| StemError::NotFound(format!("Folder {}", payload.id)))
    }).await
}

#[tauri::command]
pub async fn delete_folder(db: State<'_, Database>, id: String) -> Result<(), StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        // Move notes in this folder back to root
        conn.execute(
            "UPDATE notes SET folder_id = NULL WHERE folder_id = ?1",
            [&id],
        )?;
        // Move child folders to root
        conn.execute(
            "UPDATE folders SET parent_id = NULL WHERE parent_id = ?1",
            [&id],
        )?;
        // Delete the folder
        conn.execute("DELETE FROM folders WHERE id = ?1", [&id])?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn move_note_to_folder(db: State<'_, Database>, note_id: String, folder_id: Option<String>) -> Result<Note, StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        conn.execute(
            "UPDATE notes SET folder_id = ?1, updated_at = ?2 WHERE id = ?3",
            (&folder_id, &current_timestamp(), &note_id),
        )?;
        drop(conn);
        get_note_sync(&db, &note_id)?.ok_or_else(|| StemError::NotFound(format!("Note {}", note_id)))
    }).await
}

#[tauri::command]
pub async fn move_folder(db: State<'_, Database>, id: String, parent_id: Option<String>) -> Result<Folder, StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        conn.execute(
            "UPDATE folders SET parent_id = ?1 WHERE id = ?2",
            (&parent_id, &id),
        )?;
        drop(conn);

        let conn = db.try_connection()?;
        let mut stmt = conn.prepare("SELECT id, name, parent_id, position, created_at FROM folders WHERE id = ?1")?;
        stmt.query_row([&id], row_to_folder)
            .map_err(|_| StemError::NotFound(format!("Folder {}", id)))
    }).await
}

// ===== CHAT MESSAGES =====

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub command: Option<String>,
    pub msg_type: String,
    pub created_at: i64,
}

fn row_to_chat_message(row: &rusqlite::Row) -> Result<ChatMessage, rusqlite::Error> {
    Ok(ChatMessage {
        id: row.get(0)?,
        role: row.get(1)?,
        content: row.get(2)?,
        command: row.get(3)?,
        msg_type: row.get(4)?,
        created_at: row.get(5)?,
    })
}

#[tauri::command]
pub async fn get_chat_messages(db: State<'_, Database>) -> Result<Vec<ChatMessage>, StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, role, content, command, msg_type, created_at FROM chat_messages ORDER BY created_at ASC"
        )?;
        let msgs = stmt.query_map([], row_to_chat_message)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(msgs)
    }).await
}

#[tauri::command]
pub async fn save_chat_message(db: State<'_, Database>, message: ChatMessage) -> Result<(), StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        conn.execute(
            "INSERT OR REPLACE INTO chat_messages (id, role, content, command, msg_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![message.id, message.role, message.content, message.command, message.msg_type, message.created_at],
        )?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn clear_chat_messages(db: State<'_, Database>) -> Result<(), StemError> {
    db.inner().clone().spawn(move |db| {
        let conn = db.try_connection()?;
        conn.execute("DELETE FROM chat_messages", [])?;
        Ok(())
    }).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    fn setup_db() -> Database {
        let db = Database::in_memory().expect("Failed to create in-memory DB");
        db.init().expect("Failed to init DB");
        db
    }

    fn insert_note(db: &Database, id: &str, title: &str) {
        let conn = db.connection();
        conn.execute(
            "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, ?2, NULL, 1000, 1000)",
            [id, title],
        ).unwrap();
    }

    #[test]
    fn test_db_init_creates_tables() {
        let db = setup_db();
        let conn = db.connection();
        let _: i32 = conn.query_row("SELECT COUNT(*) FROM notes", [], |r| r.get(0)).unwrap();
    }

    #[test]
    fn test_insert_and_read_note() {
        let db = setup_db();
        insert_note(&db, "n1", "Test Note");

        let conn = db.connection();
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at, is_pinned, folder_id FROM notes WHERE id = ?1"
        ).unwrap();
        let note = stmt.query_row(["n1"], row_to_note).unwrap();

        assert_eq!(note.id, "n1");
        assert_eq!(note.title, "Test Note");
        assert!(note.content.is_none());
        assert!(!note.is_pinned);
        assert!(note.folder_id.is_none());
    }

    #[test]
    fn test_delete_note() {
        let db = setup_db();
        insert_note(&db, "n1", "To Delete");

        let conn = db.connection();
        conn.execute("DELETE FROM notes WHERE id = ?1", ["n1"]).unwrap();

        let count: i32 = conn.query_row("SELECT COUNT(*) FROM notes", [], |r| r.get(0)).unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_update_note_title() {
        let db = setup_db();
        insert_note(&db, "n1", "Old Title");

        let conn = db.connection();
        conn.execute(
            "UPDATE notes SET title = ?1, updated_at = 2000 WHERE id = ?2",
            ["New Title", "n1"],
        ).unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at, is_pinned, folder_id FROM notes WHERE id = ?1"
        ).unwrap();
        let note = stmt.query_row(["n1"], row_to_note).unwrap();

        assert_eq!(note.title, "New Title");
        assert_eq!(note.updated_at, 2000);
    }

    #[test]
    fn test_toggle_pin() {
        let db = setup_db();
        insert_note(&db, "n1", "Pin Test");

        let conn = db.connection();
        conn.execute(
            "UPDATE notes SET is_pinned = CASE WHEN is_pinned = 0 THEN 1 ELSE 0 END WHERE id = ?1",
            ["n1"],
        ).unwrap();

        let pinned: bool = conn.query_row(
            "SELECT is_pinned FROM notes WHERE id = ?1", ["n1"], |r| r.get(0)
        ).unwrap();
        assert!(pinned);

        // Toggle back
        conn.execute(
            "UPDATE notes SET is_pinned = CASE WHEN is_pinned = 0 THEN 1 ELSE 0 END WHERE id = ?1",
            ["n1"],
        ).unwrap();
        let pinned: bool = conn.query_row(
            "SELECT is_pinned FROM notes WHERE id = ?1", ["n1"], |r| r.get(0)
        ).unwrap();
        assert!(!pinned);
    }

    #[test]
    fn test_notes_ordered_by_pinned_first() {
        let db = setup_db();
        insert_note(&db, "n1", "Unpinned");
        insert_note(&db, "n2", "Pinned");

        let conn = db.connection();
        conn.execute("UPDATE notes SET is_pinned = 1 WHERE id = 'n2'", []).unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at, is_pinned, folder_id FROM notes ORDER BY is_pinned DESC, updated_at DESC"
        ).unwrap();
        let notes: Vec<Note> = stmt.query_map([], row_to_note).unwrap()
            .collect::<Result<Vec<_>, _>>().unwrap();

        assert_eq!(notes[0].id, "n2"); // Pinned first
        assert_eq!(notes[1].id, "n1");
    }
}
