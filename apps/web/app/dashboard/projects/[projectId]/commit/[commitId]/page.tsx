import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PlayableAudioFile from './_components/PlayableAudioFile'

interface CommitFileRow {
  id: string
  commit_id: string
  filename: string
  status: 'new' | 'modified' | 'deleted'
  s3_key: string | null
}

interface CommitRow {
  id: string
  project_id: string
  message: string
  track_names: string[]
  created_at: string
  project: { id: string; name: string } | null
}

const STATUS_TEXT: Record<'new' | 'modified' | 'deleted', string> = {
  new: 'text-green-400',
  modified: 'text-yellow-400',
  deleted: 'text-red-400',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function basename(path: string): string {
  return path.split('/').at(-1) ?? path
}

const TABS = ['Commits', 'Files', 'Settings'] as const

export default async function CommitPage({
  params,
}: {
  params: { projectId: string; commitId: string }
}) {
  const supabase = await createClient()

  const { data: commitRaw } = await supabase
    .from('commits')
    .select('*, project:projects(id, name)')
    .eq('id', params.commitId)
    .single()

  if (!commitRaw) notFound()
  const commit = commitRaw as CommitRow

  const { data: filesRaw } = await supabase
    .from('commit_files')
    .select('*')
    .eq('commit_id', params.commitId)
    .order('filename')

  const files = (filesRaw as CommitFileRow[] | null) ?? []
  const projectName = commit.project?.name ?? 'Project'

  return (
    <div className="px-8 py-10">
      <div className="bg-gray-900/70 border border-gray-700 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">

        {/* ── Repo header ─────────────────────────────────────────────── */}
        <div className="border-b border-gray-800 px-6 sm:px-10 py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-gray-500 mb-1">
                <Link href="/dashboard" className="hover:text-gray-400 transition-colors">
                  trackstack
                </Link>
                {' / '}
                <Link
                  href={`/dashboard/projects/${params.projectId}`}
                  className="hover:text-gray-400 transition-colors"
                >
                  {projectName}
                </Link>
                {' / '}
                <span className="font-mono">{commit.id.slice(0, 7)}</span>
              </p>
              <h1 className="text-white text-3xl font-semibold leading-tight">
                {commit.message}
              </h1>
            </div>
            <div className="shrink-0">
              <span className="border border-gray-700 rounded-xl px-4 py-2 text-gray-400 text-sm whitespace-nowrap">
                {formatDate(commit.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="border-b border-gray-800 px-6 sm:px-10 py-4 flex gap-2 text-sm uppercase tracking-wide">
          {TABS.map((tab) => (
            <div key={tab}>
              {tab === 'Commits' ? (
                <Link
                  href={`/dashboard/projects/${params.projectId}`}
                  className="block text-gray-600 border border-transparent px-3 py-2 hover:text-gray-400 transition-colors"
                >
                  {tab}
                </Link>
              ) : (
                <div
                  className={
                    tab === 'Files'
                      ? 'bg-white text-black font-semibold rounded-lg px-3 py-2'
                      : 'text-gray-600 border border-transparent px-3 py-2 cursor-default'
                  }
                >
                  {tab}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Branch / meta ───────────────────────────────────────────── */}
        <div className="border-b border-gray-800 px-6 sm:px-10 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {commit.track_names.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {commit.track_names.map((name, i) => (
                  <span
                    key={i}
                    className="border border-gray-700 rounded-full px-3 py-1 text-gray-400 text-xs"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-600 text-sm">No tracks recorded</span>
            )}
            <span className="text-gray-500 text-xs uppercase tracking-[0.3em] shrink-0">
              {files.length} {files.length === 1 ? 'file' : 'files'} changed
            </span>
          </div>
        </div>

        {/* ── File list ───────────────────────────────────────────────── */}
        <div className="px-6 sm:px-10 py-6">
          <div className="flex items-center gap-3 text-gray-400 text-xs uppercase tracking-[0.3em] mb-4">
            Changed Files
            <span className="w-8 h-[1px] bg-gray-700" />
          </div>

          {files.length === 0 ? (
            <div className="border border-gray-800 rounded-2xl py-16 flex items-center justify-center">
              <p className="text-gray-600 text-sm">No file changes recorded for this commit.</p>
            </div>
          ) : (
            <div className="border border-gray-800 rounded-2xl overflow-hidden">
              {files.map((file, index) => {
                const canPlay =
                  (file.status === 'new' || file.status === 'modified') && file.s3_key !== null

                return (
                  <div
                    key={file.id}
                    className={`flex flex-col bg-gradient-to-r from-gray-900/50 to-gray-900/30 ${
                      index !== files.length - 1 ? 'border-b border-gray-800/80' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <span className="text-lg shrink-0">🎧</span>
                      <span className="flex-1 font-medium text-white truncate min-w-0">
                        {basename(file.filename)}
                      </span>
                      <span
                        className={`shrink-0 text-xs uppercase tracking-[0.2em] font-medium ${STATUS_TEXT[file.status]}`}
                      >
                        {file.status}
                      </span>
                    </div>

                    {canPlay && (
                      <div className="px-5 pb-4">
                        <PlayableAudioFile filename={file.filename} s3Key={file.s3_key!} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
