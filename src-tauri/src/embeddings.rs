use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

// ===== Ollama Embedding API types =====

#[derive(Serialize)]
struct OllamaEmbedRequest {
    model: String,
    input: String,
}

#[derive(Deserialize)]
struct OllamaEmbedResponse {
    embeddings: Vec<Vec<f32>>,
}

// ===== Semantic search result =====

#[derive(Debug, Serialize, Clone)]
pub struct SemanticResult {
    pub note_id: String,
    pub title: String,
    pub score: f32,
}

// ===== Helpers =====

fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs() as i64
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot / (norm_a * norm_b)
}

fn embedding_to_bytes(embedding: &[f32]) -> Vec<u8> {
    embedding.iter().flat_map(|f| f.to_le_bytes()).collect()
}

fn bytes_to_embedding(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect()
}

/// Runs a blocking closure on a separate thread.
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

// ===== Tauri Commands =====

/// Generate an embedding vector from text via Ollama and store it for the given note.
#[tauri::command]
pub async fn generate_embedding(
    db: State<'_, Database>,
    note_id: String,
    text: String,
    model: Option<String>,
    ollama_url: Option<String>,
) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    let model = model.unwrap_or_else(|| "nomic-embed-text".to_string());
    let base_url = ollama_url.unwrap_or_else(|| "http://localhost:11434".to_string());

    // Call Ollama embedding API
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let request = OllamaEmbedRequest {
        model: model.clone(),
        input: text,
    };

    let response = client
        .post(format!("{}/api/embed", base_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Embedding request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama embedding error: {}", response.status()));
    }

    let embed_response: OllamaEmbedResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse embedding response: {}", e))?;

    let embedding = embed_response
        .embeddings
        .into_iter()
        .next()
        .ok_or_else(|| "No embedding returned".to_string())?;

    let embedding_bytes = embedding_to_bytes(&embedding);
    let now = current_timestamp();

    // Store in DB
    spawn(&db, move |db| {
        let conn = db.connection();
        conn.execute(
            "INSERT OR REPLACE INTO note_embeddings (note_id, embedding, model, updated_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![note_id, embedding_bytes, model, now],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
}

/// Search for notes semantically similar to the given query text.
/// Returns top `limit` results sorted by cosine similarity.
#[tauri::command]
pub async fn search_similar_notes(
    db: State<'_, Database>,
    query: String,
    model: Option<String>,
    ollama_url: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<SemanticResult>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    let model = model.unwrap_or_else(|| "nomic-embed-text".to_string());
    let base_url = ollama_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let limit = limit.unwrap_or(5);

    // Generate query embedding
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let request = OllamaEmbedRequest {
        model,
        input: query,
    };

    let response = client
        .post(format!("{}/api/embed", base_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Query embedding failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama embedding error: {}", response.status()));
    }

    let embed_response: OllamaEmbedResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse embedding response: {}", e))?;

    let query_embedding = embed_response
        .embeddings
        .into_iter()
        .next()
        .ok_or_else(|| "No embedding returned".to_string())?;

    // Compare against all stored embeddings
    spawn(&db, move |db| {
        let conn = db.connection();
        let mut stmt = conn
            .prepare(
                "SELECT ne.note_id, ne.embedding, n.title
                 FROM note_embeddings ne
                 JOIN notes n ON n.id = ne.note_id
                 ORDER BY ne.updated_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let mut results: Vec<SemanticResult> = stmt
            .query_map([], |row| {
                let note_id: String = row.get(0)?;
                let embedding_bytes: Vec<u8> = row.get(1)?;
                let title: String = row.get(2)?;
                Ok((note_id, embedding_bytes, title))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .map(|(note_id, embedding_bytes, title)| {
                let stored_embedding = bytes_to_embedding(&embedding_bytes);
                let score = cosine_similarity(&query_embedding, &stored_embedding);
                SemanticResult {
                    note_id,
                    title,
                    score,
                }
            })
            .filter(|r| r.score > 0.3) // Minimum similarity threshold
            .collect();

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit);

        Ok(results)
    })
    .await
}

/// Delete the embedding for a given note (called when note is deleted).
#[tauri::command]
pub async fn delete_embedding(db: State<'_, Database>, note_id: String) -> Result<(), String> {
    spawn(&db, move |db| {
        let conn = db.connection();
        conn.execute("DELETE FROM note_embeddings WHERE note_id = ?1", [&note_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity_identical() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert!((cosine_similarity(&a, &b) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        assert!(cosine_similarity(&a, &b).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_opposite() {
        let a = vec![1.0, 0.0];
        let b = vec![-1.0, 0.0];
        assert!((cosine_similarity(&a, &b) + 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_embedding_roundtrip() {
        let original = vec![0.1, 0.2, -0.5, 1.0, 0.0];
        let bytes = embedding_to_bytes(&original);
        let recovered = bytes_to_embedding(&bytes);
        assert_eq!(original.len(), recovered.len());
        for (a, b) in original.iter().zip(recovered.iter()) {
            assert!((a - b).abs() < 1e-6);
        }
    }
}
