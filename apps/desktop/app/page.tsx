'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@trackstack/core'
import WelcomeView from './_components/WelcomeView'
import StagingArea from './_components/StagingArea'
import LoginView from './_components/LoginView'
import PullView from './_components/PullView'
import type { ProjectDiff, ProjectSnapshot } from './_types'

// ── App state ──────────────────────────────────────────────────────────────

type AppState =
  | { phase: 'checking' }
  | { phase: 'auth' }
  | { phase: 'welcome' }
  | { phase: 'loading' }
  | { phase: 'pull' }
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
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Migration: snapshots saved before the TrackEntry change had `track_names: string[]`
    if (Array.isArray(parsed.track_names) && !parsed.tracks) {
      return {
        tracks: parsed.track_names.map((name: string) => ({ name, kind: 'audio' as const })),
        samples: parsed.samples ?? {},
        bpm: parsed.bpm ?? 120,
        clip_data: parsed.clip_data ?? [],
        track_colors: parsed.track_colors ?? [],
      }
    }
    // Migration: snapshots saved before the visual metadata fields
    return {
      ...parsed,
      bpm: parsed.bpm ?? 120,
      clip_data: parsed.clip_data ?? [],
      track_colors: parsed.track_colors ?? [],
    } as ProjectSnapshot
  } catch {
    return null
  }
}

function saveSnapshot(projectPath: string, snapshot: ProjectSnapshot) {
  try {
    localStorage.setItem(snapshotKey(projectPath), JSON.stringify(snapshot))
  } catch {}
}

const EMPTY_SNAPSHOT: ProjectSnapshot = { tracks: [], samples: {}, bpm: 120, clip_data: [], track_colors: [] }

// ── Page ──────────────────────────────────────────────────────────────────

export default function DesktopPage() {
  const [appState, setAppState] = useState<AppState>({ phase: 'checking' })
  const [userEmail, setUserEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  // ── Auth bootstrap ───────────────────────────────────────────────────────
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserEmail(session.user.email ?? '')
        setAppState((prev) =>
          prev.phase === 'checking' || prev.phase === 'auth'
            ? { phase: 'welcome' }
            : prev,
        )
      } else {
        setUserEmail('')
        setAppState({ phase: 'auth' })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Open project by path (used by recent projects list) ──────────────────
  const handleOpenPath = useCallback(async (projectPath: string) => {
    setError(null)

    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      setError('Project access requires the Trackstack desktop app.')
      return
    }

    setAppState({ phase: 'loading' })

    try {
      const { invoke } = await import('@tauri-apps/api/core')

      const snapshot = await invoke<ProjectSnapshot>('parse_project', { projectPath })
      const previous = loadSnapshot(projectPath) ?? EMPTY_SNAPSHOT
      const diff = await invoke<ProjectDiff>('diff_project', { current: snapshot, previous })

      saveSnapshot(projectPath, snapshot)

      const filename = projectPath.split(/[\\/]/).pop() ?? projectPath
      const projectName = filename.replace(/\.als$/i, '')

      setAppState({ phase: 'staging', projectPath, projectName, snapshot, diff })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setAppState({ phase: 'welcome' })
    }
  }, [])

  // ── Project selection via file dialog ────────────────────────────────────
  const handleSelectProject = useCallback(async () => {
    setError(null)

    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      setError('Project access requires the Trackstack desktop app.')
      return
    }

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
      const diff = await invoke<ProjectDiff>('diff_project', { current: snapshot, previous })

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

  const handlePull = useCallback(() => {
    setAppState({ phase: 'pull' })
  }, [])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
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
          email={userEmail}
          onSelectProject={handleSelectProject}
          onOpenPath={handleOpenPath}
          onSignOut={handleSignOut}
          onPull={handlePull}
          error={error}
        />
      )}

      {appState.phase === 'pull' && (
        <PullView
          email={userEmail}
          onBack={handleBack}
          onSignOut={handleSignOut}
          onLoadProject={handleOpenPath}
        />
      )}

      {appState.phase === 'loading' && <LoadingOverlay />}

      {appState.phase === 'staging' && (
        <StagingArea
          projectName={appState.projectName}
          projectPath={appState.projectPath}
          email={userEmail}
          snapshot={appState.snapshot}
          diff={appState.diff}
          onBack={handleBack}
          onSignOut={handleSignOut}
          onOpenRestoredProject={handleOpenPath}
        />
      )}
    </div>
  )
}

// ── Overlay components ─────────────────────────────────────────────────────

function CheckingOverlay() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="w-5 h-5 rounded-full border-2 border-gray-700 border-t-gray-400 animate-spin" />
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="w-7 h-7 rounded-full border-2 border-gray-700 border-t-white animate-spin" />
      <p className="text-sm text-gray-500 tracking-wide">Parsing project…</p>
    </div>
  )
}
