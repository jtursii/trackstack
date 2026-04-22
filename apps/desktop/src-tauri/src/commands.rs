use crate::parser;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectSnapshot {
    pub track_names: Vec<String>,
    /// Relative path from the project's Samples/ directory -> SHA-256 hex digest.
    /// Keys always use forward slashes regardless of host OS.
    pub samples: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectDiff {
    pub new_files: Vec<String>,
    pub modified_files: Vec<String>,
    pub deleted_files: Vec<String>,
}

/// Resolve the `.als` file from `project_path`, which may be either:
/// - a direct path to a `.als` file, or
/// - a directory containing one or more `.als` files (first one wins).
///
/// Returns `Err` with a human-readable message when no `.als` can be found.
fn resolve_als_path(project_path: &str) -> Result<PathBuf, String> {
    let path = Path::new(project_path);

    if path.is_dir() {
        fs::read_dir(path)
            .map_err(|e| format!("Cannot read directory: {e}"))?
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path())
            .find(|p| {
                p.is_file()
                    && p.extension()
                        .map_or(false, |ext| ext.eq_ignore_ascii_case("als"))
            })
            .ok_or_else(|| "No .als file found in this folder.".to_string())
    } else {
        // Single file path — validate the extension.
        if path
            .extension()
            .map_or(true, |ext| !ext.eq_ignore_ascii_case("als"))
        {
            return Err("No .als file found in this folder.".to_string());
        }
        Ok(path.to_path_buf())
    }
}

#[tauri::command]
pub fn parse_project(project_path: String) -> Result<ProjectSnapshot, String> {
    let als_path = resolve_als_path(&project_path)?;

    let data = fs::read(&als_path).map_err(|e| format!("Cannot read project file: {e}"))?;
    let xml = parser::decompress_als(&data)?;
    let track_names = parser::parse_track_names(&xml);

    // PathBuf::join always produces a correct platform path.
    let samples_dir: PathBuf = als_path
        .parent()
        .ok_or("Invalid project path: no parent directory")?
        .join("Samples");

    let samples = parser::collect_wav_hashes(&samples_dir)?;

    Ok(ProjectSnapshot {
        track_names,
        samples,
    })
}

#[tauri::command]
pub fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(Path::new(&path)).map_err(|e| format!("Cannot read file: {e}"))
}

#[tauri::command]
pub fn diff_project(
    current: ProjectSnapshot,
    previous: ProjectSnapshot,
) -> Result<ProjectDiff, String> {
    let mut new_files = Vec::new();
    let mut modified_files = Vec::new();
    let mut deleted_files = Vec::new();

    for (filename, hash) in &current.samples {
        match previous.samples.get(filename) {
            None => new_files.push(filename.clone()),
            Some(prev_hash) if prev_hash != hash => modified_files.push(filename.clone()),
            _ => {}
        }
    }

    for filename in previous.samples.keys() {
        if !current.samples.contains_key(filename) {
            deleted_files.push(filename.clone());
        }
    }

    Ok(ProjectDiff {
        new_files,
        modified_files,
        deleted_files,
    })
}
