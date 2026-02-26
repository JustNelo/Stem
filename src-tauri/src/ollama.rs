use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;

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

// ===== Chat API (supports tool use / function calling) =====

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    tools: Vec<Value>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaChatOptions>,
}

#[derive(Serialize)]
struct OllamaChatOptions {
    temperature: f32,
}

#[derive(Deserialize, Serialize)]
pub struct ToolFunction {
    pub name: String,
    pub arguments: Value,
}

#[derive(Deserialize, Serialize)]
pub struct ToolCall {
    pub function: ToolFunction,
}

#[derive(Deserialize)]
struct OllamaChatMessage {
    pub content: String,
    pub tool_calls: Option<Vec<ToolCall>>,
}

#[derive(Deserialize)]
struct OllamaChatResponse {
    pub message: OllamaChatMessage,
}

#[derive(Serialize)]
pub struct ChatResponse {
    pub content: String,
    pub tool_calls: Option<Vec<ToolCall>>,
}

#[tauri::command]
pub async fn ollama_chat(
    messages: Vec<ChatMessage>,
    tools: Vec<Value>,
    model: Option<String>,
    ollama_url: Option<String>,
) -> Result<ChatResponse, String> {
    let model = model.unwrap_or_else(|| "mistral".to_string());
    let base_url = ollama_url.unwrap_or_else(|| "http://localhost:11434".to_string());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let has_tools = !tools.is_empty();
    let request = OllamaChatRequest {
        model,
        messages,
        tools,
        stream: false,
        options: if has_tools {
            Some(OllamaChatOptions { temperature: 0.1 })
        } else {
            None
        },
    };

    let response = client
        .post(format!("{}/api/chat", base_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Erreur connexion Ollama: {}. Assurez-vous qu'Ollama est lancé.", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama a retourné une erreur: {}", response.status()));
    }

    let chat_response: OllamaChatResponse = response
        .json()
        .await
        .map_err(|e| format!("Erreur parsing réponse: {}", e))?;

    Ok(ChatResponse {
        content: chat_response.message.content.trim().to_string(),
        tool_calls: chat_response.message.tool_calls,
    })
}

#[tauri::command]
pub async fn summarize_note(
    content: String,
    model: Option<String>,
    ollama_url: Option<String>,
) -> Result<String, String> {
    if content.trim().is_empty() {
        return Ok(String::new());
    }

    let model = model.unwrap_or_else(|| "mistral".to_string());
    let base_url = ollama_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

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
        .map_err(|e| format!("Erreur connexion Ollama: {}. Assurez-vous qu'Ollama est lancé.", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama a retourné une erreur: {}", response.status()));
    }

    let ollama_response: OllamaResponse = response
        .json()
        .await
        .map_err(|e| format!("Erreur parsing réponse: {}", e))?;

    Ok(ollama_response.response.trim().to_string())
}

#[derive(Serialize, Clone)]
pub struct StreamChunk {
    pub token: String,
    pub done: bool,
}

#[derive(Deserialize)]
struct OllamaStreamChunk {
    message: OllamaStreamMessage,
    done: bool,
}

#[derive(Deserialize)]
struct OllamaStreamMessage {
    content: String,
}

#[tauri::command]
pub async fn ollama_chat_stream(
    messages: Vec<ChatMessage>,
    model: Option<String>,
    ollama_url: Option<String>,
    channel: tauri::ipc::Channel<StreamChunk>,
) -> Result<(), String> {
    let model = model.unwrap_or_else(|| "mistral".to_string());
    let base_url = ollama_url.unwrap_or_else(|| "http://localhost:11434".to_string());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;

    let request = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true,
        "options": { "temperature": 0.7 }
    });

    let response = client
        .post(format!("{}/api/chat", base_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Erreur connexion Ollama: {}. Assurez-vous qu'Ollama est lancé.", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama a retourné une erreur: {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("Erreur streaming: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        // Process complete newline-delimited JSON objects from the buffer
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Ok(parsed) = serde_json::from_str::<OllamaStreamChunk>(&line) {
                channel
                    .send(StreamChunk {
                        token: parsed.message.content.clone(),
                        done: parsed.done,
                    })
                    .map_err(|e| format!("Erreur channel: {}", e))?;

                if parsed.done {
                    return Ok(());
                }
            }
        }
    }

    // Send final done signal in case Ollama didn't send it
    let _ = channel.send(StreamChunk {
        token: String::new(),
        done: true,
    });

    Ok(())
}

#[tauri::command]
pub async fn check_ollama_connection(ollama_url: Option<String>) -> Result<bool, String> {
    let base_url = ollama_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    match client.get(&base_url).send().await {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn get_ollama_models(ollama_url: Option<String>) -> Result<Vec<String>, String> {
    let base_url = ollama_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(format!("{}/api/tags", base_url))
        .send()
        .await
        .map_err(|e| format!("Erreur connexion Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama a retourné une erreur: {}", response.status()));
    }

    let models_response: OllamaModelsResponse = response
        .json()
        .await
        .map_err(|e| format!("Erreur parsing réponse: {}", e))?;

    Ok(models_response.models.into_iter().map(|m| m.name).collect())
}
