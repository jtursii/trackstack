'use client'

import { useState } from 'react'
import { FileTree } from '@trackstack/ui'
import type { FileTreeNode } from '@trackstack/ui'
import type { ProjectDiff, ProjectSnapshot } from '../_types'

interface StagingAreaProps {
  projectName: string
  projectPath: string
  snapshot: ProjectSnapshot
  diff: ProjectDiff
  onBack: () => void
}

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

export default function StagingArea({
  projectName,
  projectPath,
  snapshot,
  diff,
  onBack,
}: StagingAreaProps) {
  const [commitMessage, setCommitMessage] = useState('')

  const totalChanged =
    diff.new_files.length + diff.modified_files.length + diff.deleted_files.length

  const diffNodes = buildDiffTree(diff)

  const handlePush = () => {
    const payload = {
      projectPath,
      commitMessage,
      snapshot,
      diff,
      timestamp: new Date().toISOString(),
    }
    console.log('[Trackstack] Push to cloud — stubbed:', payload)
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-gray-800 bg-gray-900">
        <button
          onClick={onBack}
          aria-label="Choose a different project"
          className="text-gray-500 hover:text-gray-200 transition-colors p-1 -ml-1 rounded"
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

      {/* ── Footer: commit + push ──────────────────────────────────── */}
      <footer className="shrink-0 border-t border-gray-800 bg-gray-900/80 px-4 py-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Describe this version…"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && commitMessage.trim()) handlePush()
          }}
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-600 transition-colors"
        />
        <button
          onClick={handlePush}
          disabled={!commitMessage.trim()}
          title={commitMessage.trim() ? undefined : 'Enter a commit message to push'}
          className="shrink-0 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
        >
          Push to Cloud
        </button>
      </footer>
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
