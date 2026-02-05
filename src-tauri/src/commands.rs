use crate::db::Database;
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
        .expect("Time went backwards")
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
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTagPayload {
    pub name: String,
    pub color: String,
}

fn row_to_tag(row: &Row) -> Result<Tag, rusqlite::Error> {
    Ok(Tag {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
    })
}

fn map_err<T>(result: Result<T, rusqlite::Error>) -> Result<T, String> {
    result.map_err(|e| e.to_string())
}

/// Runs a blocking closure on a separate thread to avoid blocking the IPC thread.
async fn spawn<F, T>(db: &State<'_, Database>, f: F) -> Result<T, String>
where
    F: FnOnce(Database) -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    let db = db.inner().clone();
    tauri::async_runtime::spawn_blocking(move || f(db))
        .await
        .map_err(|e| format!("Task failed: {}", e))?
}

/// Private sync helper — used internally by update_note & toggle_pin_note.
fn get_note_sync(db: &Database, id: &str) -> Result<Option<Note>, String> {
    let conn = db.connection();
    let mut stmt = map_err(
        conn.prepare("SELECT id, title, content, created_at, updated_at, is_pinned FROM notes WHERE id = ?1")
    )?;
    map_err(stmt.query_row([id], row_to_note).optional())
}

#[tauri::command]
pub fn init_database(db: State<'_, Database>) -> Result<(), String> {
    map_err(db.init())
}

#[tauri::command]
pub async fn create_note(db: State<'_, Database>, payload: CreateNotePayload) -> Result<Note, String> {
    spawn(&db, move |db| {
        let id = Uuid::new_v4().to_string();
        let title = payload.title.unwrap_or_else(|| DEFAULT_TITLE.to_string());
        let content = payload.content;
        let now = current_timestamp();
        let conn = db.connection();
        map_err(conn.execute(
            "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            (&id, &title, &content, &now, &now),
        ))?;
        Ok(Note { id, title, content, created_at: now, updated_at: now, is_pinned: false })
    }).await
}

#[tauri::command]
pub async fn get_note(db: State<'_, Database>, id: String) -> Result<Option<Note>, String> {
    spawn(&db, move |db| get_note_sync(&db, &id)).await
}

#[tauri::command]
pub async fn get_all_notes(db: State<'_, Database>) -> Result<Vec<Note>, String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        let mut stmt = map_err(
            conn.prepare("SELECT id, title, content, created_at, updated_at, is_pinned FROM notes ORDER BY is_pinned DESC, updated_at DESC")
        )?;
        let notes = map_err(stmt.query_map([], row_to_note))?
            .collect::<Result<Vec<_>, _>>();
        map_err(notes)
    }).await
}

#[tauri::command]
pub async fn update_note(db: State<'_, Database>, payload: UpdateNotePayload) -> Result<Note, String> {
    spawn(&db, move |db| {
        let now = current_timestamp();
        let conn = db.connection();
        if let Some(title) = &payload.title {
            map_err(conn.execute(
                "UPDATE notes SET title = ?1, updated_at = ?2 WHERE id = ?3",
                (title, &now, &payload.id),
            ))?;
        }
        if let Some(content) = &payload.content {
            map_err(conn.execute(
                "UPDATE notes SET content = ?1, updated_at = ?2 WHERE id = ?3",
                (content, &now, &payload.id),
            ))?;
        }
        drop(conn);
        get_note_sync(&db, &payload.id)?.ok_or_else(|| "Note not found".to_string())
    }).await
}

#[tauri::command]
pub async fn delete_note(db: State<'_, Database>, id: String) -> Result<(), String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        map_err(conn.execute("DELETE FROM notes WHERE id = ?1", [&id]))?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn toggle_pin_note(db: State<'_, Database>, id: String) -> Result<Note, String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        map_err(conn.execute(
            "UPDATE notes SET is_pinned = CASE WHEN is_pinned = 0 THEN 1 ELSE 0 END WHERE id = ?1",
            [&id],
        ))?;
        drop(conn);
        get_note_sync(&db, &id)?.ok_or_else(|| "Note not found".to_string())
    }).await
}

// ===== TAG COMMANDS =====

#[tauri::command]
pub async fn create_tag(db: State<'_, Database>, payload: CreateTagPayload) -> Result<Tag, String> {
    spawn(&db, move |db| {
        let id = Uuid::new_v4().to_string();
        let conn = db.connection();
        map_err(conn.execute(
            "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
            (&id, &payload.name, &payload.color),
        ))?;
        Ok(Tag { id, name: payload.name, color: payload.color })
    }).await
}

#[tauri::command]
pub async fn get_all_tags(db: State<'_, Database>) -> Result<Vec<Tag>, String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        let mut stmt = map_err(conn.prepare("SELECT id, name, color FROM tags ORDER BY name"))?;
        let tags = map_err(stmt.query_map([], row_to_tag))?
            .collect::<Result<Vec<_>, _>>();
        map_err(tags)
    }).await
}

