'use client'

import { useState, useEffect } from 'react'

const CLUSTER_HEIGHTS = [
  [32, 48, 60, 44, 28],
  [20, 40, 52, 36, 24],
  [28, 56, 44, 60, 32],
  [24, 38, 52, 42, 20],
]

export default function WaveformBars() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % 4), 800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-end gap-3">
      {CLUSTER_HEIGHTS.map((cluster, ci) => (
        <div key={ci} className="flex items-end gap-0.5">
          {cluster.map((maxH, bi) => (
            <div
              key={bi}
              style={{
                height: ci === active ? maxH : 8,
                opacity: ci === active ? 1 : 0.3,
              }}
              className="w-[3px] rounded-full bg-gradient-to-t from-gray-600 to-white transition-all duration-300"
            />
          ))}
        </div>
      ))}
    </div>
  )
}
