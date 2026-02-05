mod commands;
mod db;

use commands::{create_note, delete_note, get_all_notes, get_note, init_database, update_note};
use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
            
            let db_path = app_data_dir.join("stem.db");
            let database = Database::new(db_path).expect("Failed to create database");
            database.init().expect("Failed to initialize database");
            
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_database,
            create_note,
            get_note,
            get_all_notes,
            update_note,
            delete_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
