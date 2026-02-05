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

#[tauri::command]
pub fn seed_notes(db: State<'_, Database>) -> Result<Vec<Note>, String> {
    let sample_notes = vec![
        ("Idées de projet", "Créer une app de prise de notes minimaliste avec IA"),
        ("Réunion lundi", "Points à discuter: budget, timeline, ressources"),
        ("Lecture du jour", "Finir le chapitre sur les design patterns"),
        ("Recette pasta", "Pâtes carbonara: guanciale, pecorino, œufs, poivre"),
        ("Code review", "Vérifier les PR en attente sur le repo principal"),
        ("Objectifs Q1", "Lancer la v2, améliorer la rétention de 20%"),
        ("Notes de cours", "Introduction aux algorithmes de tri"),
        ("Brainstorm UI", "Essayer un thème sombre, animations subtiles"),
        ("Liste courses", "Pain, lait, œufs, fromage, légumes"),
        ("Méditation", "Pratiquer 10 minutes chaque matin"),
        ("Podcast intéressant", "Écouter l'épisode sur la productivité"),
        ("Bug à corriger", "Le scroll ne fonctionne pas sur mobile"),
        ("Idée article", "Comment optimiser son workflow de développement"),
        ("Anniversaires", "Marie: 15 mars, Paul: 22 juin"),
        ("Film à voir", "Inception, Interstellar, The Matrix"),
        ("Exercice quotidien", "30 minutes de marche + étirements"),
        ("Vocabulaire anglais", "Serendipity, ephemeral, ubiquitous"),
        ("Config VSCode", "Extensions: Prettier, ESLint, GitLens"),
        ("Backup important", "Sauvegarder les photos du voyage"),
        ("Musique focus", "Lo-fi hip hop, musique classique"),
        ("Apprentissage Rust", "Ownership, borrowing, lifetimes"),
        ("Design system", "Couleurs, typographie, espacements"),
        ("API à explorer", "OpenAI, Anthropic, Mistral"),
        ("Routine matinale", "Réveil 6h, méditation, sport, douche"),
        ("Citations inspirantes", "Le succès est un voyage, pas une destination"),
        ("Refactoring", "Simplifier le composant Layout"),
        ("Tests unitaires", "Couvrir les fonctions critiques à 80%"),
        ("Documentation", "Mettre à jour le README avec les nouvelles features"),
        ("Performance", "Optimiser le temps de chargement initial"),
        ("Feedback utilisateur", "Améliorer l'UX de la recherche"),
    ];

    let conn = db.connection();
    let mut created_notes = Vec::new();
    let base_time = current_timestamp();

    for (i, (title, content)) in sample_notes.iter().enumerate() {
        let id = Uuid::new_v4().to_string();
        let timestamp = base_time - (i as i64 * 3600); // 1 hour apart
        let json_content = format!(
            r#"[{{"type":"paragraph","content":[{{"type":"text","text":"{}"}}]}}]"#,
            content
        );

        map_err(conn.execute(
            "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            (&id, title, &json_content, &timestamp, &timestamp),
        ))?;

        created_notes.push(Note {
            id,
            title: title.to_string(),
            content: Some(json_content),
            created_at: timestamp,
            updated_at: timestamp,
        });
    }

    Ok(created_notes)
}
