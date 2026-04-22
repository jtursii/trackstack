import { supabase } from '@trackstack/core'
import type { ProjectDiff, ProjectSnapshot } from '../app/_types'

export interface PipelineOpts {
  projectName: string
  projectPath: string
  snapshot: ProjectSnapshot
  diff: ProjectDiff
  commitMessage: string
}

export type PipelineProgress =
  | { step: 'project' }
  | { step: 'commit' }
  | { step: 'uploading'; done: number; total: number }
  | { step: 'files' }

export type PipelineResult =
  | { ok: true; commitId: string }
  | { ok: false; stepFailed: string; error: string }

export async function runCommitPipeline(
  opts: PipelineOpts,
  onProgress: (p: PipelineProgress) => void,
): Promise<PipelineResult> {
  const { projectName, projectPath, snapshot, diff, commitMessage } = opts

  // Derive the absolute Samples/ directory from the .als path.
  // On macOS paths are POSIX; normalise backslashes just in case.
  const parts = projectPath.replace(/\\/g, '/').split('/')
  parts.pop()
  const projectFolder = parts.join('/')

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, stepFailed: 'auth', error: 'Not authenticated' }

  // ── 2. Upsert project ────────────────────────────────────────────────────
  // Requires: CREATE UNIQUE INDEX ON projects(user_id, local_path);
  onProgress({ step: 'project' })
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .upsert({ user_id: user.id, name: projectName, local_path: projectPath }, { onConflict: 'user_id,local_path' })
    .select()
    .single()

  if (projectErr || !project)
    return { ok: false, stepFailed: 'project', error: projectErr?.message ?? 'Failed to save project' }

  // ── 3. Insert commit ─────────────────────────────────────────────────────
  onProgress({ step: 'commit' })
  const { data: commit, error: commitErr } = await supabase
    .from('commits')
    .insert({ project_id: project.id, message: commitMessage, track_names: snapshot.track_names })
    .select()
    .single()

  if (commitErr || !commit)
    return { ok: false, stepFailed: 'commit', error: commitErr?.message ?? 'Failed to create commit' }

  // ── 4. Upload new + modified files ───────────────────────────────────────
  const toUpload = [
    ...diff.new_files.map((f) => ({ filename: f, status: 'new' as const })),
    ...diff.modified_files.map((f) => ({ filename: f, status: 'modified' as const })),
  ]
  const uploadedKeys: Record<string, string> = {}

  for (let i = 0; i < toUpload.length; i++) {
    onProgress({ step: 'uploading', done: i, total: toUpload.length })

    const { filename } = toUpload[i]
    const normFilename = filename.replace(/\\/g, '/')
    const absolutePath = `${projectFolder}/Samples/${normFilename}`
    // Sanitize only the filename segments — UUIDs before the filename are safe.
    // Spaces → underscores; anything that isn't alphanumeric, dash, underscore,
    // dot, or forward-slash (path separator) is stripped.
    const safeFilename = normFilename
      .split('/')
      .map((seg) => seg.replace(/ /g, '_').replace(/[^a-zA-Z0-9\-_.]/g, ''))
      .join('/')
    const s3Key = `${user.id}/${project.id}/${commit.id}/${safeFilename}`

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const bytes: number[] = await invoke('read_file_bytes', { path: absolutePath })
      const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/wav' })

      const { error: uploadErr } = await supabase.storage
        .from('wav-files')
        .upload(s3Key, blob, { upsert: true })

      if (uploadErr)
        return {
          ok: false,
          stepFailed: 'upload',
          error: `Failed to upload ${normFilename}: ${uploadErr.message}`,
        }

      uploadedKeys[filename] = s3Key
    } catch (err) {
      return {
        ok: false,
        stepFailed: 'upload',
        error: `Failed to read ${normFilename}: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  // ── 5. Batch insert commit_files ─────────────────────────────────────────
  onProgress({ step: 'files' })

  const fileRows = [
    ...toUpload.map(({ filename, status }) => ({
      commit_id: commit.id,
      filename,
      status,
      s3_key: uploadedKeys[filename] ?? null,
    })),
    ...diff.deleted_files.map((filename) => ({
      commit_id: commit.id,
      filename,
      status: 'deleted' as const,
      s3_key: null,
    })),
  ]

  if (fileRows.length > 0) {
    const { error: filesErr } = await supabase.from('commit_files').insert(fileRows)
    if (filesErr) return { ok: false, stepFailed: 'commit_files', error: filesErr.message }
  }

  // ── 6. Persist snapshot ──────────────────────────────────────────────────
  try {
    localStorage.setItem(`trackstack:snapshot:${projectPath}`, JSON.stringify(snapshot))
  } catch {}

  return { ok: true, commitId: commit.id }
}
