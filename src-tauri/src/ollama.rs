use crate::error::StemError;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    system: String,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
}

#[derive(Deserialize)]
struct OllamaModelInfo {
    name: String,
}

#[derive(Deserialize)]
struct OllamaModelsResponse {
    models: Vec<OllamaModelInfo>,
}

// --- /api/chat types ---

#[derive(Serialize, Deserialize, Clone)]
pub(crate) struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaChatOptions>,
}

#[derive(Serialize)]
struct OllamaChatOptions {
    temperature: f32,
    num_ctx: u32,
}

#[derive(Deserialize)]
struct OllamaChatResponse {
    message: ChatMessage,
}

#[tauri::command]
pub async fn ollama_chat(
    client: State<'_, reqwest::Client>,
    messages: Vec<ChatMessage>,
    model: String,
    ollama_url: String,
) -> Result<String, StemError> {
    let base_url = if ollama_url.is_empty() {
        "http://localhost:11434".to_string()
    } else {
        ollama_url
    };

    let request = OllamaChatRequest {
        model,
        messages,
        stream: false,
        options: Some(OllamaChatOptions {
            temperature: 0.4,
            num_ctx: 32768,
        }),
    };

    let response = client
        .post(format!("{}/api/chat", base_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| StemError::Ollama(format!("Impossible de joindre Ollama. Vérifiez qu'il est lancé. ({})", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(StemError::Ollama(format!("Ollama a retourné une erreur {} : {}", status, body)));
    }

    let chat_response: OllamaChatResponse = response
        .json()
        .await
        .map_err(|e| StemError::Ollama(format!("Erreur parsing réponse Ollama: {}", e)))?;

    Ok(chat_response.message.content.trim().to_string())
}


#[tauri::command]
pub async fn summarize_note(
    client: State<'_, reqwest::Client>,
    content: String,
    model: Option<String>,
    ollama_url: Option<String>,
) -> Result<String, StemError> {
    if content.trim().is_empty() {
        return Ok(String::new());
    }

    let model = model.unwrap_or_else(|| "mistral".to_string());
    let base_url = ollama_url.unwrap_or_else(|| "http://localhost:11434".to_string());

    let request = OllamaRequest {
        model,
        prompt: content,
        system: "Tu es un assistant intelligent. Réponds TOUJOURS en français, sauf si l'utilisateur demande explicitement une autre langue. Utilise un style clair, structuré et pédagogique.".to_string(),
        stream: false,
    };

    let response = client
        .post(format!("{}/api/generate", base_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| StemError::Ollama(format!("Erreur connexion Ollama: {}. Assurez-vous qu'Ollama est lancé.", e)))?;

    if !response.status().is_success() {
        return Err(StemError::Ollama(format!("Ollama a retourné une erreur: {}", response.status())));
    }

    let ollama_response: OllamaResponse = response
        .json()
        .await
        .map_err(|e| StemError::Ollama(format!("Erreur parsing réponse: {}", e)))?;

    Ok(ollama_response.response.trim().to_string())
}


#[tauri::command]
pub async fn check_ollama_connection(
    client: State<'_, reqwest::Client>,
    ollama_url: Option<String>,
) -> Result<bool, StemError> {
    let base_url = ollama_url.unwrap_or_else(|| "http://localhost:11434".to_string());

    match client.get(&base_url).send().await {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn get_ollama_models(
    client: State<'_, reqwest::Client>,
    ollama_url: Option<String>,
) -> Result<Vec<String>, StemError> {
    let base_url = ollama_url.unwrap_or_else(|| "http://localhost:11434".to_string());

    let response = client
        .get(format!("{}/api/tags", base_url))
        .send()
        .await
        .map_err(|e| StemError::Ollama(format!("Erreur connexion Ollama: {}", e)))?;

    if !response.status().is_success() {
        return Err(StemError::Ollama(format!("Ollama a retourné une erreur: {}", response.status())));
    }

    let models_response: OllamaModelsResponse = response
        .json()
        .await
        .map_err(|e| StemError::Ollama(format!("Erreur parsing réponse: {}", e)))?;

    Ok(models_response.models.into_iter().map(|m| m.name).collect())
}
