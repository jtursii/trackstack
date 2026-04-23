'use client'

import { useEffect, useRef } from 'react'
import { getAbletonColor } from '@trackstack/core'

interface ClipRegion {
  track_name: string
  track_index: number
  clip_name: string
  start_beat: number
  end_beat: number
  color_index: number
  kind: string
}

interface TrackColor {
  name: string
  kind: string
  color_index: number
}

interface TimelineThumbnailProps {
  clips: ClipRegion[]
  trackColors: TrackColor[]
  totalBeats?: number
  height?: number
}

export default function TimelineThumbnail({
  clips,
  trackColors,
  totalBeats,
  height = 80,
}: TimelineThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.offsetWidth || 600
    canvas.width = width
    canvas.height = height

    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, width, height)

    if (clips.length === 0) {
      ctx.fillStyle = '#4b5563'
      ctx.font = `${Math.max(10, height * 0.18)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('No clip data', width / 2, height / 2)
      return
    }

    const maxEnd = Math.max(...clips.map((c) => c.end_beat))
    const beats = totalBeats ?? (maxEnd > 0 ? maxEnd : 128)
    const uniqueTrackCount = new Set(clips.map((c) => c.track_index)).size || 1
    const trackHeight = Math.max(6, height / uniqueTrackCount)

    for (const clip of clips) {
      const x = (clip.start_beat / beats) * width
      const w = Math.max(1, ((clip.end_beat - clip.start_beat) / beats) * width)
      const y = clip.track_index * trackHeight
      const h = trackHeight - 1
      const radius = 2

      // hex color + '99' appends ~60% opacity in 8-digit hex
      ctx.fillStyle = getAbletonColor(clip.color_index) + '99'
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, radius)
      } else {
        // Fallback for environments without roundRect
        ctx.rect(x, y, w, h)
      }
      ctx.fill()
    }
  }, [clips, trackColors, totalBeats, height])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height }}
      className="block"
    />
  )
}
