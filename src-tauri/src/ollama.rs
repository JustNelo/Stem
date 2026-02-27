use crate::error::StemError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

#[derive(Deserialize)]
struct OllamaModelInfo {
    name: String,
}

#[derive(Deserialize)]
struct OllamaModelsResponse {
    models: Vec<OllamaModelInfo>,
}

// --- /api/chat types (native tool calling) ---

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct ChatMessage {
    pub role: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct ToolCall {
    pub function: ToolCallFunction,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct ToolCallFunction {
    pub name: String,
    pub arguments: Value,
}

#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaChatOptions>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<Value>>,
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

/// Response returned to the frontend — either text content or structured tool calls.
#[derive(Serialize, Debug)]
pub struct ChatResult {
    pub content: Option<String>,
    pub tool_calls: Option<Vec<ChatResultToolCall>>,
}

#[derive(Serialize, Debug)]
pub struct ChatResultToolCall {
    pub name: String,
    pub arguments: Value,
}

#[tauri::command]
pub async fn ollama_chat(
    client: State<'_, reqwest::Client>,
    messages: Vec<ChatMessage>,
    model: String,
    ollama_url: String,
    tools: Option<Vec<Value>>,
) -> Result<ChatResult, StemError> {
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
        tools,
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

    let msg = chat_response.message;

    // If the model returned tool_calls, forward them structured
    if let Some(ref calls) = msg.tool_calls {
        if !calls.is_empty() {
            let result_calls: Vec<ChatResultToolCall> = calls
                .iter()
                .map(|tc| ChatResultToolCall {
                    name: tc.function.name.clone(),
                    arguments: tc.function.arguments.clone(),
                })
                .collect();
            return Ok(ChatResult {
                content: msg.content.clone(),
                tool_calls: Some(result_calls),
            });
        }
    }

    Ok(ChatResult {
        content: Some(msg.content.unwrap_or_default().trim().to_string()),
        tool_calls: None,
    })
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
