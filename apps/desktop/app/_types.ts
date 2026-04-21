export interface ProjectSnapshot {
  track_names: string[]
  /** Relative path from Samples/ directory → SHA-256 hex digest */
  samples: Record<string, string>
}

export interface ProjectDiff {
  new_files: string[]
  modified_files: string[]
  deleted_files: string[]
}
