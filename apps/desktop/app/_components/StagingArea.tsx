'use client'

import { useState, useEffect } from 'react'
import type { ProjectDiff, ProjectSnapshot } from '../_types'
import { runCommitPipeline } from '../../lib/commitPipeline'
import type { PipelineProgress } from '../../lib/commitPipeline'
import {
  getCloudProject,
  getLatestCloudCommit,
  getCommitsAfterTimestamp,
  downloadAndRestoreCommit,
  type CommitWithFiles,
} from '../../lib/pullPipeline'

interface StagingAreaProps {
  projectName: string
  projectPath: string
  email: string
  snapshot: ProjectSnapshot
  diff: ProjectDiff
  onBack: () => void
  onSignOut: () => void
  onOpenRestoredProject: (path: string) => void
}

type PushState =
  | { phase: 'idle' }
  | { phase: 'pushing'; label: string }
  | { phase: 'success'; commitId: string }
  | { phase: 'error'; stepFailed: string; message: string }

type CloudState =
  | { status: 'checking' }
  | { status: 'up-to-date' }
  | { status: 'behind'; commitsAhead: number; latestCommit: CommitWithFiles }
  | { status: 'not-on-cloud' }
  | { status: 'error' }

type PullState =
  | { phase: 'idle' }
  | { phase: 'downloading'; current: number; total: number }
  | { phase: 'success'; folderPath: string }
  | { phase: 'error'; message: string }

interface LastPush {
  timestamp: string
  fileCount: number
}

const MAX_CHARS = 200
const TRACK_PAGE_SIZE = 8

