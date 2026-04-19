//! Project scanner.
//!
//! Scans a project directory to detect tech stack, file structure, and metadata.
//! Uses `walkdir` for recursive traversal, `serde_json` for `package.json` parsing,
//! and `sha2` for content hashing.

use std::collections::HashSet;
use std::fs;
use std::path::Path;

use sha2::{Digest, Sha256};
use walkdir::WalkDir;

use crate::db::queries;
use crate::errors::AppError;
use contextbridge_core::{Project, TechEntry};
use rusqlite::Connection;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// Result of scanning a project directory.
pub struct ScanResult {
    /// Detected technology stack entries.
    pub tech_stack: Vec<TechEntry>,
    /// All scanned files with metadata.
    pub files: Vec<ScannedFile>,
    /// Total number of files discovered.
    pub total_files: usize,
    /// Aggregate size of all files in bytes.
    pub total_size: u64,
}

/// Metadata collected for a single file during scanning.
pub struct ScannedFile {
    /// Path relative to the project root.
    pub rel_path: String,
    /// Classification (source, config, documentation, …).
    pub file_type: String,
    /// Detected programming language, if any.
    pub language: Option<String>,
    /// File size in bytes.
    pub size_bytes: i64,
    /// SHA-256 content hash (only for files < 1 MB).
    pub content_hash: Option<String>,
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Maximum directory depth to traverse.
const MAX_DEPTH: usize = 20;

/// Maximum number of files to scan before truncating.
const MAX_FILES: usize = 50_000;

/// Hidden file names that should *not* be skipped.
const HIDDEN_ALLOWLIST: &[&str] = &[".gitignore", ".env.example"];

/// Maximum file size (in bytes) for which a content hash is computed.
const MAX_HASH_SIZE: u64 = 1_048_576; // 1 MB

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Scan a project directory and return results without persisting.
pub fn scan_project(root_path: &Path) -> Result<ScanResult, AppError> {
    let root = root_path
        .canonicalize()
        .map_err(|e| AppError::InvalidInput(format!("invalid root path: {e}")))?;

    tracing::info!("Scanning project at {}", root.display());

    let ignored: HashSet<&str> = super::IGNORED_DIRS.iter().copied().collect();
    let allowed_hidden: HashSet<&str> = HIDDEN_ALLOWLIST.iter().copied().collect();

    let mut files: Vec<ScannedFile> = Vec::new();
    let mut total_size: u64 = 0;

    let walker = WalkDir::new(&root)
        .follow_links(false)
        .max_depth(MAX_DEPTH)
        .into_iter();

    for entry in walker.filter_entry(|e| should_visit(e, &ignored, &allowed_hidden)) {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => {
                tracing::debug!("walkdir error: {e}");
                continue;
            }
        };

        if !entry.file_type().is_file() {
            continue;
        }

        if files.len() >= MAX_FILES {
            tracing::warn!("File limit ({MAX_FILES}) reached — truncating scan");
            break;
        }

        let abs = entry.path();
        let rel = match abs.strip_prefix(&root) {
            Ok(r) => r,
            Err(_) => continue,
        };

        let rel_str = rel.to_string_lossy().to_string();
        let ext = rel
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();

        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(e) => {
                tracing::debug!("metadata error for {rel_str}: {e}");
                continue;
            }
        };
        let size = meta.len();
        total_size += size;

        let language = detect_language(&ext, &rel_str);
        let file_type = classify_file(&rel_str, &ext, language.as_deref());
        let content_hash = if size <= MAX_HASH_SIZE {
            compute_hash(abs)
        } else {
            None
        };

        files.push(ScannedFile {
            rel_path: rel_str,
            file_type,
            language,
            size_bytes: size as i64,
            content_hash,
        });
    }

    let total_files = files.len();
    tracing::info!("Discovered {total_files} files ({total_size} bytes)");

    // Detect tech stack
    let tech_stack = detect_tech_stack(&root)?;
    tracing::info!("Detected {} tech stack entries", tech_stack.len());

    Ok(ScanResult {
        tech_stack,
        files,
        total_files,
        total_size,
    })
}

