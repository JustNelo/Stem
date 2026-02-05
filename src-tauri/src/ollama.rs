use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
}

#[tauri::command]
pub async fn summarize_note(content: String) -> Result<String, String> {
    if content.trim().is_empty() {
        return Ok(String::new());
    }

    let client = reqwest::Client::new();
    
    let prompt = format!(
        "Résume ce texte en français en 2-3 phrases concises. Ne fais pas de commentaires, donne uniquement le résumé:\n\n{}",
        content
    );

    let request = OllamaRequest {
        model: "mistral".to_string(),
        prompt,
        stream: false,
    };

    let response = client
        .post("http://localhost:11434/api/generate")
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
