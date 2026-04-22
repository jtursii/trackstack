'use client'

export default function DesktopError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-gray-100">Something went wrong</h1>
        <p className="text-sm text-gray-500 max-w-xs">
          {error.message || 'An unexpected error occurred.'}
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors"
      >
        Reload
      </button>
    </div>
  )
}
