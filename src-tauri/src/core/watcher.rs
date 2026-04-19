//! File system watcher supervisor.
//!
//! Watches project directories for changes and emits Tauri events on
//! modifications. Each project gets its own dedicated OS thread running a
//! [`notify::RecommendedWatcher`] so that blocking I/O never stalls the
//! async Tauri runtime.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::Arc;
use std::time::{Duration, Instant};

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

use crate::errors::AppError;

/// Returns `true` if any component of `path` is in the ignore list.
fn is_ignored(path: &Path) -> bool {
    path.components().any(|c| {
        let s = c.as_os_str().to_str().unwrap_or("");
        super::IGNORED_DIRS.contains(&s)
    })
}

// ── Event type mapping ───────────────────────────────────────────────

/// Map a `notify` event kind to our simplified event type string.
fn event_type_str(kind: &notify::EventKind) -> &'static str {
    use notify::EventKind::*;
    match kind {
        Create(_) => "created",
        Remove(_) => "removed",
        Modify(_) | Access(_) | Any | Other => "modified",
    }
}

// ── Public types ─────────────────────────────────────────────────────

/// Events emitted by the file watcher.
#[derive(Debug, Clone, serde::Serialize)]
pub struct FileChangeEvent {
    /// Project that owns the changed files.
    pub project_id: String,
    /// Absolute paths that changed.
    pub changed_paths: Vec<String>,
    /// One of `"created"`, `"modified"`, or `"removed"`.
    pub event_type: String,
}

/// Handle to a running watcher — can be used to stop it.
pub struct WatcherHandle {
    shutdown: Arc<AtomicBool>,
    thread: Option<std::thread::JoinHandle<()>>,
}

impl WatcherHandle {
    /// Signal the watcher thread to stop.
    pub fn stop(&self) {
        self.shutdown.store(true, Ordering::SeqCst);
    }
}

/// Manages file watchers for all active projects.
pub struct WatcherSupervisor {
    watchers: HashMap<String, WatcherHandle>,
    app_handle: AppHandle,
}

impl WatcherSupervisor {
    /// Create a new supervisor bound to the given Tauri application handle.
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            watchers: HashMap::new(),
            app_handle,
        }
    }

    /// Maximum number of projects that can be watched simultaneously.
    const MAX_WATCHED_PROJECTS: usize = 50;

    /// Start watching a project directory.
    ///
    /// A dedicated OS thread is spawned that runs the blocking
    /// [`notify::RecommendedWatcher`] loop and forwards debounced events to
    /// the Tauri frontend via the `"file-change"` event.
    pub fn watch_project(&mut self, project_id: String, path: PathBuf) -> Result<(), AppError> {
        if self.watchers.contains_key(&project_id) {
            tracing::warn!(
                project_id = %project_id,
                "Project is already being watched — skipping"
            );
            return Ok(());
        }

        if self.watchers.len() >= Self::MAX_WATCHED_PROJECTS {
            return Err(AppError::InvalidInput(format!(
                "Cannot watch more than {} projects simultaneously",
                Self::MAX_WATCHED_PROJECTS
            )));
        }

        if !path.is_dir() {
            return Err(AppError::InvalidInput(format!(
                "Path is not a directory: {}",
                path.display()
            )));
        }

        let shutdown = Arc::new(AtomicBool::new(false));
        let shutdown_clone = Arc::clone(&shutdown);
        let app_handle = self.app_handle.clone();
        let pid = project_id.clone();
        let watched_path = path.clone();

        let thread = std::thread::Builder::new()
            .name(format!("watcher-{pid}"))
            .spawn(move || {
                watcher_thread(shutdown_clone, app_handle, pid, watched_path);
            })
            .map_err(|e| AppError::Internal(format!("Failed to spawn watcher thread: {e}")))?;

        tracing::info!(
            project_id = %project_id,
            path = %path.display(),
            "Started file watcher"
        );

        self.watchers.insert(
            project_id,
            WatcherHandle {
                shutdown,
                thread: Some(thread),
            },
        );

        Ok(())
    }

    /// Stop watching a specific project.
    pub fn unwatch_project(&mut self, project_id: &str) -> Result<(), AppError> {
        let handle = self.watchers.remove(project_id).ok_or_else(|| {
            AppError::NotFound(format!("No watcher found for project {project_id}"))
        })?;

        handle.stop();
        if let Some(thread) = handle.thread {
            let _ = thread.join();
        }

        tracing::info!(project_id = %project_id, "Stopped file watcher");
        Ok(())
    }

    /// Stop all watchers.
    pub fn stop_all(&mut self) {
        // Signal all watchers first for faster parallel shutdown.
        for handle in self.watchers.values() {
            handle.stop();
        }

        for (id, mut handle) in self.watchers.drain() {
            if let Some(thread) = handle.thread.take() {
                let _ = thread.join();
            }
            tracing::debug!(project_id = %id, "Watcher joined");
        }

        tracing::info!("All file watchers stopped");
    }

    /// Check if a project is being watched.
    pub fn is_watching(&self, project_id: &str) -> bool {
        self.watchers.contains_key(project_id)
    }

    /// Get list of watched project IDs.
    pub fn watched_projects(&self) -> Vec<String> {
        self.watchers.keys().cloned().collect()
    }
}

