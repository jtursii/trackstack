'use client'

import { useState, useEffect } from 'react'
import WaveformBars from './WaveformBars'
import { getCloudProject, getCommitsAfterTimestamp } from '../../lib/pullPipeline'

interface RecentProject {
  path: string
  name: string
}

type CloudStatus = 'loading' | 'up-to-date' | 'behind' | 'not-pushed'

interface CloudInfo {
  status: CloudStatus
  commitsAhead?: number
}

interface WelcomeViewProps {
  email: string
  onSelectProject: () => void
  onOpenPath: (path: string) => void
  onSignOut: () => void
  onPull: () => void
  error: string | null
}

function getRecentProjects(): RecentProject[] {
  if (typeof localStorage === 'undefined') return []
  const results: RecentProject[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('trackstack:snapshot:')) {
      const path = key.slice('trackstack:snapshot:'.length)
      const filename = path.split(/[\\/]/).pop() ?? path
      const name = filename.replace(/\.als$/i, '')
      results.push({ path, name })
    }
  }
  return results.slice(0, 3)
}

function getLastPushTimestamp(path: string): string | null {
  try {
    const raw = localStorage.getItem(`trackstack:lastpush:${path}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.timestamp ?? null
  } catch {
    return null
  }
}

export default function WelcomeView({
  email,
  onSelectProject,
  onOpenPath,
  onSignOut,
  onPull,
  error,
}: WelcomeViewProps) {
  const [recent, setRecent] = useState<RecentProject[]>([])
  const [cloudInfo, setCloudInfo] = useState<Record<string, CloudInfo>>({})

  useEffect(() => {
    const projects = getRecentProjects()
    setRecent(projects)

    // Kick off cloud status checks in parallel
    for (const proj of projects) {
      setCloudInfo((prev) => ({ ...prev, [proj.path]: { status: 'loading' } }))

      const lastPush = getLastPushTimestamp(proj.path)
      getCloudProject(proj.path).then(async (cloudProject) => {
        if (!cloudProject) {
          setCloudInfo((prev) => ({ ...prev, [proj.path]: { status: 'not-pushed' } }))
          return
        }
        if (!lastPush) {
          // Project is on cloud but no local push record — treat as behind
          setCloudInfo((prev) => ({ ...prev, [proj.path]: { status: 'behind', commitsAhead: 1 } }))
          return
        }
        const ahead = await getCommitsAfterTimestamp(cloudProject.id, lastPush)
        setCloudInfo((prev) => ({
          ...prev,
          [proj.path]: ahead > 0
            ? { status: 'behind', commitsAhead: ahead }
            : { status: 'up-to-date' },
        }))
      }).catch(() => {
        setCloudInfo((prev) => ({ ...prev, [proj.path]: { status: 'not-pushed' } }))
      })
    }
  }, [])

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Background orbs */}
      <div
        className="absolute top-[-10%] right-[15%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[10%] left-[-5%] w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' }}
      />

      {/* Top bar */}
      <header className="shrink-0 h-14 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm flex items-center justify-between px-6 z-10 relative">
        <span className="font-bold tracking-wider text-white text-sm">trackstack</span>
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

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-10 py-16 px-4 overflow-y-auto">
        <div className="flex flex-col items-center gap-10 max-w-lg w-full">
          <WaveformBars />

          <div className="text-center space-y-3">
            <h1 className="text-white text-3xl font-bold">Select a project</h1>
            {error ? (
              <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                Choose an Ableton .als file to begin tracking.
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={onSelectProject}
              className="bg-white text-black font-semibold rounded-xl px-10 py-3 hover:bg-gray-100 transition-all duration-300 hover:scale-105 text-sm"
            >
              Select Ableton Project
            </button>
            <button
              onClick={onPull}
              className="border border-gray-600 text-white rounded-xl px-6 py-2.5 text-sm hover:bg-white hover:text-black transition-all duration-300"
            >
              ↓ Restore a project from cloud
            </button>
          </div>

          {/* Recent projects */}
          {recent.length > 0 && (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em]">
                <span className="w-8 h-[1px] bg-gray-700" />
                Recent
              </div>
              <div className="space-y-2">
                {recent.map((proj) => {
                  const info = cloudInfo[proj.path]
                  return (
                    <button
                      key={proj.path}
                      onClick={() => onOpenPath(proj.path)}
                      className="w-full text-left py-3 px-4 rounded-xl border border-gray-700 bg-gray-800/30 hover:border-gray-500 transition-all flex items-start gap-3 group"
                    >
                      <span className="text-base shrink-0 mt-0.5">📁</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{proj.name}</p>
                        <p className="text-gray-500 text-xs truncate mt-0.5">{proj.path}</p>
                        {/* Cloud status badge */}
                        {info && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {info.status === 'loading' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse" />
                            )}
                            {info.status === 'up-to-date' && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                <span className="text-gray-500 text-xs">Up to date</span>
                              </>
                            )}
                            {info.status === 'behind' && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                                <span className="text-yellow-400 text-xs">
                                  {info.commitsAhead} {info.commitsAhead === 1 ? 'commit' : 'commits'} on cloud
                                </span>
                              </>
                            )}
                            {info.status === 'not-pushed' && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0" />
                                <span className="text-gray-600 text-xs">Not pushed yet</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-gray-600 text-xs shrink-0 group-hover:text-white transition-colors mt-0.5">
                        Open
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
