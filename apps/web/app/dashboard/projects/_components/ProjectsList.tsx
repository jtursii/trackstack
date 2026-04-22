'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CommitMeta {
  id: string
  message: string
  created_at: string
}

interface ProjectRow {
  id: string
  name: string
  local_path: string
  created_at: string
  commits: CommitMeta[]
}

interface Props {
  projects: ProjectRow[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ProjectsList({ projects }: Props) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : projects

  return (
    <>
      {/* Search bar */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a repository..."
        className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-400 focus:outline-none transition-colors text-sm mb-6"
      />

      {/* List container */}
      <div className="bg-gray-900/70 border border-gray-700 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
            {query.trim() ? (
              <>
                <p className="text-white font-semibold">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-gray-500 text-sm">Try a different search term.</p>
              </>
            ) : (
              <>
                <p className="text-white font-semibold">No projects yet</p>
                <p className="text-gray-500 text-sm max-w-xs">
                  Open the Trackstack desktop app to push your first project.
                </p>
              </>
            )}
          </div>
        ) : (
          filtered.map((project, index) => {
            const commitCount = project.commits.length
            const sorted = [...project.commits].sort((a, b) =>
              a.created_at < b.created_at ? 1 : -1,
            )
            const lastCommit = sorted[0] ?? null
            const lastDate = lastCommit ? formatDate(lastCommit.created_at) : null

            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className={`flex items-center gap-5 px-6 sm:px-8 py-6 bg-gradient-to-r from-gray-900/50 to-gray-900/30 hover:from-gray-800/50 transition-all group ${
                  index !== filtered.length - 1 ? 'border-b border-gray-800' : ''
                }`}
              >
                <span className="text-xl shrink-0">📁</span>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-lg font-semibold truncate group-hover:text-gray-100 transition-colors">
                    {project.name}
                  </p>
                  <p className="text-gray-600 text-xs truncate mt-0.5 font-mono">
                    {project.local_path}
                  </p>
                  {lastCommit && (
                    <p className="text-gray-500 text-sm truncate mt-0.5">{lastCommit.message}</p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <span className="border border-gray-700 rounded-full px-3 py-1 text-gray-400 text-xs uppercase tracking-[0.2em]">
                    {commitCount} {commitCount === 1 ? 'commit' : 'commits'}
                  </span>
                  {lastDate && (
                    <span className="hidden sm:block text-gray-500 text-xs uppercase tracking-[0.3em]">
                      {lastDate}
                    </span>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </>
  )
}
