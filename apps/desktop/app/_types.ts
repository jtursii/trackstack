export interface TrackEntry {
  name: string
  kind: 'audio' | 'midi'
}

export interface ClipRegion {
  track_name: string
  track_index: number
  clip_name: string
  start_beat: number
  end_beat: number
  color_index: number
  kind: string
}

export interface TrackColor {
  name: string
  kind: string
  color_index: number
}

export interface ProjectSnapshot {
  tracks: TrackEntry[]
  /** Relative path from Samples/ directory → SHA-256 hex digest */
  samples: Record<string, string>
  bpm: number
  clip_data: ClipRegion[]
  track_colors: TrackColor[]
}

export interface ProjectDiff {
  new_files: string[]
  modified_files: string[]
  deleted_files: string[]
}
