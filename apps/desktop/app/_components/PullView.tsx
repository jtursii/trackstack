'use client'

import { useState, useEffect } from 'react'
import {
  getAllProjects,
  getProjectCommits,
  downloadAndRestoreCommit,
  type CloudProject,
  type CommitWithFiles,
} from '../../lib/pullPipeline'

interface PullViewProps {
  email: string
  onBack: () => void
  onSignOut: () => void
  onLoadProject: (path: string) => void
}

type RestoreState =
  | { phase: 'idle' }
  | { phase: 'downloading'; current: number; total: number }
  | { phase: 'success'; folderPath: string }
  | { phase: 'error'; message: string }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000)
  const diffD = Math.floor(diffH / 24)
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${diffH}h ago`
  if (diffD < 7) return `${diffD}d ago`
  return formatDate(iso)
}

async function openInFinder(path: string) {
  try {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(path)
  } catch {}
}

export default function PullView({ email, onBack, onSignOut, onLoadProject }: PullViewProps) {
  const [projects, setProjects] = useState<CloudProject[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [commitsByProject, setCommitsByProject] = useState<Record<string, CommitWithFiles[]>>({})
  const [loadingCommits, setLoadingCommits] = useState<string | null>(null)
  const [restoreStates, setRestoreStates] = useState<Record<string, RestoreState>>({})

  useEffect(() => {
    getAllProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleExpand(projectId: string) {
    if (expandedId === projectId) {
      setExpandedId(null)
      return
    }
    setExpandedId(projectId)
    if (commitsByProject[projectId]) return

    setLoadingCommits(projectId)
    const commits = await getProjectCommits(projectId, 10)
    setCommitsByProject((prev) => ({ ...prev, [projectId]: commits }))
    setLoadingCommits(null)
  }

  async function handleRestore(projectId: string, commitId: string, commit: CommitWithFiles, projectName: string) {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return

    setRestoreStates((prev) => ({ ...prev, [commitId]: { phase: 'downloading', current: 0, total: 0 } }))

    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const dest = await open({ directory: true, title: 'Where should this project be restored?' })
      if (!dest) {
        setRestoreStates((prev) => ({ ...prev, [commitId]: { phase: 'idle' } }))
        return
      }

      const folderPath = await downloadAndRestoreCommit(
        commit,
        dest as string,
        projectName,
        (current, total) =>
          setRestoreStates((prev) => ({
            ...prev,
            [commitId]: { phase: 'downloading', current, total },
          })),
      )

      setRestoreStates((prev) => ({ ...prev, [commitId]: { phase: 'success', folderPath } }))
    } catch (err) {
      setRestoreStates((prev) => ({
        ...prev,
        [commitId]: { phase: 'error', message: err instanceof Error ? err.message : String(err) },
      }))
    }
  }

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Background orb */}
      <div
        className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
      />

      {/* Top bar */}
      <header className="shrink-0 h-14 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm flex items-center justify-between px-6 z-10 relative">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="border border-gray-600 text-white rounded-xl px-4 py-1.5 text-xs hover:bg-white hover:text-black transition-all duration-300"
          >
            ← Back
          </button>
          <span className="font-bold tracking-wider text-white text-sm">trackstack</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-xs">{email}</span>
          <button
            onClick={onSignOut}
            className="border border-gray-600 text-white rounded-xl px-4 py-2 text-xs hover:bg-white hover:text-black transition-all duration-300"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-6">
            <span className="w-8 h-[1px] bg-gray-700" />
            Cloud Projects
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-6 h-6 rounded-full border-2 border-gray-700 border-t-gray-400 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-gray-500 text-sm">No projects in the cloud yet.</p>
              <p className="text-gray-600 text-xs mt-1">Push a project from the staging area first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const isExpanded = expandedId === project.id
                const commits = commitsByProject[project.id] ?? []
                const isLoadingCommits = loadingCommits === project.id

                return (
                  <div
                    key={project.id}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden transition-all duration-300 hover:border-gray-500"
                  >
                    {/* Project header row */}
                    <button
                      onClick={() => handleExpand(project.id)}
                      className="w-full text-left px-5 py-4 flex items-center gap-4"
                    >
                      <span className="text-lg shrink-0">📁</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">{project.name}</p>
                        <p className="text-gray-500 text-xs truncate mt-0.5">{project.local_path}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-gray-500 text-xs">{formatDate(project.created_at)}</span>
                        <span className={`text-gray-500 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          ▾
                        </span>
                      </div>
                    </button>

                    {/* Expanded commit list */}
                    {isExpanded && (
                      <div className="border-t border-gray-700/60">
                        {isLoadingCommits ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-5 h-5 rounded-full border-2 border-gray-700 border-t-gray-400 animate-spin" />
                          </div>
                        ) : commits.length === 0 ? (
                          <p className="text-gray-600 text-sm text-center py-8">No commits yet.</p>
                        ) : (
                          <div>
                            {commits.map((commit, ci) => {
                              const rs = restoreStates[commit.id] ?? { phase: 'idle' }
                              const visibleTracks = commit.track_names.slice(0, 3)
                              const overflow = commit.track_names.length - 3

                              return (
                                <div
                                  key={commit.id}
                                  className={`px-5 py-4 ${ci !== commits.length - 1 ? 'border-b border-gray-700/40' : ''}`}
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="text-base shrink-0 mt-0.5">🎵</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-gray-300 text-sm font-medium truncate">{commit.message}</p>
                                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        {visibleTracks.map((t, j) => (
                                          <span key={j} className="border border-gray-700 rounded-full px-2 py-0.5 text-gray-500 text-xs">
                                            {t}
                                          </span>
                                        ))}
                                        {overflow > 0 && (
                                          <span className="text-gray-600 text-xs">+{overflow} more</span>
                                        )}
                                        <span className="ml-auto text-gray-600 text-xs shrink-0">{formatTime(commit.created_at)}</span>
                                      </div>
                                    </div>

                                    {/* Restore controls */}
                                    <div className="shrink-0 ml-2">
                                      {rs.phase === 'idle' && (
                                        <button
                                          onClick={() => handleRestore(project.id, commit.id, commit, project.name)}
                                          className="border border-blue-700 text-blue-400 rounded-xl px-3 py-1.5 text-xs hover:bg-blue-900/30 transition-all whitespace-nowrap"
                                        >
                                          {ci === 0 ? 'Restore latest' : 'Restore this'}
                                        </button>
                                      )}
                                      {rs.phase === 'downloading' && (
                                        <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                                          <span className="text-gray-400 text-xs whitespace-nowrap">
                                            {rs.total > 0 ? `${rs.current} / ${rs.total} files` : 'Starting…'}
                                          </span>
                                          <div className="w-[120px] bg-gray-800 rounded-full h-1.5">
                                            <div
                                              className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full transition-all duration-300"
                                              style={{ width: rs.total > 0 ? `${(rs.current / rs.total) * 100}%` : '0%' }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                      {rs.phase === 'success' && (
                                        <div className="flex flex-col items-end gap-1.5">
                                          <span className="text-green-400 text-xs">✓ Restored</span>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => openInFinder(rs.folderPath)}
                                              className="border border-gray-600 text-gray-300 rounded-lg px-2 py-1 text-xs hover:border-white hover:text-white transition-all"
                                            >
                                              Open in Finder
                                            </button>
                                            <button
                                              onClick={() => onLoadProject(rs.folderPath)}
                                              className="border border-gray-600 text-gray-300 rounded-lg px-2 py-1 text-xs hover:border-white hover:text-white transition-all"
                                            >
                                              Open in Trackstack
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      {rs.phase === 'error' && (
                                        <div className="flex flex-col items-end gap-1.5 max-w-[160px]">
                                          <span className="text-red-400 text-xs text-right line-clamp-2">{rs.message}</span>
                                          <button
                                            onClick={() => setRestoreStates((prev) => ({ ...prev, [commit.id]: { phase: 'idle' } }))}
                                            className="border border-gray-600 text-gray-400 rounded-lg px-2 py-1 text-xs hover:text-white transition-all"
                                          >
                                            Retry
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
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
