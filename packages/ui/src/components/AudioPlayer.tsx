import React, { useRef, useState, useEffect } from 'react'

interface AudioPlayerProps {
  src?: string
  title?: string
}

export function AudioPlayer({ src, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setPlaying(false)
    setProgress(0)
  }, [src])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio || !src) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play()
    }
    setPlaying(!playing)
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress((audio.currentTime / audio.duration) * 100)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white min-w-0">
      <button
        onClick={toggle}
        disabled={!src}
        className="shrink-0 w-8 h-8 flex items-center justify-center bg-brand-600 rounded-full hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <span className="flex gap-0.5">
            <span className="w-0.5 h-3 bg-white rounded-sm" />
            <span className="w-0.5 h-3 bg-white rounded-sm" />
          </span>
        ) : (
          <span className="ml-0.5 border-y-4 border-y-transparent border-l-[7px] border-l-white" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 truncate">{title ?? 'No track loaded'}</p>
        <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => { setPlaying(false); setProgress(0) }}
        />
      )}
    </div>
  )
}
