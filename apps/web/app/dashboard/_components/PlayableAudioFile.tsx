'use client'

import { useState } from 'react'
import { AudioPlayer } from '@trackstack/ui'

interface Props {
  filename: string
  s3Key: string
}

type AudioState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; url: string }
  | { phase: 'error'; message: string }

export default function PlayableAudioFile({ filename, s3Key }: Props) {
  const [state, setState] = useState<AudioState>({ phase: 'idle' })

  async function handleLoad() {
    if (state.phase !== 'idle') return
    setState({ phase: 'loading' })

    try {
      const res = await fetch(`/api/audio-url?s3_key=${encodeURIComponent(s3Key)}`)
      const body = (await res.json()) as { url?: string; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Failed to get audio URL')
      setState({ phase: 'ready', url: body.url! })
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  if (state.phase === 'ready') {
    return <AudioPlayer src={state.url} title={filename} />
  }

  return (
    <div className="flex items-center justify-end gap-3">
      {state.phase === 'error' && (
        <span className="text-xs text-red-400">{state.message}</span>
      )}
      <button
        onClick={handleLoad}
        disabled={state.phase === 'loading'}
        className="border border-gray-700 rounded-xl px-3 py-1.5 text-gray-300 text-xs hover:border-white hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.phase === 'loading' ? (
          <>
            <span className="w-3 h-3 rounded-full border-2 border-gray-600 border-t-gray-300 animate-spin" />
            Loading…
          </>
        ) : (
          <>▶ Preview</>
        )}
      </button>
    </div>
  )
}
