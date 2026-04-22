'use client'

interface WelcomeViewProps {
  onSelectProject: () => void
  onSignOut: () => void
  error: string | null
  loading?: boolean
}

export default function WelcomeView({ onSelectProject, onSignOut, error, loading }: WelcomeViewProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-end px-4 py-3">
        <button
          onClick={onSignOut}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-gray-50">Trackstack</h1>
          <p className="text-gray-500 text-sm">Version control for Ableton Live producers</p>
        </div>

        <button
          onClick={onSelectProject}
          disabled={loading}
          className="flex items-center gap-2.5 px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-colors"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Parsing project…
            </>
          ) : (
            <>
              <FolderIcon />
              Select Ableton Project
            </>
          )}
        </button>

        {error && (
          <div className="max-w-sm rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <p className="text-xs text-gray-700 select-none">Pick a .als file to get started</p>
      </div>
    </div>
  )
}

function FolderIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M1.5 3A1.5 1.5 0 0 1 3 1.5h3.172a1.5 1.5 0 0 1 1.06.44l.829.828A1.5 1.5 0 0 0 9.12 3.25H13A1.5 1.5 0 0 1 14.5 4.75v7.75A1.5 1.5 0 0 1 13 14H3a1.5 1.5 0 0 1-1.5-1.5V3Z"
        fill="currentColor"
        opacity=".8"
      />
    </svg>
  )
}
