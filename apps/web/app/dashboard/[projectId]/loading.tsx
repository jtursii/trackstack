export default function ProjectLoading() {
  return (
    <div className="bg-gray-900/70 border border-gray-700 rounded-3xl overflow-hidden">
      {/* Repo header skeleton */}
      <div className="border-b border-gray-800 px-6 sm:px-10 py-8 animate-pulse">
        <div className="h-3 w-40 bg-gray-800/60 rounded-lg mb-3" />
        <div className="h-8 w-56 bg-gray-700/60 rounded-lg mb-2" />
        <div className="h-3 w-80 bg-gray-800/40 rounded-lg" />
      </div>

      {/* Tabs skeleton */}
      <div className="border-b border-gray-800 px-6 sm:px-10 py-4 flex gap-2 animate-pulse">
        <div className="h-8 w-20 bg-gray-700/60 rounded-lg" />
        <div className="h-8 w-14 bg-gray-800/40 rounded-lg" />
        <div className="h-8 w-20 bg-gray-800/40 rounded-lg" />
      </div>

      {/* Meta skeleton */}
      <div className="border-b border-gray-800 px-6 sm:px-10 py-5 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-20 bg-gray-800/60 rounded-xl" />
          <div className="h-4 w-32 bg-gray-800/40 rounded-lg" />
        </div>
        <div className="h-3 w-28 bg-gray-800/40 rounded-lg" />
      </div>

      {/* Commit rows skeleton */}
      <div className="px-6 sm:px-10 py-6">
        <div className="h-3 w-32 bg-gray-800/40 rounded-lg mb-4 animate-pulse" />
        <div className="border border-gray-800 rounded-2xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-4 animate-pulse ${
                i !== 4 ? 'border-b border-gray-800/80' : ''
              }`}
            >
              <div className="w-5 h-5 rounded bg-gray-800/60 shrink-0" />
              <div className="flex-1 h-4 bg-gray-700/60 rounded-lg" />
              <div className="hidden md:flex gap-1.5">
                <div className="h-5 w-16 bg-gray-800/60 rounded-full" />
                <div className="h-5 w-16 bg-gray-800/60 rounded-full" />
              </div>
              <div className="hidden sm:block h-3 w-28 bg-gray-800/40 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
