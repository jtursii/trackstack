'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatSegment(seg: string): string {
  if (UUID_RE.test(seg)) return seg.slice(0, 7)
  // Capitalize first letter, leave rest as-is
  return seg.charAt(0).toUpperCase() + seg.slice(1)
}

// Map raw segment to href prefix for building clickable crumbs
function buildCrumbs(segments: string[]): { label: string; href: string }[] {
  return segments.reduce<{ label: string; href: string }[]>((acc, seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    acc.push({ label: formatSegment(seg), href })
    return acc
  }, [])
}

export default function TopBar() {
  const pathname = usePathname()
  // segments: ['dashboard', 'projects', 'abc123', 'commit', 'def456']
  const segments = pathname.split('/').filter(Boolean)

  // Skip 'dashboard' — replaced by 'trackstack' wordmark
  const crumbs = buildCrumbs(segments.slice(1))

  return (
    <div className="h-14 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm flex items-center px-8 gap-3 shrink-0">
      <Link
        href="/dashboard"
        className="text-white font-bold tracking-wider hover:text-gray-300 transition-colors text-sm"
      >
        trackstack
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-3 text-gray-500 text-sm">
          <span className="text-gray-700">/</span>
          <Link href={crumb.href} className="hover:text-gray-300 transition-colors">
            {crumb.label}
          </Link>
        </span>
      ))}
    </div>
  )
}