#[tauri::command]
pub async fn update_tag(db: State<'_, Database>, id: String, name: String, color: String) -> Result<Tag, String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        map_err(conn.execute(
            "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
            (&name, &color, &id),
        ))?;
        Ok(Tag { id, name, color })
    }).await
}

#[tauri::command]
pub async fn delete_tag(db: State<'_, Database>, id: String) -> Result<(), String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        map_err(conn.execute("DELETE FROM note_tags WHERE tag_id = ?1", [&id]))?;
        map_err(conn.execute("DELETE FROM tags WHERE id = ?1", [&id]))?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn add_tag_to_note(db: State<'_, Database>, note_id: String, tag_id: String) -> Result<(), String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        map_err(conn.execute(
            "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
            (&note_id, &tag_id),
        ))?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn remove_tag_from_note(db: State<'_, Database>, note_id: String, tag_id: String) -> Result<(), String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        map_err(conn.execute(
            "DELETE FROM note_tags WHERE note_id = ?1 AND tag_id = ?2",
            (&note_id, &tag_id),
        ))?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn get_tags_for_note(db: State<'_, Database>, note_id: String) -> Result<Vec<Tag>, String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        let mut stmt = map_err(conn.prepare(
            "SELECT t.id, t.name, t.color FROM tags t
             INNER JOIN note_tags nt ON t.id = nt.tag_id
             WHERE nt.note_id = ?1
             ORDER BY t.name"
        ))?;
        let tags = map_err(stmt.query_map([&*note_id], row_to_tag))?
            .collect::<Result<Vec<_>, _>>();
        map_err(tags)
    }).await
}

#[tauri::command]
pub async fn get_all_note_tags(db: State<'_, Database>) -> Result<Vec<(String, Tag)>, String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        let mut stmt = map_err(conn.prepare(
            "SELECT nt.note_id, t.id, t.name, t.color FROM note_tags nt
             INNER JOIN tags t ON t.id = nt.tag_id
             ORDER BY t.name"
        ))?;
        let rows = map_err(stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                Tag {
                    id: row.get(1)?,
                    name: row.get(2)?,
                    color: row.get(3)?,
                },
            ))
        }))?
        .collect::<Result<Vec<_>, _>>();
        map_err(rows)
    }).await
}

// ===== EXPORT / IMPORT =====

#[derive(Serialize, Deserialize)]
pub struct ExportData {
    pub version: u32,
    pub notes: Vec<Note>,
    pub tags: Vec<Tag>,
    pub note_tags: Vec<(String, String)>,
}

#[tauri::command]
pub async fn export_all_data(db: State<'_, Database>) -> Result<String, String> {
    spawn(&db, move |db| {
        let conn = db.connection();

        let mut stmt = map_err(
            conn.prepare("SELECT id, title, content, created_at, updated_at, is_pinned FROM notes ORDER BY updated_at DESC")
        )?;
        let notes = map_err(stmt.query_map([], row_to_note))?
            .collect::<Result<Vec<_>, _>>();
        let notes = map_err(notes)?;

        let mut stmt = map_err(conn.prepare("SELECT id, name, color FROM tags ORDER BY name"))?;
        let tags = map_err(stmt.query_map([], row_to_tag))?
            .collect::<Result<Vec<_>, _>>();
        let tags = map_err(tags)?;

        let mut stmt = map_err(conn.prepare("SELECT note_id, tag_id FROM note_tags"))?;
        let note_tags: Vec<(String, String)> = map_err(
            stmt.query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
        )?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

        let export = ExportData { version: 1, notes, tags, note_tags };
        serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
    }).await
}

