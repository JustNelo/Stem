use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitStatus {
    pub initialized: bool,
    pub has_remote: bool,
    pub clean: bool,
    pub branch: String,
    pub last_error: Option<String>,
}

fn run_git(repo_path: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}. Is git installed?", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!("git {} failed: {}", args.join(" "), stderr))
    }
}

fn ensure_repo(repo_path: &Path) -> Result<(), String> {
    if !repo_path.exists() {
        std::fs::create_dir_all(repo_path)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let git_dir = repo_path.join(".git");
    if !git_dir.exists() {
        run_git(repo_path, &["init"])?;
    }
    Ok(())
}

/// Export all notes as individual .md files into the repo directory.
fn export_notes_as_md(db: &Database, repo_path: &Path) -> Result<usize, String> {
    let notes_dir = repo_path.join("notes");
    std::fs::create_dir_all(&notes_dir)
        .map_err(|e| format!("Failed to create notes dir: {}", e))?;

    let conn = db.connection();
    let mut stmt = conn
        .prepare("SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let notes: Vec<(String, String, Option<String>)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let count = notes.len();

    for (id, title, content) in &notes {
        let safe_title = sanitize_filename(title);
        let filename = format!("{}-{}.md", safe_title, &id[..8]);
        let filepath = notes_dir.join(&filename);

        let md_content = format!(
            "# {}\n\n{}",
            title,
            extract_plain_from_blocknote(content.as_deref())
        );

        std::fs::write(&filepath, md_content)
            .map_err(|e| format!("Failed to write {}: {}", filename, e))?;
    }

    Ok(count)
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' { c } else { '_' })
        .collect::<String>()
        .trim()
        .to_string()
        .chars()
        .take(50)
        .collect()
}

/// Very basic plain-text extraction from BlockNote JSON content.
fn extract_plain_from_blocknote(content: Option<&str>) -> String {
    let Some(content) = content else {
        return String::new();
    };

    // Try to parse as JSON array of blocks
    let Ok(blocks) = serde_json::from_str::<Vec<serde_json::Value>>(content) else {
        return content.to_string();
    };

    let mut lines = Vec::new();
    for block in &blocks {
        if let Some(content_arr) = block.get("content").and_then(|c| c.as_array()) {
            let text: String = content_arr
                .iter()
                .filter_map(|item| item.get("text").and_then(|t| t.as_str()))
                .collect::<Vec<_>>()
                .join("");
            if !text.is_empty() {
                lines.push(text);
            }
        }
    }
    lines.join("\n\n")
}

// ===== Tauri Commands =====

#[tauri::command]
pub async fn git_status(repo_path: String) -> Result<GitStatus, String> {
    let path = PathBuf::from(&repo_path);

    if !path.join(".git").exists() {
        return Ok(GitStatus {
            initialized: false,
            has_remote: false,
            clean: true,
            branch: String::new(),
            last_error: None,
        });
    }

    let branch = run_git(&path, &["rev-parse", "--abbrev-ref", "HEAD"]).unwrap_or_default();
    let has_remote = run_git(&path, &["remote"]).map(|r| !r.is_empty()).unwrap_or(false);

    let clean = run_git(&path, &["status", "--porcelain"])
        .map(|output| output.is_empty())
        .unwrap_or(true);

    Ok(GitStatus {
        initialized: true,
        has_remote,
        clean,
        branch,
        last_error: None,
    })
}

#[tauri::command]
pub async fn git_init(repo_path: String) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    ensure_repo(&path)?;
    Ok("Repository initialized".to_string())
}

#[tauri::command]
pub async fn git_pull(repo_path: String) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    if !path.join(".git").exists() {
        return Err("Not a git repository".to_string());
    }

    // Check if remote exists before pulling
    let remote = run_git(&path, &["remote"])?;
    if remote.is_empty() {
        return Ok("No remote configured, skipping pull".to_string());
    }

    run_git(&path, &["pull", "--rebase", "--autostash"])
}

#[tauri::command]
pub async fn git_sync(
    db: State<'_, Database>,
    repo_path: String,
) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    ensure_repo(&path)?;

    // 1. Export notes as .md files
    let db_clone = db.inner().clone();
    let path_clone = path.clone();
    let count = tauri::async_runtime::spawn_blocking(move || {
        export_notes_as_md(&db_clone, &path_clone)
    })
    .await
    .map_err(|e| format!("Export task failed: {}", e))??;

    // 2. Git add + commit
    run_git(&path, &["add", "."])?;

    // Check if there are changes to commit
    let status = run_git(&path, &["status", "--porcelain"])?;
    if status.is_empty() {
        return Ok(format!("{} notes exportées, rien à synchroniser", count));
    }

    let msg = format!("Auto-sync: {} notes", count);
    run_git(&path, &["commit", "-m", &msg])?;

    // 3. Push if remote exists
    let remote = run_git(&path, &["remote"]).unwrap_or_default();
    if !remote.is_empty() {
        match run_git(&path, &["push"]) {
            Ok(_) => Ok(format!("{} notes synchronisées et poussées", count)),
            Err(e) => Ok(format!("{} notes commitées localement (push échoué: {})", count, e)),
        }
    } else {
        Ok(format!("{} notes commitées localement", count))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("Hello World!"), "Hello World_");
        assert_eq!(sanitize_filename("test/path"), "test_path");
        assert_eq!(sanitize_filename("café résumé"), "café résumé");
    }

    #[test]
    fn test_extract_plain_from_blocknote_null() {
        assert_eq!(extract_plain_from_blocknote(None), "");
    }

    #[test]
    fn test_extract_plain_from_blocknote_json() {
        let json = r#"[{"type":"paragraph","content":[{"type":"text","text":"Hello world"}]}]"#;
        assert_eq!(extract_plain_from_blocknote(Some(json)), "Hello world");
    }

    #[test]
    fn test_extract_plain_from_blocknote_plain() {
        assert_eq!(extract_plain_from_blocknote(Some("plain text")), "plain text");
    }
}
