use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum StemError {
    #[error("Database error: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("{0}")]
    Ollama(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("{0}")]
    Validation(String),
}

impl Serialize for StemError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
