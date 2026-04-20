#![deny(clippy::all)]

//! Context Bridge — AI-aware project context manager.
//!
//! This crate contains the Tauri application logic including database access,
//! IPC commands, file watching, and context output formatting.

mod commands;
pub mod db;
pub mod engine;
pub mod errors;
pub mod output;
pub mod state;

use crate::db::queries;
use engine::watcher::WatcherSupervisor;
use state::AppState;
use std::fs;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
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

    tracing::info!("Starting Context Bridge");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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

            let watcher = WatcherSupervisor::new(app.handle().clone());

            app.manage(AppState::new(storage, watcher));

            // Build tray menu
            let quit = MenuItem::with_id(app, "quit", "Quit Context Bridge", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Context Bridge")
                .on_menu_event(|app, event| {
                    if event.id() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Show main window on startup
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_shadow(true);
                let _ = window.show();
                let _ = window.set_focus();
            }

            // Start watchers for all projects that already exist in the DB.
            // Without this, file watching only works for projects added *during*
            // the current session; restarts would silently stop auto-sync.
            {
                let (existing_projects, watcher_state) = {
                    let state = app.state::<AppState>();
                    let existing_projects = {
                        let storage = state
                            .storage
                            .lock()
                            .map_err(|_| "storage lock poisoned")?;
                        match queries::list_projects(&storage.conn) {
                            Ok(projects) => projects,
                            Err(error) => {
                                tracing::warn!(
                                    error = %error,
                                    "Failed to load projects while resuming watchers"
                                );
                                Vec::new()
                            }
                        }
                    };

                    (existing_projects, state.watcher.clone())
                };

                if let Ok(mut watcher) = watcher_state.lock() {
                    for project in existing_projects {
                        let path = std::path::PathBuf::from(&project.root_path);
                        if path.is_dir() {
                            if let Err(e) = watcher.watch_project(project.id.clone(), path) {
                                tracing::warn!(
                                    project_id = %project.id,
                                    error = %e,
                                    "Failed to resume file watcher for existing project"
                                );
                            }
                        }
                    }
                };
            }

            tracing::info!("Context Bridge ready");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::projects::list_projects,
            commands::projects::add_project,
            commands::projects::remove_project,
            commands::projects::get_project_context,
            commands::projects::scan_project,
            commands::projects::refresh_project_context,
            commands::projects::partial_refresh_project,
            commands::context::search_context,
            commands::context::add_note,
            commands::context::delete_note,
            commands::context::update_note,
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::projects::sync_to_tool,
            commands::projects::sync_all_tools,
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
