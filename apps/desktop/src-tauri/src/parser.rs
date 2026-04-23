use flate2::read::GzDecoder;
use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::Path;

pub fn decompress_als(data: &[u8]) -> Result<String, String> {
    let mut decoder = GzDecoder::new(data);
    let mut xml = String::new();
    decoder
        .read_to_string(&mut xml)
        .map_err(|e| format!("Failed to decompress .als: {e}"))?;
    Ok(xml)
}

// ── New metadata structs ───────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrackColor {
    pub name: String,
    pub kind: String, // "audio", "midi", "group"
    pub color_index: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClipRegion {
    pub track_name: String,
    pub track_index: usize,
    pub clip_name: String,
    pub start_beat: f64,
    pub end_beat: f64,
    pub color_index: i32,
    pub kind: String, // "audio" or "midi"
}

// ── Existing track parser ──────────────────────────────────────────────────

/// Extract tracks from Ableton Live XML, returning `(name, kind)` pairs.
///
/// Looks for <EffectiveName Value="..."/> inside <Name> elements that are
/// direct children of <AudioTrack> or <MidiTrack>. Empty values are skipped.
/// `kind` is `"audio"` for AudioTrack nodes and `"midi"` for MidiTrack nodes.
pub fn parse_tracks(xml: &str) -> Vec<(String, String)> {
    let mut reader = Reader::from_str(xml);
    let mut buf = Vec::new();
    let mut tracks: Vec<(String, String)> = Vec::new();

    let mut depth: u32 = 0;
    let mut track_depth: u32 = 0;
    let mut in_track = false;
    let mut in_name = false;
    let mut current_kind = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                depth += 1;
                match e.name().as_ref() {
                    b"AudioTrack" if !in_track => {
                        in_track = true;
                        track_depth = depth;
                        current_kind = "audio".to_string();
                    }
                    b"MidiTrack" if !in_track => {
                        in_track = true;
                        track_depth = depth;
                        current_kind = "midi".to_string();
                    }
                    b"Name" if in_track && !in_name && depth == track_depth + 1 => {
                        in_name = true;
                    }
                    // Handle non-self-closing <EffectiveName> (unusual but valid XML)
                    b"EffectiveName" if in_name => {
                        if let Some(name) = extract_value_attr(&e) {
                            tracks.push((name, current_kind.clone()));
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Empty(e)) => {
                // Ableton always writes <EffectiveName Value="..."/> as self-closing
                if in_name && e.name().as_ref() == b"EffectiveName" {
                    if let Some(name) = extract_value_attr(&e) {
                        tracks.push((name, current_kind.clone()));
                    }
                }
            }
            Ok(Event::End(e)) => {
                match e.name().as_ref() {
                    b"AudioTrack" | b"MidiTrack" if in_track && depth == track_depth => {
                        in_track = false;
                        in_name = false;
                    }
                    b"Name" if in_name && depth == track_depth + 1 => {
                        in_name = false;
                    }
                    _ => {}
                }
                depth = depth.saturating_sub(1);
            }
            Ok(Event::Eof) | Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    tracks
}

// ── New extraction functions ───────────────────────────────────────────────

/// Extract the global BPM from decompressed .als XML bytes.
/// Navigates LiveSet → MasterTrack → DeviceChain → Mixer → Tempo → Manual.
/// Returns Ok(120.0) if the node is not found.
pub fn extract_bpm(xml: &[u8]) -> Result<f64, String> {
    let xml_str =
        std::str::from_utf8(xml).map_err(|e| format!("Invalid UTF-8 in BPM extraction: {e}"))?;
    let mut reader = Reader::from_str(xml_str);
    let mut buf = Vec::new();
    // Track open-element names as a path stack.
    let mut path: Vec<Vec<u8>> = Vec::new();

    const TARGET: [&[u8]; 5] = [
        b"LiveSet",
        b"MasterTrack",
        b"DeviceChain",
        b"Mixer",
        b"Tempo",
    ];

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                path.push(e.name().as_ref().to_vec());
            }
            Ok(Event::Empty(e)) => {
                if e.name().as_ref() == b"Manual" && path.len() >= TARGET.len() {
                    let tail = &path[path.len() - TARGET.len()..];
                    let matches = tail
                        .iter()
                        .zip(TARGET.iter())
                        .all(|(a, b)| a.as_slice() == *b);
                    if matches {
                        if let Some(val) = extract_value_attr(&e) {
                            if let Ok(bpm) = val.parse::<f64>() {
                                return Ok(bpm);
                            }
                        }
                    }
                }
            }
            Ok(Event::End(_)) => {
                path.pop();
            }
            Ok(Event::Eof) | Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    Ok(120.0)
}

/// Extract per-track color assignments from decompressed .als XML bytes.
/// Processes AudioTrack, MidiTrack, and GroupTrack nodes.
pub fn extract_track_colors(xml: &[u8]) -> Result<Vec<TrackColor>, String> {
    let xml_str = std::str::from_utf8(xml)
        .map_err(|e| format!("Invalid UTF-8 in color extraction: {e}"))?;
    let mut reader = Reader::from_str(xml_str);
    let mut buf = Vec::new();
    let mut colors: Vec<TrackColor> = Vec::new();

    let mut depth: u32 = 0;
    let mut track_depth: u32 = 0;
    let mut in_track = false;
    let mut current_kind = String::new();
    let mut in_name = false;
    let mut current_name: Option<String> = None;
    let mut current_color: Option<i32> = None;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                depth += 1;
                match e.name().as_ref() {
                    b"AudioTrack" | b"MidiTrack" | b"GroupTrack" if !in_track => {
                        in_track = true;
                        track_depth = depth;
                        current_kind = match e.name().as_ref() {
                            b"AudioTrack" => "audio",
                            b"MidiTrack" => "midi",
                            _ => "group",
                        }
                        .to_string();
                        current_name = None;
                        current_color = None;
                    }
                    b"Name" if in_track && !in_name && depth == track_depth + 1 => {
                        in_name = true;
                    }
                    _ => {}
                }
            }
            Ok(Event::Empty(e)) => {
                if in_track {
                    match e.name().as_ref() {
                        b"EffectiveName" if in_name => {
                            if let Some(n) = extract_value_attr(&e) {
                                current_name = Some(n);
                            }
                        }
                        // Color is a direct child of the track element; depth equals
                        // track_depth because Empty events don't increment depth.
                        b"Color" if depth == track_depth => {
                            if let Some(val) = extract_value_attr(&e) {
                                current_color = val.parse().ok();
                            }
                        }
                        _ => {}
                    }
                }
            }
            Ok(Event::End(e)) => {
                if in_track {
                    match e.name().as_ref() {
                        b"AudioTrack" | b"MidiTrack" | b"GroupTrack"
                            if depth == track_depth =>
                        {
                            if let (Some(name), Some(color_index)) =
                                (current_name.take(), current_color.take())
                            {
                                colors.push(TrackColor {
                                    name,
                                    kind: current_kind.clone(),
                                    color_index,
                                });
                            }
                            in_track = false;
                            in_name = false;
                        }
                        b"Name" if in_name && depth == track_depth + 1 => {
                            in_name = false;
                        }
                        _ => {}
                    }
                }
                depth = depth.saturating_sub(1);
            }
            Ok(Event::Eof) | Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    Ok(colors)
}

