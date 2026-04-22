import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface CommitMeta {
  id: string
  created_at: string
  track_names: string[]
}

interface ProjectWithCommits {
  id: string
  name: string
  local_path: string
  created_at: string
  commits: CommitMeta[]
}

interface ActivityCommit {
  id: string
  message: string
  track_names: string[]
  created_at: string
  project: { id: string; name: string } | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${diffH}h ago`
  if (diffD < 7) return `${diffD}d ago`
  return formatDate(iso)
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default async function DashboardHome() {
  const supabase = await createClient()

  const [{ data: activityRaw }, { data: projectsRaw }] = await Promise.all([
    supabase
      .from('commits')
      .select('id, message, track_names, created_at, project:projects(id, name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('projects')
      .select('id, name, local_path, created_at, commits(id, created_at, track_names)')
      .order('created_at', { ascending: false }),
  ])

  const recentActivity = (activityRaw ?? []) as unknown as ActivityCommit[]
  const projects = (projectsRaw ?? []) as unknown as ProjectWithCommits[]

  // Stats
  const projectCount = projects.length
  const totalCommits = projects.reduce((sum, p) => sum + p.commits.length, 0)
  const uniqueTracks = new Set(
    projects.flatMap((p) => p.commits.flatMap((c) => c.track_names)),
  ).size

  // Pinned: most recently updated 4 projects
  const pinned = projects.slice(0, 4)

  // Push history: last 7 days
  const allCommits = projects.flatMap((p) => p.commits)
  const today = new Date()
  const pushHistory = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const hasCommit = allCommits.some((c) => c.created_at.slice(0, 10) === dateStr)
    const isToday = i === 6
    return { dateStr, hasCommit, isToday, label: DAY_LABELS[d.getDay()] }
  })

  return (
    <div className="px-8 py-10 grid grid-cols-3 gap-8">

      {/* ── Left column ───────────────────────────────────── */}
      <div className="col-span-2 space-y-10">

        {/* Recent activity */}
        <section>
          <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-6">
            <span className="w-10 h-[2px] bg-gray-600" />
            Recent Activity
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-gray-600 text-sm">No commits yet. Push your first project from the desktop app.</p>
          ) : (
            <div>
              {recentActivity.map((commit, i) => {
                const visible = commit.track_names.slice(0, 2)
                const overflow = commit.track_names.length - 2
                return (
                  <div
                    key={commit.id}
                    className={`flex items-start gap-4 py-4 ${i !== recentActivity.length - 1 ? 'border-b border-gray-800/60' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-sm">🎵</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <Link
                          href={`/dashboard/projects/${commit.project?.id}/commit/${commit.id}`}
                          className="text-white font-medium hover:text-gray-300 transition-colors"
                        >
                          {commit.message}
                        </Link>
                        {commit.project && (
                          <>
                            <span className="text-gray-600"> in </span>
                            <Link
                              href={`/dashboard/projects/${commit.project.id}`}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              {commit.project.name}
                            </Link>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {visible.map((name, j) => (
                          <span
                            key={j}
                            className="border border-gray-700 rounded-full px-2 py-0.5 text-gray-500 text-xs"
                          >
                            {name}
                          </span>
                        ))}
                        {overflow > 0 && (
                          <span className="text-gray-600 text-xs">+{overflow} more</span>
                        )}
                        <span className="ml-auto text-gray-600 text-xs shrink-0">
                          {formatTime(commit.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Pinned projects */}
        {pinned.length > 0 && (
          <section>
            <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-6">
              <span className="w-10 h-[2px] bg-gray-600" />
              Pinned
            </div>
            <div className="grid grid-cols-2 gap-4">
              {pinned.map((project) => {
                const commitCount = project.commits.length
                const lastDate =
                  commitCount > 0
                    ? [...project.commits].sort((a, b) =>
                        a.created_at < b.created_at ? 1 : -1,
                      )[0].created_at
                    : null

                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-5 hover:border-gray-500 transition-all duration-300 hover:translate-y-[-4px] block"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">📁</span>
                      <span className="text-white font-semibold truncate">{project.name}</span>
                    </div>
                    <p className="text-gray-500 text-xs truncate mb-4">{project.local_path}</p>
                    <div className="flex items-center justify-between">
                      <span className="border border-gray-700 rounded-full px-2.5 py-0.5 text-gray-500 text-xs">
                        {commitCount} {commitCount === 1 ? 'commit' : 'commits'}
                      </span>
                      {lastDate && (
                        <span className="text-gray-600 text-xs">{formatDate(lastDate)}</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── Right column ──────────────────────────────────── */}
      <div className="col-span-1 space-y-6">

        {/* Profile card */}
        <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-6">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 border border-gray-600 flex items-center justify-center mb-3">
              {/* Initials computed client-side would cause hydration mismatch; use a placeholder */}
              <span className="text-white font-semibold text-xl">✦</span>
            </div>
          </div>
          <div className="flex gap-2 border-t border-gray-700 pt-4">
            {[
              { value: projectCount, label: 'Projects' },
              { value: totalCommits, label: 'Commits' },
              { value: uniqueTracks, label: 'Tracks' },
            ].map((stat) => (
              <div key={stat.label} className="flex-1 flex flex-col items-center">
                <span className="text-white font-semibold text-lg">{stat.value}</span>
                <span className="text-gray-500 text-xs uppercase tracking-[0.2em] mt-0.5">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Push history */}
        <div>
          <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-4">
            <span className="w-6 h-[2px] bg-gray-600" />
            Push history
          </div>
          <div className="flex gap-1.5">
            {pushHistory.map((day) => (
              <div key={day.dateStr} className="flex flex-col items-center gap-1">
                <div
                  title={day.dateStr}
                  className={`w-8 h-8 rounded-md ${
                    day.hasCommit
                      ? 'bg-green-400/80'
                      : 'bg-gray-800 border border-gray-700'
                  } ${day.isToday ? 'ring-1 ring-gray-500' : ''}`}
                />
                <span className="text-gray-600 text-xs">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
