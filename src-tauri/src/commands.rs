use crate::db::Database;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use uuid::Uuid;

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
        .unwrap()
        .as_secs() as i64
}

#[tauri::command]
pub fn init_database(db: State<'_, Database>) -> Result<(), String> {
    db.init().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_note(db: State<'_, Database>, payload: CreateNotePayload) -> Result<Note, String> {
    let id = Uuid::new_v4().to_string();
    let title = payload.title.unwrap_or_else(|| "Sans titre".to_string());
    let content = payload.content;
    let now = current_timestamp();

    let conn = db.connection();
    conn.execute(
        "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&id, &title, &content, &now, &now),
    )
    .map_err(|e| e.to_string())?;

    Ok(Note {
        id,
        title,
        content,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_note(db: State<'_, Database>, id: String) -> Result<Option<Note>, String> {
    let conn = db.connection();
    let mut stmt = conn
        .prepare("SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let note = stmt
        .query_row([&id], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(note)
}

#[tauri::command]
pub fn get_all_notes(db: State<'_, Database>) -> Result<Vec<Note>, String> {
    let conn = db.connection();
    let mut stmt = conn
        .prepare("SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let notes = stmt
        .query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(notes)
}

#[tauri::command]
pub fn update_note(db: State<'_, Database>, payload: UpdateNotePayload) -> Result<Note, String> {
    let now = current_timestamp();
    let conn = db.connection();

    if let Some(title) = &payload.title {
        conn.execute(
            "UPDATE notes SET title = ?1, updated_at = ?2 WHERE id = ?3",
            (title, &now, &payload.id),
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(content) = &payload.content {
        conn.execute(
            "UPDATE notes SET content = ?1, updated_at = ?2 WHERE id = ?3",
            (content, &now, &payload.id),
        )
        .map_err(|e| e.to_string())?;
    }

    drop(conn);
    get_note(db, payload.id)?.ok_or_else(|| "Note not found".to_string())
}

#[tauri::command]
pub fn delete_note(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.connection();
    conn.execute("DELETE FROM notes WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
