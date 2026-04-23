use crate::parser;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrackEntry {
    pub name: String,
    /// "audio" for AudioTrack nodes, "midi" for MidiTrack nodes.
    pub kind: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectSnapshot {
    pub tracks: Vec<TrackEntry>,
    /// Relative path from the project's Samples/ directory -> SHA-256 hex digest.
    /// Keys always use forward slashes regardless of host OS.
    pub samples: HashMap<String, String>,
    pub bpm: f64,
    pub clip_data: Vec<parser::ClipRegion>,
    pub track_colors: Vec<parser::TrackColor>,
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

    let tracks = parser::parse_tracks(&xml)
        .into_iter()
        .map(|(name, kind)| TrackEntry { name, kind })
        .collect();

    let xml_bytes = xml.as_bytes();
    let bpm = parser::extract_bpm(xml_bytes)?;
    let clip_data = parser::extract_clips(xml_bytes)?;
    let track_colors = parser::extract_track_colors(xml_bytes)?;

    let samples_dir: PathBuf = als_path
        .parent()
        .ok_or("Invalid project path: no parent directory")?
        .join("Samples");

    let samples = parser::collect_wav_hashes(&samples_dir)?;

    Ok(ProjectSnapshot {
        tracks,
        samples,
        bpm,
        clip_data,
        track_colors,
    })
}

#[tauri::command]
pub fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(Path::new(&path)).map_err(|e| format!("Cannot read file: {e}"))
}

#[tauri::command]
pub async fn write_file_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Cannot create directory {:?}: {e}", parent))?;
    }
    fs::write(p, &bytes).map_err(|e| format!("Cannot write file {:?}: {e}", p))?;
    Ok(())
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