/// Scan a project and persist results to the database.
pub fn scan_and_persist(conn: &Connection, project: &Project) -> Result<ScanResult, AppError> {
    let root = Path::new(&project.root_path);
    let result = scan_project(root)?;

    let tx = conn.unchecked_transaction()?;

    // Persist tech stack
    for entry in &result.tech_stack {
        let persisted = TechEntry {
            id: 0,
            project_id: project.id.clone(),
            category: entry.category.clone(),
            name: entry.name.clone(),
            version: entry.version.clone(),
            confidence: entry.confidence,
            source: entry.source.clone(),
        };
        queries::upsert_tech_stack(&tx, &persisted)?;
    }

    // Persist files
    for f in &result.files {
        queries::upsert_file(
            &tx,
            &project.id,
            &f.rel_path,
            &f.file_type,
            f.language.as_deref(),
            f.size_bytes,
            f.content_hash.as_deref(),
        )?;
    }

    tx.commit()?;

    tracing::info!(
        "Persisted scan for project '{}': {} files, {} tech entries",
        project.name,
        result.total_files,
        result.tech_stack.len()
    );

    Ok(result)
}

// ---------------------------------------------------------------------------
// Directory walking helpers
// ---------------------------------------------------------------------------

/// Decide whether `walkdir` should descend into (or yield) an entry.
fn should_visit(
    entry: &walkdir::DirEntry,
    ignored: &HashSet<&str>,
    allowed_hidden: &HashSet<&str>,
) -> bool {
    let name = entry.file_name().to_string_lossy();

    // Always allow the root directory itself.
    if entry.depth() == 0 {
        return true;
    }

    // Check ignored directory names.
    if entry.file_type().is_dir() && ignored.contains(name.as_ref()) {
        return false;
    }

    // Skip hidden entries unless allow-listed.
    if name.starts_with('.') && !allowed_hidden.contains(name.as_ref()) {
        return false;
    }

    true
}

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