function progressLabel(p: PipelineProgress, totalFiles: number): string {
  switch (p.step) {
    case 'project':   return 'Saving project…'
    case 'commit':    return 'Creating commit…'
    case 'uploading': return `Uploading ${p.done + 1} of ${totalFiles} files…`
    case 'files':     return 'Saving file records…'
  }
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

async function openInFinder(path: string) {
  try {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(path)
  } catch {}
}

export default function StagingArea({
  projectName,
  projectPath,
  email,
  snapshot,
  diff,
  onBack,
  onSignOut,
  onOpenRestoredProject,
}: StagingAreaProps) {
  const [commitMessage, setCommitMessage] = useState('')
  const [pushState, setPushState] = useState<PushState>({ phase: 'idle' })
  const [lastPush, setLastPush] = useState<LastPush | null>(null)
  const [showAllTracks, setShowAllTracks] = useState(false)
  const [cloudState, setCloudState] = useState<CloudState>({ status: 'checking' })
  const [pullState, setPullState] = useState<PullState>({ phase: 'idle' })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`trackstack:lastpush:${projectPath}`)
      if (raw) setLastPush(JSON.parse(raw) as LastPush)
    } catch {}
  }, [projectPath])

  // Cloud status check
  useEffect(() => {
    let cancelled = false
    async function checkCloud() {
      try {
        const cloudProject = await getCloudProject(projectPath)
        if (!cloudProject) {
          if (!cancelled) setCloudState({ status: 'not-on-cloud' })
          return
        }

        const lastPushRaw = localStorage.getItem(`trackstack:lastpush:${projectPath}`)
        const lastPushTimestamp = lastPushRaw ? (JSON.parse(lastPushRaw) as LastPush).timestamp : null

        const latestCommit = await getLatestCloudCommit(cloudProject.id)
        if (!latestCommit) {
          if (!cancelled) setCloudState({ status: 'up-to-date' })
          return
        }

        if (!lastPushTimestamp) {
          if (!cancelled) setCloudState({ status: 'behind', commitsAhead: 1, latestCommit })
          return
        }

        const ahead = await getCommitsAfterTimestamp(cloudProject.id, lastPushTimestamp)
        if (!cancelled) {
          setCloudState(
            ahead > 0
              ? { status: 'behind', commitsAhead: ahead, latestCommit }
              : { status: 'up-to-date' },
          )
        }
      } catch {
        if (!cancelled) setCloudState({ status: 'error' })
      }
    }
    checkCloud()
    return () => { cancelled = true }
  }, [projectPath])

  const totalChanged =
    diff.new_files.length + diff.modified_files.length + diff.deleted_files.length
  const totalUploads = diff.new_files.length + diff.modified_files.length
  const isPushing = pushState.phase === 'pushing'
  const canPush = commitMessage.trim().length > 0 && totalChanged > 0 && !isPushing

  const trackOverflow = snapshot.tracks.length - TRACK_PAGE_SIZE
  const visibleTracks = showAllTracks ? snapshot.tracks : snapshot.tracks.slice(0, TRACK_PAGE_SIZE)

  const handlePush = async () => {
    if (!canPush) return
    setPushState({ phase: 'pushing', label: 'Starting…' })
    const result = await runCommitPipeline(
      { projectName, projectPath, snapshot, diff, commitMessage: commitMessage.trim() },
      (p) => setPushState({ phase: 'pushing', label: progressLabel(p, totalUploads) }),
    )
    if (result.ok) {
      try {
        const info: LastPush = { timestamp: new Date().toISOString(), fileCount: totalChanged }
        localStorage.setItem(`trackstack:lastpush:${projectPath}`, JSON.stringify(info))
        setLastPush(info)
      } catch {}
      setCloudState({ status: 'up-to-date' })
      setPushState({ phase: 'success', commitId: result.commitId })
    } else {
      setPushState({ phase: 'error', stepFailed: result.stepFailed, message: result.error })
    }
  }

  const handlePull = async () => {
    if (cloudState.status !== 'behind') return
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return

    setPullState({ phase: 'downloading', current: 0, total: 0 })

    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const dest = await open({
        directory: true,
        title: 'Choose where to restore the project',
        defaultPath: projectPath.split(/[\\/]/).slice(0, -1).join('/') || undefined,
      })
      if (!dest) {
        setPullState({ phase: 'idle' })
        return
      }

      const folderPath = await downloadAndRestoreCommit(
        cloudState.latestCommit,
        dest as string,
        projectName,
        (current, total) => setPullState({ phase: 'downloading', current, total }),
      )
      setPullState({ phase: 'success', folderPath })
    } catch (err) {
      setPullState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Background orb */}
      <div
        className="fixed top-[-10%] right-[10%] w-[400px] h-[400px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' }}
      />

      {/* Top bar */}
      <header className="shrink-0 h-14 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm flex items-center justify-between px-6 z-10 relative">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold tracking-wider text-white text-sm shrink-0">trackstack</span>
          <span className="text-gray-700 shrink-0">/</span>
          <span className="text-gray-400 text-sm truncate">{projectName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-gray-600 text-xs hidden sm:block">{email}</span>
          <button
            onClick={onBack}
            disabled={isPushing}
            className="border border-gray-600 text-white rounded-xl px-4 py-1.5 text-xs hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <button
            onClick={onSignOut}
            disabled={isPushing}
            className="border border-gray-600 text-white rounded-xl px-4 py-1.5 text-xs hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Cloud pull banner */}
      {cloudState.status === 'behind' && pullState.phase === 'idle' && (
        <div className="shrink-0 bg-gradient-to-r from-blue-900/30 to-gray-900/30 border-b border-blue-800/50 px-6 py-3 flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-3 min-w-0">
            <CloudIcon />
            <div className="min-w-0">
              <p className="text-blue-300 text-sm font-medium">
                {cloudState.commitsAhead} {cloudState.commitsAhead === 1 ? 'commit' : 'commits'} available on cloud
              </p>
              <p className="text-gray-400 text-xs truncate mt-0.5">{cloudState.latestCommit.message}</p>
            </div>
          </div>
          <button
            onClick={handlePull}
            className="shrink-0 ml-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl px-5 py-2 hover:from-blue-500 hover:to-blue-400 transition-all duration-300 hover:scale-105 shadow-lg shadow-blue-900/40 text-sm"
          >
            Pull Latest
          </button>
        </div>
      )}

      {/* Pull progress banner */}
      {pullState.phase === 'downloading' && (
        <div className="shrink-0 bg-gradient-to-r from-blue-900/30 to-gray-900/30 border-b border-blue-800/50 px-6 py-3 z-10 relative">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-300 text-sm">
              {pullState.total > 0
                ? `Downloading ${pullState.current} of ${pullState.total} files…`
                : 'Starting download…'}
            </p>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: pullState.total > 0 ? `${(pullState.current / pullState.total) * 100}%` : '5%' }}
            />
          </div>
        </div>
      )}

      {/* Pull success banner */}
      {pullState.phase === 'success' && (
        <div className="shrink-0 bg-gradient-to-r from-green-900/30 to-gray-900/30 border-b border-green-800/50 px-6 py-3 flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-green-400">✓</span>
            <p className="text-green-300 text-sm truncate">Project restored to {pullState.folderPath}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={() => openInFinder(pullState.folderPath)}
              className="border border-gray-600 text-gray-300 rounded-xl px-3 py-1.5 text-xs hover:border-white hover:text-white transition-all"
            >
              Open in Finder
            </button>
            <button
              onClick={() => onOpenRestoredProject(pullState.folderPath)}
              className="border border-gray-600 text-gray-300 rounded-xl px-3 py-1.5 text-xs hover:border-white hover:text-white transition-all"
            >
              Open in Trackstack
            </button>
          </div>
        </div>
      )}

      {/* Pull error banner */}
      {pullState.phase === 'error' && (
        <div className="shrink-0 bg-gradient-to-r from-red-900/30 to-gray-900/30 border-b border-red-800/50 px-6 py-3 flex items-center justify-between z-10 relative">
          <p className="text-red-300 text-sm truncate">{pullState.message}</p>
          <button
            onClick={() => setPullState({ phase: 'idle' })}
            className="shrink-0 ml-4 border border-gray-600 text-gray-300 rounded-xl px-3 py-1.5 text-xs hover:text-white transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Body: two panels */}
      <div className="flex-1 min-h-0 flex relative z-10">

        {/* Left panel */}
        <aside className="w-72 shrink-0 border-r border-gray-800 bg-gray-900/50 flex flex-col">

          {/* Project stats + tracks */}
          <div className="p-6 border-b border-gray-800 overflow-y-auto max-h-[60vh]">
            <p className="text-white font-semibold text-lg truncate mb-4">{projectName}</p>

            <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-3">
              <span className="w-8 h-[1px] bg-gray-700" />
              Tracks {snapshot.tracks.length}
            </div>

            {snapshot.tracks.length === 0 ? (
              <p className="text-gray-600 text-sm italic">No tracks found</p>
            ) : (
              <div>
                {visibleTracks.map((track, i) => (
                  <div key={i} className="flex items-center justify-between py-1 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-600 text-xs shrink-0">▸</span>
                      <span className="text-gray-300 text-sm truncate">{track.name}</span>
                    </div>
                    <span
                      className={`text-xs shrink-0 uppercase tracking-[0.15em] font-medium ${
                        track.kind === 'midi' ? 'text-blue-400' : 'text-gray-500'
                      }`}
                    >
                      {track.kind}
                    </span>
                  </div>
                ))}
                {!showAllTracks && trackOverflow > 0 && (
                  <button
                    onClick={() => setShowAllTracks(true)}
                    className="text-gray-500 text-xs mt-2 pl-4 hover:text-gray-300 transition-colors"
                  >
                    +{trackOverflow} more
                  </button>
                )}
                {showAllTracks && snapshot.tracks.length > TRACK_PAGE_SIZE && (
                  <button
                    onClick={() => setShowAllTracks(false)}
                    className="text-gray-500 text-xs mt-2 pl-4 hover:text-gray-300 transition-colors"
                  >
                    Show less
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Last push */}
          <div className="p-6 flex-1">
            <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-3">
              <span className="w-8 h-[1px] bg-gray-700" />
              Last Push
            </div>
            {lastPush ? (
              <div className="space-y-1">
                <p className="text-gray-400 text-sm">{formatTimestamp(lastPush.timestamp)}</p>
                <p className="text-gray-500 text-xs">
                  {lastPush.fileCount} {lastPush.fileCount === 1 ? 'file' : 'files'} tracked
                </p>
              </div>
            ) : (
              <p className="text-gray-600 text-sm">No previous push</p>
            )}
          </div>

          {/* Sign out */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={onSignOut}
              disabled={isPushing}
              className="w-full border border-gray-600 text-white rounded-xl px-4 py-2 text-sm hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Right panel */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Changed files */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-4">
              <span className="w-8 h-[1px] bg-gray-700" />
              Changed Files {totalChanged > 0 ? totalChanged : ''}
            </div>

            {totalChanged === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
                <p className="text-gray-500 text-sm">Nothing to push.</p>
                <p className="text-gray-600 text-xs">No changes detected since your last commit.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {diff.new_files.length > 0 && (
                  <FileGroup label="New" count={diff.new_files.length} color="text-green-400" dot="bg-green-400" files={diff.new_files} />
                )}
                {diff.modified_files.length > 0 && (
                  <FileGroup label="Modified" count={diff.modified_files.length} color="text-yellow-400" dot="bg-yellow-400" files={diff.modified_files} />
                )}
                {diff.deleted_files.length > 0 && (
                  <FileGroup label="Deleted" count={diff.deleted_files.length} color="text-red-400" dot="bg-red-400" files={diff.deleted_files} />
                )}
              </div>
            )}
          </div>

          {/* Commit section */}
          <div className="shrink-0 border-t border-gray-800 p-6 bg-gray-900/50">
            {pushState.phase === 'success' ? (
              <SuccessBanner
                commitId={pushState.commitId}
                onNewPush={() => { setPushState({ phase: 'idle' }); setCommitMessage('') }}
              />
            ) : pushState.phase === 'error' ? (
              <ErrorBanner
                stepFailed={pushState.stepFailed}
                message={pushState.message}
                onDismiss={() => setPushState({ phase: 'idle' })}
              />
            ) : (
              <>
                <textarea
                  rows={2}
                  placeholder="Describe what changed in this session..."
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value.slice(0, MAX_CHARS))}
                  disabled={isPushing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && canPush) {
                      e.preventDefault()
                      handlePush()
                    }
                  }}
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-400 focus:outline-none text-sm resize-none transition-colors disabled:opacity-50"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-gray-600 text-xs">{commitMessage.length} / {MAX_CHARS}</span>
                  <button
                    onClick={handlePush}
                    disabled={!canPush}
                    className="bg-white text-black font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center gap-2"
                  >
                    {isPushing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-black rounded-full animate-spin" />
                        <span className="text-xs">{pushState.label}</span>
                      </>
                    ) : (
                      'Push to Cloud'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FileGroup({ label, count, color, dot, files }: { label: string; count: number; color: string; dot: string; files: string[] }) {
  return (
    <div>
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="text-xs uppercase tracking-[0.2em] font-medium">{label}</span>
        <span className="text-xs opacity-70">{count}</span>
      </div>
      <div className="space-y-0.5 pl-3">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-800/40 transition-all">
            <span className="text-sm shrink-0">🎧</span>
            <div className="min-w-0">
              <p className="text-gray-300 text-sm truncate">{basename(f)}</p>
              <p className="text-gray-600 text-xs truncate">{f}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SuccessBanner({ commitId, onNewPush }: { commitId: string; onNewPush: () => void }) {
  const short = commitId.slice(0, 7)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-green-900/20 border border-green-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-green-400">✓</span>
        <span className="text-green-300 text-sm">
          Pushed · <span className="font-mono text-green-400">{short}</span>
        </span>
      </div>
      <button
        onClick={onNewPush}
        className="shrink-0 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm hover:bg-white hover:text-black transition-all duration-300"
      >
        New Push
      </button>
    </div>
  )
}

function ErrorBanner({ stepFailed, message, onDismiss }: { stepFailed: string; message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 bg-red-900/20 border border-red-800/60 rounded-xl px-4 py-3">
        <p className="text-red-400 text-xs font-medium mb-1">Failed at: {stepFailed}</p>
        <p className="text-red-300/80 text-xs break-all">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm hover:bg-white hover:text-black transition-all duration-300"
      >
        Retry
      </button>
    </div>
  )
}

function CloudIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0" aria-hidden>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  )
}
