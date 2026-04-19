#![deny(clippy::all)]

//! ContextBridge — AI-aware project context manager.
//!
//! This crate contains the Tauri application logic including database access,
//! IPC commands, file watching, and context output formatting.

mod commands;
#[allow(unused)] // Phase 2: wired into commands
mod core;
pub mod db;
pub mod errors;
#[allow(unused)] // Phase 3: wired into commands
mod output;
pub mod state;

use state::AppState;
use std::fs;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use tracing_subscriber::EnvFilter;

/// Run the Tauri application.
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("contextbridge=info")),
        )
        .init();

    tracing::info!("Starting ContextBridge");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let data_dir = dirs_data_dir()?;
            fs::create_dir_all(&data_dir)?;

            // Restrict data directory to owner-only access
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let perms = std::fs::Permissions::from_mode(0o700);
                std::fs::set_permissions(&data_dir, perms)?;
            }

            let db_path = data_dir.join("data.db");
            let storage = db::StorageManager::new(&db_path)
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

            app.manage(AppState::new(storage));

            // Build tray menu
            let quit = MenuItem::with_id(app, "quit", "Quit ContextBridge", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("ContextBridge")
                .on_menu_event(|app, event| {
                    if event.id() == "quit" {
                        app.exit(0);
                    }
                })
                .build(app)?;

            tracing::info!("ContextBridge ready (tray-only mode)");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::projects::list_projects,
            commands::projects::add_project,
            commands::projects::remove_project,
            commands::projects::get_project_context,
            commands::context::search_context,
            commands::settings::get_setting,
            commands::settings::set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Return the ContextBridge data directory (`~/.contextbridge`).
fn dirs_data_dir() -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    Ok(dirs::home_dir()
        .ok_or("cannot determine home directory")?
        .join(".contextbridge"))
}
