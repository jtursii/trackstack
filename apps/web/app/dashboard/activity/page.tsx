import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface ActivityCommit {
  id: string
  message: string
  track_names: string[]
  created_at: string
  project: { id: string; name: string } | null
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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ActivityPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('commits')
    .select('id, message, track_names, created_at, project:projects(id, name)')
    .order('created_at', { ascending: false })
    .limit(50)

  const commits = (data ?? []) as unknown as ActivityCommit[]

  return (
    <div className="px-8 py-10">
      <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-6">
        <span className="w-10 h-[2px] bg-gray-600" />
        Activity
      </div>

      <div className="bg-gray-900/70 border border-gray-700 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
        {commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
            <p className="text-white font-semibold">No activity yet</p>
            <p className="text-gray-500 text-sm max-w-xs">
              Push your first project from the Trackstack desktop app to see commits here.
            </p>
          </div>
        ) : (
          commits.map((commit, i) => {
            const visible = commit.track_names.slice(0, 3)
            const overflow = commit.track_names.length - 3
            return (
              <div
                key={commit.id}
                className={`flex items-start gap-4 px-6 sm:px-8 py-5 bg-gradient-to-r from-gray-900/50 to-gray-900/30 ${
                  i !== commits.length - 1 ? 'border-b border-gray-800/60' : ''
                }`}
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
          })
        )}
      </div>
    </div>
  )
}
