mod commands;
mod db;
mod embeddings;
mod ollama;

use commands::{
    create_note, delete_note, get_all_notes, get_note, init_database, update_note, toggle_pin_note,
    export_all_data, import_all_data,
    get_all_folders, create_folder, rename_folder, delete_folder, move_note_to_folder, move_folder,
};
use db::Database;
use embeddings::{generate_embedding, search_similar_notes, delete_embedding};
use ollama::{summarize_note, check_ollama_connection, get_ollama_models, ollama_chat};
use tauri::{Manager, Emitter};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
            
            let db_path = app_data_dir.join("stem.db");
            let database = Database::new(db_path).expect("Failed to create database");
            database.init().expect("Failed to initialize database");
            
            app.manage(database);

            // Register global shortcut Ctrl+Shift+N for quick capture
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyN);
            let app_handle = app.handle().clone();
            
            // Unregister if already registered (from previous session)
            let _ = app.global_shortcut().unregister(shortcut);
            
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
                use tauri::WebviewWindowBuilder;
                use tauri::WebviewUrl;
                
                // Check if quick-capture window already exists
                if let Some(window) = app_handle.get_webview_window("quick-capture") {
                    let _ = window.show();
                    let _ = window.set_focus();
                } else {
                    // Create new quick-capture window
                    if let Ok(window) = WebviewWindowBuilder::new(
                        &app_handle,
                        "quick-capture",
                        WebviewUrl::App("index.html".into())
                    )
                    .title("Quick Capture")
                    .inner_size(420.0, 280.0)
                    .resizable(false)
                    .decorations(false)
                    .always_on_top(true)
                    .center()
                    .skip_taskbar(true)
                    .build() {
                        // Listen for window close to refresh main window
                        let main_handle = app_handle.clone();
                        window.on_window_event(move |event| {
                            if let tauri::WindowEvent::Destroyed = event {
                                if let Some(main_window) = main_handle.get_webview_window("main") {
                                    let _ = main_window.emit("refresh-notes", ());
                                }
                            }
                        });
                    }
                }
            })?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_database,
            create_note,
            get_note,
            get_all_notes,
            update_note,
            delete_note,
            toggle_pin_note,
            summarize_note,
            check_ollama_connection,
            get_ollama_models,
            ollama_chat,
            export_all_data,
            import_all_data,
            generate_embedding,
            search_similar_notes,
            delete_embedding,
            get_all_folders,
            create_folder,
            rename_folder,
            delete_folder,
            move_note_to_folder,
            move_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
