import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface CommitRow {
  id: string
  project_id: string
  message: string
  track_names: string[]
  created_at: string
}

interface ProjectRow {
  id: string
  name: string
  local_path: string
  created_at: string
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

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const TABS = ['Commits', 'Files', 'Settings'] as const

export default async function ProjectPage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = await createClient()

  const { data: projectRaw } = await supabase
    .from('projects')
    .select('id, name, local_path, created_at')
    .eq('id', params.projectId)
    .single()

  if (!projectRaw) notFound()
  const project = projectRaw as ProjectRow

  const { data: commitsRaw } = await supabase
    .from('commits')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  const commits = (commitsRaw as CommitRow[] | null) ?? []

  const commitCount = commits.length
  const uniqueTracks = new Set(commits.flatMap((c) => c.track_names))
  const trackCount = uniqueTracks.size
  const lastPushDate = commits[0]?.created_at ?? null

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
                {project.name}
              </p>
              <h1 className="text-white text-3xl font-semibold">{project.name}</h1>
              <p
                className="text-gray-500 text-sm mt-1 truncate max-w-md"
                title={project.local_path}
              >
                {project.local_path}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="border border-gray-700 rounded-xl px-4 py-2 text-gray-400 text-sm">
                {commitCount} {commitCount === 1 ? 'commit' : 'commits'}
              </span>
              <button
                title="Push from the Trackstack desktop app"
                disabled
                className="border border-gray-700 text-gray-500 rounded-xl px-4 py-2 text-sm cursor-default"
              >
                Push ↑
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="border-b border-gray-800 px-6 sm:px-10 py-4 flex gap-2 text-sm uppercase tracking-wide">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={
                tab === 'Commits'
                  ? 'bg-white text-black font-semibold rounded-lg px-3 py-2'
                  : 'text-gray-600 border border-transparent px-3 py-2 cursor-default'
              }
            >
              {tab}
            </div>
          ))}
        </div>

        {/* ── Branch / meta ───────────────────────────────────────────── */}
        <div className="border-b border-gray-800 px-6 sm:px-10 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-gray-300">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              main
            </div>
            <span className="text-gray-400 text-sm">
              {commitCount} {commitCount === 1 ? 'commit' : 'commits'}
              {trackCount > 0 && (
                <> · {trackCount} {trackCount === 1 ? 'track' : 'tracks'}</>
              )}
            </span>
          </div>
          {lastPushDate && (
            <span className="text-gray-500 text-xs uppercase tracking-[0.3em]">
              Last push {formatDateShort(lastPushDate)}
            </span>
          )}
        </div>

        {/* ── Commit list ─────────────────────────────────────────────── */}
        <div className="px-6 sm:px-10 py-6">
          <div className="flex items-center gap-3 text-gray-400 text-xs uppercase tracking-[0.3em] mb-4">
            Commit History
            <span className="w-8 h-[1px] bg-gray-700" />
          </div>

          {commits.length === 0 ? (
            <div className="border border-gray-800 rounded-2xl py-16 flex items-center justify-center">
              <p className="text-gray-600 text-sm">No commits yet for this project.</p>
            </div>
          ) : (
            <div className="border border-gray-800 rounded-2xl overflow-hidden">
              {commits.map((commit, index) => {
                const visibleTracks = commit.track_names.slice(0, 3)
                const overflow = commit.track_names.length - 3

                return (
                  <Link
                    key={commit.id}
                    href={`/dashboard/projects/${project.id}/commit/${commit.id}`}
                    className={`flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-gray-900/50 to-gray-900/30 hover:from-gray-800/50 transition-all group ${
                      index !== commits.length - 1 ? 'border-b border-gray-800/80' : ''
                    }`}
                  >
                    <span className="text-lg shrink-0">🎵</span>

                    <span className="font-medium text-white group-hover:text-gray-100 transition-colors min-w-0 truncate flex-1">
                      {commit.message}
                    </span>

                    {commit.track_names.length > 0 && (
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        {visibleTracks.map((name, i) => (
                          <span
                            key={i}
                            className="border border-gray-700 rounded-full px-2 py-0.5 text-gray-400 text-xs"
                          >
                            {name}
                          </span>
                        ))}
                        {overflow > 0 && (
                          <span className="text-gray-600 text-xs">+{overflow} more</span>
                        )}
                      </div>
                    )}

                    <time
                      dateTime={commit.created_at}
                      className="shrink-0 text-gray-500 text-xs uppercase tracking-[0.3em] hidden sm:block"
                    >
                      {formatDate(commit.created_at)}
                    </time>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