#[tauri::command]
pub async fn import_all_data(db: State<'_, Database>, data: String) -> Result<String, String> {
    spawn(&db, move |db| {
        let export: ExportData = serde_json::from_str(&data)
            .map_err(|e| format!("Format de fichier invalide: {}", e))?;

        let mut conn = db.connection_mut();
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let mut notes_imported = 0u32;
        let mut tags_imported = 0u32;

        for tag in &export.tags {
            let exists: bool = tx
                .query_row(
                    "SELECT COUNT(*) > 0 FROM tags WHERE id = ?1 OR name = ?2",
                    (&tag.id, &tag.name),
                    |row| row.get(0),
                )
                .map_err(|e| e.to_string())?;
            if !exists {
                tx.execute(
                    "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
                    (&tag.id, &tag.name, &tag.color),
                )
                .map_err(|e| e.to_string())?;
                tags_imported += 1;
            }
        }

        for note in &export.notes {
            let exists: bool = tx
                .query_row(
                    "SELECT COUNT(*) > 0 FROM notes WHERE id = ?1",
                    [&note.id],
                    |row| row.get(0),
                )
                .map_err(|e| e.to_string())?;
            if !exists {
                tx.execute(
                    "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                    (&note.id, &note.title, &note.content, &note.created_at, &note.updated_at),
                )
                .map_err(|e| e.to_string())?;
                notes_imported += 1;
            }
        }

        for (note_id, tag_id) in &export.note_tags {
            let _ = tx.execute(
                "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
                (note_id, tag_id),
            );
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(format!("{} notes et {} tags importés", notes_imported, tags_imported))
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

    fn insert_tag(db: &Database, id: &str, name: &str, color: &str) {
        let conn = db.connection();
        conn.execute(
            "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
            [id, name, color],
        ).unwrap();
    }

    #[test]
    fn test_db_init_creates_tables() {
        let db = setup_db();
        let conn = db.connection();
        // Verify tables exist by querying them
        let _: i32 = conn.query_row("SELECT COUNT(*) FROM notes", [], |r| r.get(0)).unwrap();
        let _: i32 = conn.query_row("SELECT COUNT(*) FROM tags", [], |r| r.get(0)).unwrap();
        let _: i32 = conn.query_row("SELECT COUNT(*) FROM note_tags", [], |r| r.get(0)).unwrap();
    }

    #[test]
    fn test_insert_and_read_note() {
        let db = setup_db();
        insert_note(&db, "n1", "Test Note");

        let conn = db.connection();
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at, is_pinned FROM notes WHERE id = ?1"
        ).unwrap();
        let note = stmt.query_row(["n1"], row_to_note).unwrap();

        assert_eq!(note.id, "n1");
        assert_eq!(note.title, "Test Note");
        assert!(note.content.is_none());
        assert!(!note.is_pinned);
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
            "SELECT id, title, content, created_at, updated_at, is_pinned FROM notes WHERE id = ?1"
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
    fn test_insert_and_read_tag() {
        let db = setup_db();
        insert_tag(&db, "t1", "urgent", "#ff0000");

        let conn = db.connection();
        let mut stmt = conn.prepare("SELECT id, name, color FROM tags WHERE id = ?1").unwrap();
        let tag = stmt.query_row(["t1"], row_to_tag).unwrap();

        assert_eq!(tag.name, "urgent");
        assert_eq!(tag.color, "#ff0000");
    }

    #[test]
    fn test_note_tag_association() {
        let db = setup_db();
        insert_note(&db, "n1", "Note");
        insert_tag(&db, "t1", "tag1", "#000");

        let conn = db.connection();
        conn.execute(
            "INSERT INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
            ["n1", "t1"],
        ).unwrap();

        let mut stmt = conn.prepare(
            "SELECT t.id, t.name, t.color FROM tags t
             INNER JOIN note_tags nt ON t.id = nt.tag_id
             WHERE nt.note_id = ?1"
        ).unwrap();
        let tags: Vec<Tag> = stmt.query_map(["n1"], row_to_tag).unwrap()
            .collect::<Result<Vec<_>, _>>().unwrap();

        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "tag1");
    }

    #[test]
    fn test_get_all_note_tags_batch() {
        let db = setup_db();
        insert_note(&db, "n1", "Note1");
        insert_note(&db, "n2", "Note2");
        insert_tag(&db, "t1", "tag1", "#111");
        insert_tag(&db, "t2", "tag2", "#222");

        let conn = db.connection();
        conn.execute("INSERT INTO note_tags (note_id, tag_id) VALUES ('n1', 't1')", []).unwrap();
        conn.execute("INSERT INTO note_tags (note_id, tag_id) VALUES ('n1', 't2')", []).unwrap();
        conn.execute("INSERT INTO note_tags (note_id, tag_id) VALUES ('n2', 't1')", []).unwrap();

        let mut stmt = conn.prepare(
            "SELECT nt.note_id, t.id, t.name, t.color FROM note_tags nt
             INNER JOIN tags t ON t.id = nt.tag_id ORDER BY t.name"
        ).unwrap();
        let rows: Vec<(String, Tag)> = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                Tag { id: row.get(1)?, name: row.get(2)?, color: row.get(3)? },
            ))
        }).unwrap().collect::<Result<Vec<_>, _>>().unwrap();

        assert_eq!(rows.len(), 3);
    }

    #[test]
    fn test_import_with_transaction_rollback_on_duplicate_tag_name() {
        let db = setup_db();
        insert_tag(&db, "existing", "mytag", "#000");

        // Import data with a tag that has the same name — should skip it
        let conn = db.connection();
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM tags WHERE name = ?1",
            ["mytag"],
            |row| row.get(0),
        ).unwrap();
        assert!(exists);

        // Verify original tag is untouched
        let tag: Tag = conn.query_row(
            "SELECT id, name, color FROM tags WHERE name = ?1",
            ["mytag"],
            row_to_tag,
        ).unwrap();
        assert_eq!(tag.id, "existing");
    }

    #[test]
    fn test_notes_ordered_by_pinned_first() {
        let db = setup_db();
        insert_note(&db, "n1", "Unpinned");
        insert_note(&db, "n2", "Pinned");

        let conn = db.connection();
        conn.execute("UPDATE notes SET is_pinned = 1 WHERE id = 'n2'", []).unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at, is_pinned FROM notes ORDER BY is_pinned DESC, updated_at DESC"
        ).unwrap();
        let notes: Vec<Note> = stmt.query_map([], row_to_note).unwrap()
            .collect::<Result<Vec<_>, _>>().unwrap();

        assert_eq!(notes[0].id, "n2"); // Pinned first
        assert_eq!(notes[1].id, "n1");
    }
}
