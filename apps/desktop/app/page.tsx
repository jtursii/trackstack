'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@trackstack/core'
import WelcomeView from './_components/WelcomeView'
import StagingArea from './_components/StagingArea'
import LoginView from './_components/LoginView'
import type { ProjectDiff, ProjectSnapshot } from './_types'

// ── App state ──────────────────────────────────────────────────────────────

type AppState =
  | { phase: 'checking' }  // Resolving initial session from localStorage
  | { phase: 'auth' }      // Not authenticated — show login form
  | { phase: 'welcome' }   // Authenticated — show project picker
  | { phase: 'loading' }   // Parsing a .als file
  | {
      phase: 'staging'
      projectPath: string
      projectName: string
      snapshot: ProjectSnapshot
      diff: ProjectDiff
    }

// ── localStorage helpers ───────────────────────────────────────────────────

const snapshotKey = (projectPath: string) => `trackstack:snapshot:${projectPath}`

function loadSnapshot(projectPath: string): ProjectSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(projectPath))
    return raw ? (JSON.parse(raw) as ProjectSnapshot) : null
  } catch {
    return null
  }
}

function saveSnapshot(projectPath: string, snapshot: ProjectSnapshot) {
  try {
    localStorage.setItem(snapshotKey(projectPath), JSON.stringify(snapshot))
  } catch {}
}

const EMPTY_SNAPSHOT: ProjectSnapshot = { track_names: [], samples: {} }

// ── Page ──────────────────────────────────────────────────────────────────

export default function DesktopPage() {
  const [appState, setAppState] = useState<AppState>({ phase: 'checking' })
  const [error, setError] = useState<string | null>(null)

  // ── Auth bootstrap ───────────────────────────────────────────────────────
  // onAuthStateChange fires once on mount with the current session (INITIAL_SESSION),
  // which resolves the 'checking' phase without a separate getSession() call.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // Only transition from auth/checking states; preserve staging/welcome/loading.
        setAppState((prev) =>
          prev.phase === 'checking' || prev.phase === 'auth'
            ? { phase: 'welcome' }
            : prev,
        )
      } else {
        // Signed out or no session — always return to login.
        setAppState({ phase: 'auth' })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Project selection ────────────────────────────────────────────────────
  const handleSelectProject = useCallback(async () => {
    setError(null)

    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { invoke } = await import('@tauri-apps/api/core')

      const selected = await open({
        multiple: false,
        filters: [{ name: 'Ableton Live Set', extensions: ['als'] }],
      })
      if (!selected) return

      const projectPath = selected as string
      setAppState({ phase: 'loading' })

      const snapshot = await invoke<ProjectSnapshot>('parse_project', { projectPath })

      const previous = loadSnapshot(projectPath) ?? EMPTY_SNAPSHOT
      const diff = await invoke<ProjectDiff>('diff_project', {
        current: snapshot,
        previous,
      })

      saveSnapshot(projectPath, snapshot)

      const filename = projectPath.split(/[\\/]/).pop() ?? projectPath
      const projectName = filename.replace(/\.als$/i, '')

      setAppState({ phase: 'staging', projectPath, projectName, snapshot, diff })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setAppState({ phase: 'welcome' })
    }
  }, [])

  const handleBack = useCallback(() => {
    setAppState({ phase: 'welcome' })
    setError(null)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col select-none">
      {appState.phase === 'checking' && <CheckingOverlay />}

      {appState.phase === 'auth' && (
        <LoginView onLogin={() => setAppState({ phase: 'welcome' })} />
      )}

      {appState.phase === 'welcome' && (
        <WelcomeView
          onSelectProject={handleSelectProject}
          error={error}
        />
      )}

      {appState.phase === 'loading' && <LoadingOverlay />}

      {appState.phase === 'staging' && (
        <StagingArea
          projectName={appState.projectName}
          projectPath={appState.projectPath}
          snapshot={appState.snapshot}
          diff={appState.diff}
          onBack={handleBack}
        />
      )}
    </div>
  )
}

// ── Overlay components ─────────────────────────────────────────────────────

function CheckingOverlay() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-gray-800 border-t-gray-500 animate-spin" />
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="w-7 h-7 rounded-full border-2 border-brand-800 border-t-brand-400 animate-spin" />
      <p className="text-sm text-gray-500">Parsing project…</p>
    </div>
  )
}
