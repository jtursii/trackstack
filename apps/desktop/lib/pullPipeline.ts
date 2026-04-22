import { supabase } from '@trackstack/core'

export interface CommitFile {
  id: string
  filename: string
  status: string
  s3_key: string | null
}

export interface CommitWithFiles {
  id: string
  message: string
  created_at: string
  track_names: string[]
  commit_files: CommitFile[]
}

export interface CloudProject {
  id: string
  name: string
  local_path: string
  created_at: string
}

// ── Query helpers ──────────────────────────────────────────────────────────

export async function getCloudProject(localPath: string): Promise<CloudProject | null> {
  const { data } = await supabase
    .from('projects')
    .select('id, name, local_path, created_at')
    .eq('local_path', localPath)
    .maybeSingle()
  return data as CloudProject | null
}

export async function getLatestCloudCommit(projectId: string): Promise<CommitWithFiles | null> {
  const { data } = await supabase
    .from('commits')
    .select('id, message, created_at, track_names, commit_files(id, filename, status, s3_key)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as unknown as CommitWithFiles | null
}

export async function getCommitCount(projectId: string): Promise<number> {
  const { count } = await supabase
    .from('commits')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
  return count ?? 0
}

export async function getCommitsAfterTimestamp(
  projectId: string,
  timestamp: string,
): Promise<number> {
  const { count } = await supabase
    .from('commits')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gt('created_at', timestamp)
  return count ?? 0
}

export async function getCommitByIndex(
  projectId: string,
  index: number,
): Promise<CommitWithFiles | null> {
  const { data } = await supabase
    .from('commits')
    .select('id, message, created_at, track_names, commit_files(id, filename, status, s3_key)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(index, index)
    .maybeSingle()
  return data as unknown as CommitWithFiles | null
}

export async function getAllProjects(): Promise<CloudProject[]> {
  const { data } = await supabase
    .from('projects')
    .select('id, name, local_path, created_at')
    .order('created_at', { ascending: false })
  return (data ?? []) as CloudProject[]
}

export async function getProjectCommits(
  projectId: string,
  limit = 10,
): Promise<CommitWithFiles[]> {
  const { data } = await supabase
    .from('commits')
    .select('id, message, created_at, track_names, commit_files(id, filename, status, s3_key)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as CommitWithFiles[]
}

// ── Download + restore ─────────────────────────────────────────────────────

export async function downloadAndRestoreCommit(
  commit: CommitWithFiles,
  destinationFolder: string,
  projectName: string,
  onProgress: (current: number, total: number) => void,
): Promise<string> {
  const filesToDownload = commit.commit_files.filter(
    (f) => f.status !== 'deleted' && f.s3_key !== null,
  )

  // Build project folder path; append " (restored)" to avoid silent overwrites
  let projectFolder = `${destinationFolder}/${projectName} Project`

  const { invoke } = await import('@tauri-apps/api/core')

  for (let i = 0; i < filesToDownload.length; i++) {
    const file = filesToDownload[i]

    const { data: signedData, error: signedErr } = await supabase.storage
      .from('wav-files')
      .createSignedUrl(file.s3_key!, 300)

    if (signedErr || !signedData) {
      throw new Error(`Failed to get download URL for ${file.filename}: ${signedErr?.message ?? 'unknown'}`)
    }

    const response = await fetch(signedData.signedUrl)
    if (!response.ok) {
      throw new Error(`Failed to download ${file.filename}: HTTP ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    const bytes = Array.from(new Uint8Array(buffer))
    const destPath = `${projectFolder}/${file.filename}`

    await invoke('write_file_bytes', { path: destPath, bytes })
    onProgress(i + 1, filesToDownload.length)
  }

  return projectFolder
}
