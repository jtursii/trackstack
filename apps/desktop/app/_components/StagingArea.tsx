'use client'

import { useState } from 'react'
import { FileTree } from '@trackstack/ui'
import type { FileTreeNode } from '@trackstack/ui'
import type { ProjectDiff, ProjectSnapshot } from '../_types'
import { runCommitPipeline } from '../../lib/commitPipeline'
import type { PipelineProgress } from '../../lib/commitPipeline'

interface StagingAreaProps {
  projectName: string
  projectPath: string
  snapshot: ProjectSnapshot
  diff: ProjectDiff
  onBack: () => void
}

type PushState =
  | { phase: 'idle' }
  | { phase: 'pushing'; label: string }
  | { phase: 'success'; commitId: string }
  | { phase: 'error'; stepFailed: string; message: string }

function buildDiffTree(diff: ProjectDiff): FileTreeNode[] {
  const nodes: FileTreeNode[] = []

  if (diff.new_files.length > 0) {
    nodes.push({
      name: `New  (${diff.new_files.length})`,
      type: 'folder',
      children: diff.new_files.map((f) => ({
        name: f,
        type: 'file',
        labelClassName: 'text-green-400',
      })),
    })
  }

  if (diff.modified_files.length > 0) {
    nodes.push({
      name: `Modified  (${diff.modified_files.length})`,
      type: 'folder',
      children: diff.modified_files.map((f) => ({
        name: f,
        type: 'file',
        labelClassName: 'text-yellow-400',
      })),
    })
  }

  if (diff.deleted_files.length > 0) {
    nodes.push({
      name: `Deleted  (${diff.deleted_files.length})`,
      type: 'folder',
      children: diff.deleted_files.map((f) => ({
        name: f,
        type: 'file',
        labelClassName: 'text-red-400',
      })),
    })
  }

  return nodes
}

function progressLabel(p: PipelineProgress, totalFiles: number): string {
  switch (p.step) {
    case 'project':   return 'Saving project…'
    case 'commit':    return 'Creating commit…'
    case 'uploading': return `Uploading ${p.done + 1} of ${totalFiles} files…`
    case 'files':     return 'Saving file records…'
  }
}

export default function StagingArea({
  projectName,
  projectPath,
  snapshot,
  diff,
  onBack,
}: StagingAreaProps) {
  const [commitMessage, setCommitMessage] = useState('')
  const [pushState, setPushState] = useState<PushState>({ phase: 'idle' })

  const totalChanged =
    diff.new_files.length + diff.modified_files.length + diff.deleted_files.length
  const totalUploads = diff.new_files.length + diff.modified_files.length
  const diffNodes = buildDiffTree(diff)

  const handlePush = async () => {
    if (!commitMessage.trim() || pushState.phase === 'pushing') return

    setPushState({ phase: 'pushing', label: 'Starting…' })

    const result = await runCommitPipeline(
      { projectName, projectPath, snapshot, diff, commitMessage: commitMessage.trim() },
      (p) => setPushState({ phase: 'pushing', label: progressLabel(p, totalUploads) }),
    )

    if (result.ok) {
      setPushState({ phase: 'success', commitId: result.commitId })
    } else {
      setPushState({ phase: 'error', stepFailed: result.stepFailed, message: result.error })
    }
  }

  const isPushing = pushState.phase === 'pushing'

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-gray-800 bg-gray-900">
        <button
          onClick={onBack}
          disabled={isPushing}
          aria-label="Choose a different project"
          className="text-gray-500 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors p-1 -ml-1 rounded"
        >
          <ChevronLeftIcon />
        </button>

        <h1 className="text-sm font-semibold text-gray-100 truncate">{projectName}</h1>

        {totalChanged > 0 ? (
          <span className="ml-auto shrink-0 text-xs px-2 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/60">
            {totalChanged} changed
          </span>
        ) : (
          <span className="ml-auto shrink-0 text-xs text-gray-600">up to date</span>
        )}
      </header>

      {/* ── Body: two columns ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex">
        {/* Left – Tracks */}
        <section className="w-56 shrink-0 border-r border-gray-800 flex flex-col">
          <div className="px-4 py-2.5 border-b border-gray-800/60">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Tracks&ensp;
              <span className="text-gray-600 font-normal normal-case tracking-normal text-xs">
                {snapshot.track_names.length}
              </span>
            </h2>
          </div>
          <ol className="flex-1 overflow-y-auto py-1">
            {snapshot.track_names.length === 0 ? (
              <li className="px-4 py-3 text-xs text-gray-700 italic">No tracks found</li>
            ) : (
              snapshot.track_names.map((name, i) => (
                <li
                  key={i}
                  title={name}
                  className="px-4 py-1.5 text-xs text-gray-300 hover:bg-gray-800/40 font-mono truncate transition-colors"
                >
                  {name}
                </li>
              ))
            )}
          </ol>
        </section>

        {/* Right – Changed Files */}
        <section className="flex-1 min-w-0 flex flex-col">
          <div className="px-4 py-2.5 border-b border-gray-800/60">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Changed Files
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2">
            {diffNodes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-xs text-gray-600">No changes since last push</p>
                <p className="text-xs text-gray-700">All sample files are identical</p>
              </div>
            ) : (
              <FileTree nodes={diffNodes} />
            )}
          </div>
        </section>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-gray-800 bg-gray-900/80 px-4 py-3">
        {pushState.phase === 'success' ? (
          <SuccessBanner commitId={pushState.commitId} onDone={onBack} />
        ) : pushState.phase === 'error' ? (
          <ErrorBanner
            stepFailed={pushState.stepFailed}
            message={pushState.message}
            onDismiss={() => setPushState({ phase: 'idle' })}
          />
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Describe this version…"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              disabled={isPushing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && commitMessage.trim()) handlePush()
              }}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-600 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={handlePush}
              disabled={!commitMessage.trim() || isPushing}
              title={commitMessage.trim() ? undefined : 'Enter a commit message to push'}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
            >
              {isPushing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-xs">{pushState.label}</span>
                </>
              ) : (
                'Push to Cloud'
              )}
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}

function SuccessBanner({ commitId, onDone }: { commitId: string; onDone: () => void }) {
  const short = commitId.slice(0, 8)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-md bg-green-950/50 border border-green-800/50">
        <CheckIcon />
        <span className="text-xs text-green-300">
          Pushed&ensp;
          <span className="font-mono text-green-400">{short}</span>
        </span>
      </div>
      <button
        onClick={onDone}
        className="shrink-0 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm font-medium text-gray-200 transition-colors"
      >
        Done
      </button>
    </div>
  )
}

function ErrorBanner({
  stepFailed,
  message,
  onDismiss,
}: {
  stepFailed: string
  message: string
  onDismiss: () => void
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 px-3 py-2 rounded-md bg-red-950/50 border border-red-800/50">
        <p className="text-xs text-red-400 font-medium mb-0.5">
          Failed at step: {stepFailed}
        </p>
        <p className="text-xs text-red-300/80 break-all">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 mt-0.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm font-medium text-gray-200 transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10 12L6 8l4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0 text-green-400">
      <path
        d="M2.5 7.5L5.5 10.5L11.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