/// Extract clip regions from decompressed .als XML bytes.
/// Finds AudioClip and MidiClip nodes inside any AudioTrack or MidiTrack and
/// returns their timing, color, and parent-track metadata.
pub fn extract_clips(xml: &[u8]) -> Result<Vec<ClipRegion>, String> {
    let xml_str = std::str::from_utf8(xml)
        .map_err(|e| format!("Invalid UTF-8 in clip extraction: {e}"))?;
    let mut reader = Reader::from_str(xml_str);
    let mut buf = Vec::new();
    let mut clips: Vec<ClipRegion> = Vec::new();

    let mut depth: u32 = 0;
    let mut track_depth: u32 = 0;
    let mut in_track = false;
    let mut track_index: usize = 0;
    let mut current_track_name = String::new();
    let mut current_track_kind = String::new();
    let mut in_track_name = false;
    let mut track_name_set = false;

    let mut in_clip = false;
    let mut clip_depth: u32 = 0;
    let mut current_clip_name = String::new();
    let mut current_start: Option<f64> = None;
    let mut current_end: Option<f64> = None;
    let mut current_clip_color: Option<i32> = None;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                depth += 1;
                match e.name().as_ref() {
                    b"AudioTrack" | b"MidiTrack" if !in_track => {
                        in_track = true;
                        track_depth = depth;
                        current_track_kind = match e.name().as_ref() {
                            b"AudioTrack" => "audio",
                            _ => "midi",
                        }
                        .to_string();
                        current_track_name.clear();
                        track_name_set = false;
                    }
                    b"Name"
                        if in_track && !in_track_name && !track_name_set && !in_clip
                            && depth == track_depth + 1 =>
                    {
                        in_track_name = true;
                    }
                    b"AudioClip" | b"MidiClip" if in_track && !in_clip => {
                        in_clip = true;
                        clip_depth = depth;
                        current_clip_name.clear();
                        current_start = None;
                        current_end = None;
                        current_clip_color = None;
                    }
                    _ => {}
                }
            }
            Ok(Event::Empty(e)) => {
                if in_track_name && e.name().as_ref() == b"EffectiveName" {
                    if let Some(n) = extract_value_attr(&e) {
                        current_track_name = n;
                    }
                }
                if in_clip {
                    match e.name().as_ref() {
                        // Clip name: <Name Value="..."/> direct child of clip node
                        b"Name" if depth == clip_depth => {
                            if let Some(n) = extract_value_attr(&e) {
                                current_clip_name = n;
                            }
                        }
                        b"CurrentStart" if depth == clip_depth => {
                            if let Some(val) = extract_value_attr(&e) {
                                current_start = val.parse().ok();
                            }
                        }
                        b"CurrentEnd" if depth == clip_depth => {
                            if let Some(val) = extract_value_attr(&e) {
                                current_end = val.parse().ok();
                            }
                        }
                        b"Color" if depth == clip_depth => {
                            if let Some(val) = extract_value_attr(&e) {
                                current_clip_color = val.parse().ok();
                            }
                        }
                        _ => {}
                    }
                }
            }
            Ok(Event::End(e)) => {
                if in_clip {
                    match e.name().as_ref() {
                        b"AudioClip" | b"MidiClip" if depth == clip_depth => {
                            if let (Some(start), Some(end)) = (current_start, current_end) {
                                if end > start {
                                    clips.push(ClipRegion {
                                        track_name: current_track_name.clone(),
                                        track_index,
                                        clip_name: current_clip_name.clone(),
                                        start_beat: start,
                                        end_beat: end,
                                        color_index: current_clip_color.unwrap_or(0),
                                        kind: current_track_kind.clone(),
                                    });
                                }
                            }
                            in_clip = false;
                        }
                        _ => {}
                    }
                }
                if in_track && !in_clip {
                    match e.name().as_ref() {
                        b"AudioTrack" | b"MidiTrack" if depth == track_depth => {
                            in_track = false;
                            in_track_name = false;
                            track_name_set = false;
                            track_index += 1;
                        }
                        b"Name" if in_track_name && depth == track_depth + 1 => {
                            in_track_name = false;
                            track_name_set = true;
                        }
                        _ => {}
                    }
                }
                depth = depth.saturating_sub(1);
            }
            Ok(Event::Eof) | Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    Ok(clips)
}