impl Drop for WatcherSupervisor {
    fn drop(&mut self) {
        self.stop_all();
    }
}

// ── Watcher thread ───────────────────────────────────────────────────

/// The blocking function that runs on a dedicated OS thread.
///
/// It creates a [`RecommendedWatcher`], listens for FS events, debounces
/// them with a 300 ms window, and emits Tauri events for each batch.
fn watcher_thread(
    shutdown: Arc<AtomicBool>,
    app_handle: AppHandle,
    project_id: String,
    path: PathBuf,
) {
    let (tx, rx) = mpsc::channel();

    let mut watcher = match RecommendedWatcher::new(tx, Config::default()) {
        Ok(w) => w,
        Err(e) => {
            tracing::error!(
                project_id = %project_id,
                error = %e,
                "Failed to create file watcher"
            );
            return;
        }
    };

    if let Err(e) = watcher.watch(&path, RecursiveMode::Recursive) {
        tracing::error!(
            project_id = %project_id,
            path = %path.display(),
            error = %e,
            "Failed to start watching path"
        );
        return;
    }

    tracing::debug!(
        project_id = %project_id,
        path = %path.display(),
        "Watcher thread running"
    );

    const DEBOUNCE: Duration = Duration::from_millis(300);

    // event_type ➜ set of paths, keyed by last-seen instant for debounce.
    let mut pending: HashMap<PathBuf, (&'static str, Instant)> = HashMap::new();

    loop {
        if shutdown.load(Ordering::SeqCst) {
            break;
        }

        match rx.recv_timeout(DEBOUNCE) {
            Ok(Ok(event)) => {
                let etype = event_type_str(&event.kind);
                let now = Instant::now();
                for p in event.paths {
                    if is_ignored(&p) {
                        continue;
                    }
                    pending.insert(p, (etype, now));
                }
            }
            Ok(Err(e)) => {
                tracing::warn!(
                    project_id = %project_id,
                    error = %e,
                    "Notify error"
                );
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                flush_pending(&mut pending, &app_handle, &project_id, &path);
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                tracing::debug!(
                    project_id = %project_id,
                    "Notify channel disconnected — exiting"
                );
                break;
            }
        }
    }

    // Flush anything remaining before exit.
    flush_pending(&mut pending, &app_handle, &project_id, &path);
    tracing::debug!(project_id = %project_id, "Watcher thread exiting");
}

/// Flush accumulated changes, grouped by event type, as Tauri events.
fn flush_pending(
    pending: &mut HashMap<PathBuf, (&'static str, Instant)>,
    app_handle: &AppHandle,
    project_id: &str,
    project_root: &Path,
) {
    if pending.is_empty() {
        return;
    }

    // Group paths by event type, emitting relative paths.
    let mut grouped: HashMap<&str, Vec<String>> = HashMap::new();
    for (path, (etype, _)) in pending.drain() {
        let rel = path
            .strip_prefix(project_root)
            .unwrap_or(&path)
            .to_string_lossy()
            .into_owned();
        grouped.entry(etype).or_default().push(rel);
    }

    for (event_type, paths) in grouped {
        let event = FileChangeEvent {
            project_id: project_id.to_owned(),
            changed_paths: paths,
            event_type: event_type.to_owned(),
        };
        tracing::debug!(
            project_id = %project_id,
            event_type = %event_type,
            count = event.changed_paths.len(),
            "Emitting file-change event"
        );
        if let Err(e) = app_handle.emit("file-change", event) {
            tracing::warn!(
                project_id = %project_id,
                error = %e,
                "Failed to emit file-change event"
            );
        }
    }
}
