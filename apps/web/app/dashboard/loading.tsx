export default function DashboardLoading() {
  return (
    <>
      <div className="flex items-center gap-3 mb-6 animate-pulse">
        <span className="w-10 h-[2px] bg-gray-700" />
        <div className="h-3 w-24 bg-gray-800 rounded-lg" />
      </div>

      <div className="bg-gray-900/70 border border-gray-700 rounded-3xl overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-5 px-6 sm:px-8 py-6 animate-pulse ${
              i !== 4 ? 'border-b border-gray-800' : ''
            }`}
          >
            <div className="w-6 h-6 rounded bg-gray-800/60 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-48 bg-gray-700/60 rounded-lg" />
              <div className="h-3 w-72 bg-gray-800/60 rounded-lg" />
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <div className="h-6 w-20 bg-gray-800/40 rounded-full" />
              <div className="hidden sm:block h-3 w-24 bg-gray-800/40 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
