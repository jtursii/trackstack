use crate::parser;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectSnapshot {
    pub track_names: Vec<String>,
    /// Relative path from the project's Samples/ directory -> SHA-256 hex digest
    pub samples: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectDiff {
    pub new_files: Vec<String>,
    pub modified_files: Vec<String>,
    pub deleted_files: Vec<String>,
}

#[tauri::command]
pub fn parse_project(project_path: String) -> Result<ProjectSnapshot, String> {
    let path = Path::new(&project_path);
    let data = fs::read(path).map_err(|e| format!("Cannot read project file: {e}"))?;
    let xml = parser::decompress_als(&data)?;
    let track_names = parser::parse_track_names(&xml);

    let samples_dir = path
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
