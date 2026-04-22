use flate2::read::GzDecoder;
use quick_xml::events::Event;
use quick_xml::Reader;
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

/// Extract track names from Ableton Live XML.
///
/// Looks for <EffectiveName Value="..."/> inside <Name> elements that are
/// direct children of <AudioTrack> or <MidiTrack>. Empty values are skipped.
pub fn parse_track_names(xml: &str) -> Vec<String> {
    let mut reader = Reader::from_str(xml);
    let mut buf = Vec::new();
    let mut names: Vec<String> = Vec::new();

    let mut depth: u32 = 0;
    let mut track_depth: u32 = 0;
    let mut in_track = false;
    let mut in_name = false;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                depth += 1;
                match e.name().as_ref() {
                    b"AudioTrack" | b"MidiTrack" if !in_track => {
                        in_track = true;
                        track_depth = depth;
                    }
                    b"Name" if in_track && !in_name && depth == track_depth + 1 => {
                        in_name = true;
                    }
                    // Handle non-self-closing <EffectiveName> (unusual but valid XML)
                    b"EffectiveName" if in_name => {
                        if let Some(name) = extract_value_attr(&e) {
                            names.push(name);
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Empty(e)) => {
                // Ableton always writes <EffectiveName Value="..."/> as self-closing
                if in_name && e.name().as_ref() == b"EffectiveName" {
                    if let Some(name) = extract_value_attr(&e) {
                        names.push(name);
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

    names
}

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

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;

    /// Build a gzip-compressed byte vec from a plain string — mirrors exactly
    /// what Ableton writes when it saves a .als file.
    fn make_gz(content: &str) -> Vec<u8> {
        let mut enc = GzEncoder::new(Vec::new(), Compression::default());
        enc.write_all(content.as_bytes()).unwrap();
        enc.finish().unwrap()
    }

    /// Minimal .als XML fixture: two named tracks plus one track whose
    /// EffectiveName is empty (should be excluded from results).
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

    #[test]
    fn decompress_and_parse_track_names() {
        let gz = make_gz(FIXTURE_XML);
        let xml = decompress_als(&gz).expect("decompression should succeed");
        let names = parse_track_names(&xml);
        assert_eq!(names, vec!["Kick", "Bass Synth"]);
    }

    #[test]
    fn empty_effective_name_is_excluded() {
        // Direct XML parse — no gzip round-trip needed to cover this edge case.
        let names = parse_track_names(FIXTURE_XML);
        assert_eq!(names, vec!["Kick", "Bass Synth"]);
    }

    #[test]
    fn xml_with_no_tracks_returns_empty_vec() {
        let xml = r#"<?xml version="1.0"?><Ableton><LiveSet><Tracks/></LiveSet></Ableton>"#;
        assert!(parse_track_names(xml).is_empty());
    }
}
