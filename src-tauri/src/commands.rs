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

#[tauri::command]
pub fn init_database(db: State<'_, Database>) -> Result<(), String> {
    map_err(db.init())
}

#[tauri::command]
pub fn create_note(db: State<'_, Database>, payload: CreateNotePayload) -> Result<Note, String> {
    let id = Uuid::new_v4().to_string();
    let title = payload.title.unwrap_or_else(|| DEFAULT_TITLE.to_string());
    let content = payload.content;
    let now = current_timestamp();

    let conn = db.connection();
    map_err(conn.execute(
        "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&id, &title, &content, &now, &now),
    ))?;

    Ok(Note { id, title, content, created_at: now, updated_at: now })
}

#[tauri::command]
pub fn get_note(db: State<'_, Database>, id: String) -> Result<Option<Note>, String> {
    let conn = db.connection();
    let mut stmt = map_err(
        conn.prepare("SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?1")
    )?;

    map_err(stmt.query_row([&id], row_to_note).optional())
}

#[tauri::command]
pub fn get_all_notes(db: State<'_, Database>) -> Result<Vec<Note>, String> {
    let conn = db.connection();
    let mut stmt = map_err(
        conn.prepare("SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC")
    )?;

    let notes = map_err(stmt.query_map([], row_to_note))?
        .collect::<Result<Vec<_>, _>>();

    map_err(notes)
}

#[tauri::command]
pub fn update_note(db: State<'_, Database>, payload: UpdateNotePayload) -> Result<Note, String> {
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
    get_note(db, payload.id)?.ok_or_else(|| "Note not found".to_string())
}

#[tauri::command]
pub fn delete_note(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.connection();
    map_err(conn.execute("DELETE FROM notes WHERE id = ?1", [&id]))?;
    Ok(())
}

// ===== TAG COMMANDS =====

#[tauri::command]
pub fn create_tag(db: State<'_, Database>, payload: CreateTagPayload) -> Result<Tag, String> {
    let id = Uuid::new_v4().to_string();
    let conn = db.connection();
    map_err(conn.execute(
        "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
        (&id, &payload.name, &payload.color),
    ))?;
    Ok(Tag { id, name: payload.name, color: payload.color })
}

#[tauri::command]
pub fn get_all_tags(db: State<'_, Database>) -> Result<Vec<Tag>, String> {
    let conn = db.connection();
    let mut stmt = map_err(conn.prepare("SELECT id, name, color FROM tags ORDER BY name"))?;
    let tags = map_err(stmt.query_map([], row_to_tag))?
        .collect::<Result<Vec<_>, _>>();
    map_err(tags)
}

#[tauri::command]
pub fn update_tag(db: State<'_, Database>, id: String, name: String, color: String) -> Result<Tag, String> {
    let conn = db.connection();
    map_err(conn.execute(
        "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
        (&name, &color, &id),
    ))?;
    Ok(Tag { id, name, color })
}

#[tauri::command]
pub fn delete_tag(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.connection();
    map_err(conn.execute("DELETE FROM note_tags WHERE tag_id = ?1", [&id]))?;
    map_err(conn.execute("DELETE FROM tags WHERE id = ?1", [&id]))?;
    Ok(())
}

#[tauri::command]
pub fn add_tag_to_note(db: State<'_, Database>, note_id: String, tag_id: String) -> Result<(), String> {
    let conn = db.connection();
    map_err(conn.execute(
        "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
        (&note_id, &tag_id),
    ))?;
    Ok(())
}

#[tauri::command]
pub fn remove_tag_from_note(db: State<'_, Database>, note_id: String, tag_id: String) -> Result<(), String> {
    let conn = db.connection();
    map_err(conn.execute(
        "DELETE FROM note_tags WHERE note_id = ?1 AND tag_id = ?2",
        (&note_id, &tag_id),
    ))?;
    Ok(())
}

#[tauri::command]
pub fn get_tags_for_note(db: State<'_, Database>, note_id: String) -> Result<Vec<Tag>, String> {
    let conn = db.connection();
    let mut stmt = map_err(conn.prepare(
        "SELECT t.id, t.name, t.color FROM tags t
         INNER JOIN note_tags nt ON t.id = nt.tag_id
         WHERE nt.note_id = ?1
         ORDER BY t.name"
    ))?;
    let tags = map_err(stmt.query_map([&note_id], row_to_tag))?
        .collect::<Result<Vec<_>, _>>();
    map_err(tags)
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
pub fn export_all_data(db: State<'_, Database>) -> Result<String, String> {
    let conn = db.connection();

    // Export notes
    let mut stmt = map_err(
        conn.prepare("SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC")
    )?;
    let notes = map_err(stmt.query_map([], row_to_note))?
        .collect::<Result<Vec<_>, _>>();
    let notes = map_err(notes)?;

    // Export tags
    let mut stmt = map_err(conn.prepare("SELECT id, name, color FROM tags ORDER BY name"))?;
    let tags = map_err(stmt.query_map([], row_to_tag))?
        .collect::<Result<Vec<_>, _>>();
    let tags = map_err(tags)?;

    // Export note_tags
    let mut stmt = map_err(conn.prepare("SELECT note_id, tag_id FROM note_tags"))?;
    let note_tags: Vec<(String, String)> = map_err(
        stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
    )?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let export = ExportData {
        version: 1,
        notes,
        tags,
        note_tags,
    };

    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_all_data(db: State<'_, Database>, data: String) -> Result<String, String> {
    let export: ExportData = serde_json::from_str(&data)
        .map_err(|e| format!("Format de fichier invalide: {}", e))?;

    let conn = db.connection();

    let mut notes_imported = 0u32;
    let mut tags_imported = 0u32;

    // Import tags (skip duplicates by name)
    for tag in &export.tags {
        let exists: bool = map_err(
            conn.query_row(
                "SELECT COUNT(*) > 0 FROM tags WHERE id = ?1 OR name = ?2",
                (&tag.id, &tag.name),
                |row| row.get(0),
            )
        )?;
        if !exists {
            map_err(conn.execute(
                "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
                (&tag.id, &tag.name, &tag.color),
            ))?;
            tags_imported += 1;
        }
    }

    // Import notes (skip duplicates by id)
    for note in &export.notes {
        let exists: bool = map_err(
            conn.query_row(
                "SELECT COUNT(*) > 0 FROM notes WHERE id = ?1",
                [&note.id],
                |row| row.get(0),
            )
        )?;
        if !exists {
            map_err(conn.execute(
                "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                (&note.id, &note.title, &note.content, &note.created_at, &note.updated_at),
            ))?;
            notes_imported += 1;
        }
    }

    // Import note_tags (skip duplicates)
    for (note_id, tag_id) in &export.note_tags {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
            (note_id, tag_id),
        );
    }

    Ok(format!("{} notes et {} tags importés", notes_imported, tags_imported))
}
