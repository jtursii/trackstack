'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

interface Props {
  email: string
  projects: { id: string; name: string }[]
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ProjectsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="8" height="8" rx="1" />
      <rect x="14" y="3" width="8" height="8" rx="1" />
      <rect x="2" y="13" width="8" height="8" rx="1" />
      <rect x="14" y="13" width="8" height="8" rx="1" />
    </svg>
  )
}

function ActivityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', icon: <HomeIcon /> },
  { label: 'Projects', href: '/dashboard/projects', icon: <ProjectsIcon /> },
  { label: 'Activity', href: '/dashboard/activity', icon: <ActivityIcon /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <SettingsIcon /> },
] as const

export default function Sidebar({ email, projects }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const username = email.split('@')[0] ?? ''
  const initials = username.slice(0, 2).toUpperCase()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href + '/') || pathname === href
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-gray-900/95 border-r border-gray-800 flex flex-col z-20">

      {/* ── Profile block ──────────────────────────────────── */}
      <div className="px-4 py-6 border-b border-gray-800">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 border border-gray-600 flex items-center justify-center mb-3">
          <span className="text-white font-semibold text-sm">{initials}</span>
        </div>
        <p className="text-white font-semibold text-sm">{username}</p>
        <p className="text-gray-500 text-xs mt-0.5 truncate">{email}</p>
        <span className="text-gray-600 text-xs mt-1 block">Edit profile</span>
      </div>

      {/* ── Nav items ──────────────────────────────────────── */}
      <nav className="px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all mb-0.5 ${
              isActive(item.href)
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* ── Repositories list ──────────────────────────────── */}
      <div className="px-3 py-4 border-t border-gray-800 flex-1 overflow-y-auto min-h-0">
        <p className="text-gray-600 text-xs uppercase tracking-[0.25em] px-3 mb-2">
          Repositories
        </p>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/dashboard/projects/${project.id}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
              pathname === `/dashboard/projects/${project.id}` ||
              pathname.startsWith(`/dashboard/projects/${project.id}/`)
                ? 'text-white bg-gray-800/60'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <span className="shrink-0 text-base">📁</span>
            <span className="truncate">{project.name}</span>
          </Link>
        ))}
        {projects.length > 0 && (
          <Link
            href="/dashboard/projects"
            className="block px-3 mt-2 text-gray-600 text-xs hover:text-gray-400 transition-colors"
          >
            Show all repositories
          </Link>
        )}
        {projects.length === 0 && (
          <p className="px-3 text-gray-700 text-xs">No repositories yet</p>
        )}
      </div>

      {/* ── Sign out ───────────────────────────────────────── */}
      <div className="border-t border-gray-800 px-4 py-4">
        <button
          onClick={handleSignOut}
          className="w-full border border-gray-700 text-gray-400 rounded-xl py-2 text-sm hover:border-white hover:text-white transition-all"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
