import Link from 'next/link'

export default function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-gray-100">Project not found</h1>
        <p className="text-sm text-gray-500 max-w-xs">
          This project doesn&apos;t exist or you don&apos;t have access to it.
        </p>
      </div>
      <Link
        href="/dashboard/projects"
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to repositories
      </Link>
    </div>
  )
}