/// Map a file extension (or special filename) to a programming language.
fn detect_language(ext: &str, rel_path: &str) -> Option<String> {
    let file_name = Path::new(rel_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    // Special filenames first
    match file_name.as_str() {
        "Dockerfile" | "Containerfile" => return Some("Docker".into()),
        "Makefile" | "GNUmakefile" => return Some("Make".into()),
        "CMakeLists.txt" => return Some("CMake".into()),
        _ => {}
    }

    match ext {
        "rs" => Some("Rust".into()),
        "ts" | "tsx" => Some("TypeScript".into()),
        "js" | "jsx" => Some("JavaScript".into()),
        "py" => Some("Python".into()),
        "go" => Some("Go".into()),
        "rb" => Some("Ruby".into()),
        "java" => Some("Java".into()),
        "kt" => Some("Kotlin".into()),
        "swift" => Some("Swift".into()),
        "dart" => Some("Dart".into()),
        "c" | "h" => Some("C".into()),
        "cpp" | "hpp" | "cc" | "cxx" => Some("C++".into()),
        "cs" => Some("C#".into()),
        "php" => Some("PHP".into()),
        "html" | "htm" => Some("HTML".into()),
        "css" | "scss" | "sass" => Some("CSS".into()),
        "sql" => Some("SQL".into()),
        "sh" | "bash" => Some("Shell".into()),
        "yml" | "yaml" => Some("YAML".into()),
        "json" => Some("JSON".into()),
        "toml" => Some("TOML".into()),
        "md" | "markdown" => Some("Markdown".into()),
        "vue" => Some("Vue".into()),
        "svelte" => Some("Svelte".into()),
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// File type classification
// ---------------------------------------------------------------------------

/// Classify a file into a high-level category.
fn classify_file(rel_path: &str, ext: &str, language: Option<&str>) -> String {
    let name = Path::new(rel_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default()
        .to_lowercase();

    let rel_lower = rel_path.to_lowercase();

    // Test files — use path-segment or file-name conventions
    if rel_lower.contains("/test/")
        || rel_lower.contains("/tests/")
        || rel_lower.contains("/__tests__/")
        || name.contains(".test.")
        || name.contains(".spec.")
        || name.contains("_test.")
        || name.starts_with("test_")
        || name == "conftest.py"
    {
        return "test".into();
    }

    // Build / CI files
    if matches!(
        name.as_str(),
        "makefile"
            | "gnumakefile"
            | "cmakelists.txt"
            | "dockerfile"
            | "containerfile"
            | "docker-compose.yml"
            | "docker-compose.yaml"
            | "jenkinsfile"
    ) || rel_lower.contains(".github/workflows")
        || ext == "gradle"
        || ext == "kts"
    {
        return "build".into();
    }

    // Config
    if matches!(
        ext,
        "json" | "toml" | "yaml" | "yml" | "ini" | "cfg" | "conf" | "env" | "lock"
    ) || name.starts_with('.')
        || matches!(
            name.as_str(),
            "package.json"
                | "cargo.toml"
                | "go.mod"
                | "go.sum"
                | "gemfile"
                | "pubspec.yaml"
                | "pyproject.toml"
        )
    {
        return "config".into();
    }

    // Documentation
    if matches!(ext, "md" | "markdown" | "rst" | "txt" | "adoc")
        || matches!(
            name.as_str(),
            "readme" | "changelog" | "license" | "contributing" | "authors"
        )
    {
        return "documentation".into();
    }

    // Assets
    if matches!(
        ext,
        "png"
            | "jpg"
            | "jpeg"
            | "gif"
            | "svg"
            | "ico"
            | "webp"
            | "mp4"
            | "mp3"
            | "wav"
            | "ogg"
            | "woff"
            | "woff2"
            | "ttf"
            | "otf"
            | "eot"
    ) {
        return "asset".into();
    }

    // Data
    if matches!(ext, "csv" | "tsv" | "xml" | "sql" | "parquet" | "avro") {
        return "data".into();
    }

    // Source code
    if language.is_some() {
        return "source".into();
    }

    "other".into()
}

// ---------------------------------------------------------------------------
// Content hashing
// ---------------------------------------------------------------------------

/// Compute the SHA-256 hex digest of a file (streaming); returns `None` on read errors or if > 1 MB.
fn compute_hash(path: &Path) -> Option<String> {
    use std::io::Read;

    let mut file = std::fs::File::open(path).ok()?;
    let meta = file.metadata().ok()?;
    if meta.len() > 1_048_576 {
        return None;
    }

    let mut hasher = Sha256::new();
    let mut buf = [0u8; 8192];
    let mut total: u64 = 0;
    loop {
        let n = file.read(&mut buf).ok()?;
        if n == 0 {
            break;
        }
        total += n as u64;
        if total > 1_048_576 {
            return None;
        }
        hasher.update(&buf[..n]);
    }
    Some(format!("{:x}", hasher.finalize()))
}

// ---------------------------------------------------------------------------
// Tech stack detection
// ---------------------------------------------------------------------------

/// Detect the technology stack from well-known configuration files.
///
/// Returns a vec of [`TechEntry`] with `project_id` set to an empty string
/// (the caller is responsible for setting the real project ID before persisting).
fn detect_tech_stack(root: &Path) -> Result<Vec<TechEntry>, AppError> {
    let mut entries: Vec<TechEntry> = Vec::new();

    // Helper closure to push a tech entry.
    {
        let mut add =
            |category: &str, name: &str, version: Option<String>, confidence: f64, source: &str| {
                entries.push(TechEntry {
                    id: 0,
                    project_id: String::new(),
                    category: category.into(),
                    name: name.into(),
                    version,
                    confidence,
                    source: source.into(),
                });
            };

        // ── package.json ──────────────────────────────────────────────────
        let pkg_path = root.join("package.json");
        if pkg_path.is_file() {
            if let Ok(raw) = fs::read_to_string(&pkg_path) {
                if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&raw) {
                    // Node.js runtime
                    let node_ver = pkg
                        .pointer("/engines/node")
                        .and_then(|v| v.as_str())
                        .map(String::from);
                    add("runtime", "Node.js", node_ver, 0.95, "package.json");

                    // TypeScript from devDependencies
                    if let Some(ts_ver) = pkg
                        .pointer("/devDependencies/typescript")
                        .and_then(|v| v.as_str())
                    {
                        add(
                            "language",
                            "TypeScript",
                            Some(ts_ver.into()),
                            0.95,
                            "package.json",
                        );
                    }

                    // Framework detection from dependencies + devDependencies
                    let framework_checks: &[(&str, &str)] = &[
                        ("next", "Next.js"),
                        ("nuxt", "Nuxt"),
                        ("remix", "Remix"),
                        ("react", "React"),
                        ("vue", "Vue"),
                        ("@angular/core", "Angular"),
                        ("svelte", "Svelte"),
                    ];

                    let deps = pkg.get("dependencies");
                    let dev_deps = pkg.get("devDependencies");

                    for &(key, name) in framework_checks {
                        let version = deps
                            .and_then(|d| d.get(key))
                            .or_else(|| dev_deps.and_then(|d| d.get(key)))
                            .and_then(|v| v.as_str())
                            .map(String::from);
                        if version.is_some() {
                            add("framework", name, version, 0.9, "package.json");
                        }
                    }
                } else {
                    tracing::debug!("Failed to parse package.json");
                }
            }
        }

        // ── Cargo.toml ────────────────────────────────────────────────────
        let cargo_path = root.join("Cargo.toml");
        if cargo_path.is_file() {
            if let Ok(raw) = fs::read_to_string(&cargo_path) {
                // Extract edition with simple string parsing
                let edition = raw.lines().find_map(|line| {
                    let trimmed = line.trim();
                    if trimmed.starts_with("edition") {
                        trimmed
                            .split('=')
                            .nth(1)
                            .map(|v| v.trim().trim_matches('"').to_string())
                    } else {
                        None
                    }
                });
                add("language", "Rust", edition, 0.95, "Cargo.toml");

                // Framework detection
                let cargo_frameworks: &[(&str, &str)] = &[
                    ("tauri", "Tauri"),
                    ("actix-web", "Actix"),
                    ("axum", "Axum"),
                    ("rocket", "Rocket"),
                ];
                for &(key, name) in cargo_frameworks {
                    if raw.contains(key) && raw.contains("[dependencies") {
                        add("framework", name, None, 0.8, "Cargo.toml");
                    }
                }
            }
        }

        // ── pyproject.toml ────────────────────────────────────────────────
        let pyproject_path = root.join("pyproject.toml");
        if pyproject_path.is_file() {
            if let Ok(raw) = fs::read_to_string(&pyproject_path) {
                let python_ver = raw.lines().find_map(|line| {
                    let trimmed = line.trim();
                    if trimmed.starts_with("requires-python") {
                        trimmed
                            .split('=')
                            .next_back()
                            .map(|v| v.trim().trim_matches('"').to_string())
                    } else {
                        None
                    }
                });
                add("language", "Python", python_ver, 0.95, "pyproject.toml");

                // Python framework detection
                let py_frameworks: &[(&str, &str)] = &[
                    ("django", "Django"),
                    ("flask", "Flask"),
                    ("fastapi", "FastAPI"),
                ];
                let raw_lower = raw.to_lowercase();
                for &(key, name) in py_frameworks {
                    if raw_lower.contains(key) {
                        add("framework", name, None, 0.8, "pyproject.toml");
                    }
                }
            }
        }

        // ── requirements.txt ──────────────────────────────────────────────
        // (deferred – handled after the mutable closure is dropped)

        // ── go.mod ────────────────────────────────────────────────────────
        let gomod_path = root.join("go.mod");
        if gomod_path.is_file() {
            if let Ok(raw) = fs::read_to_string(&gomod_path) {
                let go_ver = raw.lines().find_map(|line| {
                    let trimmed = line.trim();
                    if trimmed.starts_with("go ") {
                        Some(trimmed.strip_prefix("go ")?.trim().to_string())
                    } else {
                        None
                    }
                });
                add("language", "Go", go_ver, 0.95, "go.mod");

                // Go framework detection
                let go_frameworks: &[(&str, &str)] = &[
                    ("github.com/gin-gonic/gin", "Gin"),
                    ("github.com/labstack/echo", "Echo"),
                    ("github.com/gofiber/fiber", "Fiber"),
                ];
                for &(key, name) in go_frameworks {
                    if raw.contains(key) {
                        add("framework", name, None, 0.85, "go.mod");
                    }
                }
            }
        }

        // ── Gemfile ───────────────────────────────────────────────────────
        let gemfile_path = root.join("Gemfile");
        if gemfile_path.is_file() {
            if let Ok(raw) = fs::read_to_string(&gemfile_path) {
                let ruby_ver = raw.lines().find_map(|line| {
                    let trimmed = line.trim();
                    if trimmed.starts_with("ruby ") || trimmed.starts_with("ruby(") {
                        // e.g. ruby '3.2.0' or ruby "3.2.0"
                        let ver = trimmed.split(['\'', '"']).nth(1).map(String::from);
                        ver
                    } else {
                        None
                    }
                });
                add("language", "Ruby", ruby_ver, 0.95, "Gemfile");

                // Rails detection
                if let Some(line) = raw
                    .lines()
                    .find(|l| l.contains("'rails'") || l.contains("\"rails\""))
                {
                    let rails_ver = line
                        .split(['\'', '"'])
                        .nth(3)
                        .map(|v| v.trim().to_string())
                        .filter(|v| !v.is_empty());
                    add("framework", "Rails", rails_ver, 0.9, "Gemfile");
                }
            }
        }

        // ── pubspec.yaml ─────────────────────────────────────────────────
        let pubspec_path = root.join("pubspec.yaml");
        if pubspec_path.is_file() {
            if let Ok(raw) = fs::read_to_string(&pubspec_path) {
                if raw.contains("flutter:") || raw.contains("flutter_") {
                    add("framework", "Flutter", None, 0.9, "pubspec.yaml");
                } else {
                    add("framework", "Dart", None, 0.85, "pubspec.yaml");
                }
            }
        }

        // ── build.gradle / build.gradle.kts ──────────────────────────────
        let gradle_path = root.join("build.gradle");
        let gradle_kts_path = root.join("build.gradle.kts");
        if gradle_kts_path.is_file() {
            add("language", "Kotlin", None, 0.85, "build.gradle.kts");
        } else if gradle_path.is_file() {
            add("language", "Java", None, 0.85, "build.gradle");
        }

        // ── Dockerfile ───────────────────────────────────────────────────
        if root.join("Dockerfile").is_file() || root.join("dockerfile").is_file() {
            add("tool", "Docker", None, 0.95, "Dockerfile");
        }

        // ── docker-compose.yml ───────────────────────────────────────────
        if root.join("docker-compose.yml").is_file() || root.join("docker-compose.yaml").is_file() {
            add("tool", "Docker Compose", None, 0.95, "docker-compose.yml");
        }

        // ── GitHub Actions ───────────────────────────────────────────────
        let workflows_dir = root.join(".github").join("workflows");
        if workflows_dir.is_dir() {
            let has_yml = fs::read_dir(&workflows_dir)
                .ok()
                .map(|rd| {
                    rd.filter_map(|e| e.ok()).any(|e| {
                        let n = e.file_name();
                        let n = n.to_string_lossy();
                        n.ends_with(".yml") || n.ends_with(".yaml")
                    })
                })
                .unwrap_or(false);
            if has_yml {
                add(
                    "tool",
                    "GitHub Actions",
                    None,
                    0.95,
                    ".github/workflows/*.yml",
                );
            }
        }

        // ── tsconfig.json ────────────────────────────────────────────────
        // (deferred – handled after the mutable closure is dropped)

        // ── Tailwind CSS ─────────────────────────────────────────────────
        if has_glob_match(root, "tailwind.config") {
            add("styling", "Tailwind CSS", None, 0.9, "tailwind.config.*");
        }

        // ── Vite ─────────────────────────────────────────────────────────
        if has_glob_match(root, "vite.config") {
            add("tool", "Vite", None, 0.9, "vite.config.*");
        }

        // ── Webpack ──────────────────────────────────────────────────────
        if has_glob_match(root, "webpack.config") {
            add("tool", "Webpack", None, 0.9, "webpack.config.*");
        }

        // ── ESLint ───────────────────────────────────────────────────────
        if has_glob_match(root, ".eslintrc") || has_glob_match(root, "eslint.config") {
            add("tool", "ESLint", None, 0.9, ".eslintrc* / eslint.config.*");
        }

        // ── Jest / Vitest ────────────────────────────────────────────────
        if has_glob_match(root, "jest.config") {
            add("testing", "Jest", None, 0.9, "jest.config.*");
        }
        if has_glob_match(root, "vitest.config") {
            add("testing", "Vitest", None, 0.9, "vitest.config.*");
        }
    } // `add` closure goes out of scope here

    // ── Deferred: requirements.txt (avoid duplicate Python) ──────────
    let req_path = root.join("requirements.txt");
    if req_path.is_file() && !entries.iter().any(|e| e.name == "Python") {
        entries.push(TechEntry {
            id: 0,
            project_id: String::new(),
            category: "language".into(),
            name: "Python".into(),
            version: None,
            confidence: 0.85,
            source: "requirements.txt".into(),
        });
    }

    // ── Deferred: tsconfig.json (avoid duplicate TypeScript) ─────────
    if root.join("tsconfig.json").is_file() && !entries.iter().any(|e| e.name == "TypeScript") {
        entries.push(TechEntry {
            id: 0,
            project_id: String::new(),
            category: "language".into(),
            name: "TypeScript".into(),
            version: None,
            confidence: 0.9,
            source: "tsconfig.json".into(),
        });
    }

    Ok(entries)
}

/// Check if any file in `root` starts with the given `prefix`.
fn has_glob_match(root: &Path, prefix: &str) -> bool {
    let rd = match fs::read_dir(root) {
        Ok(rd) => rd,
        Err(_) => return false,
    };
    for entry in rd.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with(prefix) {
            return true;
        }
    }
    false
}