// ── Shared helpers ─────────────────────────────────────────────────────────

fn extract_value_attr(e: &quick_xml::events::BytesStart<'_>) -> Option<String> {
    for attr in e.attributes().flatten() {
        if attr.key.as_ref() == b"Value" {
            return attr
                .unescape_value()
                .ok()
                .map(|v| v.into_owned())
                .filter(|v| !v.is_empty());
        }
    }
    None
}

pub fn hash_file(path: &Path) -> Result<String, String> {
    let data = fs::read(path).map_err(|e| format!("Cannot read {path:?}: {e}"))?;
    let digest = Sha256::digest(&data);
    Ok(digest.iter().map(|b| format!("{b:02x}")).collect())
}

/// Recursively scan `samples_dir` for .wav files, returning a map of
/// relative path (from `samples_dir`) -> SHA-256 hex digest.
pub fn collect_wav_hashes(samples_dir: &Path) -> Result<HashMap<String, String>, String> {
    let mut map = HashMap::new();
    if samples_dir.is_dir() {
        collect_wavs_recursive(samples_dir, samples_dir, &mut map)?;
    }
    Ok(map)
}

fn collect_wavs_recursive(
    base: &Path,
    dir: &Path,
    map: &mut HashMap<String, String>,
) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("Cannot read dir {dir:?}: {e}"))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            collect_wavs_recursive(base, &path, map)?;
        } else if path
            .extension()
            .map(|x| x.eq_ignore_ascii_case("wav"))
            .unwrap_or(false)
        {
            let rel = path.strip_prefix(base).unwrap_or(&path);
            // Normalise to forward slashes so keys are consistent across OSes.
            let key = rel.to_string_lossy().replace('\\', "/");
            let hash = hash_file(&path)?;
            map.insert(key, hash);
        }
    }
    Ok(())
}

// ── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;

    fn make_gz(content: &str) -> Vec<u8> {
        let mut enc = GzEncoder::new(Vec::new(), Compression::default());
        enc.write_all(content.as_bytes()).unwrap();
        enc.finish().unwrap()
    }

    const FIXTURE_XML: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="11">
  <LiveSet>
    <Tracks>
      <AudioTrack Id="0">
        <Name>
          <EffectiveName Value="Kick"/>
          <UserName Value=""/>
        </Name>
      </AudioTrack>
      <MidiTrack Id="1">
        <Name>
          <EffectiveName Value="Bass Synth"/>
          <UserName Value=""/>
        </Name>
      </MidiTrack>
      <AudioTrack Id="2">
        <Name>
          <EffectiveName Value=""/>
          <UserName Value="Unnamed"/>
        </Name>
      </AudioTrack>
    </Tracks>
  </LiveSet>
</Ableton>"#;

    const BPM_FIXTURE: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="11">
  <LiveSet>
    <MasterTrack>
      <DeviceChain>
        <Mixer>
          <Tempo>
            <LomId Value="0"/>
            <Manual Value="140.0"/>
          </Tempo>
        </Mixer>
      </DeviceChain>
    </MasterTrack>
  </LiveSet>
</Ableton>"#;

    const CLIP_FIXTURE: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="11">
  <LiveSet>
    <Tracks>
      <AudioTrack Id="0">
        <Name>
          <EffectiveName Value="Kick"/>
        </Name>
        <Color Value="2"/>
        <DeviceChain>
          <MainSequencer>
            <ClipSlotList>
              <ClipSlot Id="0">
                <ClipSlot>
                  <AudioClip Id="0">
                    <Name Value="Kick Loop"/>
                    <CurrentStart Value="0"/>
                    <CurrentEnd Value="4"/>
                    <Color Value="5"/>
                  </AudioClip>
                </ClipSlot>
              </ClipSlot>
            </ClipSlotList>
          </MainSequencer>
        </DeviceChain>
      </AudioTrack>
    </Tracks>
  </LiveSet>
</Ableton>"#;

    #[test]
    fn decompress_and_parse_tracks() {
        let gz = make_gz(FIXTURE_XML);
        let xml = decompress_als(&gz).expect("decompression should succeed");
        let tracks = parse_tracks(&xml);
        assert_eq!(
            tracks,
            vec![
                ("Kick".to_string(), "audio".to_string()),
                ("Bass Synth".to_string(), "midi".to_string()),
            ]
        );
    }

    #[test]
    fn empty_effective_name_is_excluded() {
        let tracks = parse_tracks(FIXTURE_XML);
        assert_eq!(
            tracks,
            vec![
                ("Kick".to_string(), "audio".to_string()),
                ("Bass Synth".to_string(), "midi".to_string()),
            ]
        );
    }

    #[test]
    fn xml_with_no_tracks_returns_empty_vec() {
        let xml = r#"<?xml version="1.0"?><Ableton><LiveSet><Tracks/></LiveSet></Ableton>"#;
        assert!(parse_tracks(xml).is_empty());
    }

    #[test]
    fn extract_bpm_finds_tempo_node() {
        let gz = make_gz(BPM_FIXTURE);
        let xml = decompress_als(&gz).expect("decompression should succeed");
        let bpm = extract_bpm(xml.as_bytes()).expect("bpm extraction should succeed");
        assert!((bpm - 140.0).abs() < 0.001, "expected 140.0, got {bpm}");
    }

    #[test]
    fn extract_bpm_defaults_to_120_when_missing() {
        let xml = r#"<?xml version="1.0"?><Ableton><LiveSet></LiveSet></Ableton>"#;
        let bpm = extract_bpm(xml.as_bytes()).expect("should not error");
        assert!((bpm - 120.0).abs() < 0.001, "expected 120.0 default, got {bpm}");
    }

    #[test]
    fn extract_clips_finds_audio_clip() {
        let clips = extract_clips(CLIP_FIXTURE.as_bytes()).expect("clip extraction should succeed");
        assert_eq!(clips.len(), 1);
        let c = &clips[0];
        assert_eq!(c.track_name, "Kick");
        assert_eq!(c.track_index, 0);
        assert_eq!(c.clip_name, "Kick Loop");
        assert!((c.start_beat - 0.0).abs() < 0.001);
        assert!((c.end_beat - 4.0).abs() < 0.001);
        assert_eq!(c.color_index, 5);
        assert_eq!(c.kind, "audio");
    }
}
