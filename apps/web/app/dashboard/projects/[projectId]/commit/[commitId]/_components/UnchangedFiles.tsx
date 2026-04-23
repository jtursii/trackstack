'use client'

import { useState } from 'react'
import PlayableAudioFile from '../../../../../_components/PlayableAudioFile'

export interface UnchangedFile {
  filename: string
  s3_key: string
  commit_id: string
}

function basename(path: string): string {
  return path.split('/').at(-1) ?? path
}

export default function UnchangedFiles({ files }: { files: UnchangedFile[] }) {
  const [expanded, setExpanded] = useState(true)

  if (files.length === 0) return null

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-4 w-full text-left hover:text-gray-400 transition-colors group"
      >
        <span className="transition-transform duration-200 group-hover:text-gray-300">
          {expanded ? '▾' : '▸'}
        </span>
        Unchanged Files {files.length}
        <span className="flex-1 h-[1px] bg-gray-800" />
      </button>

      {expanded && (
        <div className="border border-gray-800 rounded-2xl overflow-hidden">
          {files.map((file, index) => (
            <div
              key={`${file.commit_id}-${file.filename}`}
              className={`flex flex-col bg-gradient-to-r from-gray-900/30 to-gray-900/20 ${
                index !== files.length - 1 ? 'border-b border-gray-800/60' : ''
              }`}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="text-lg shrink-0 opacity-40">🎧</span>
                <span className="flex-1 font-medium text-gray-500 truncate min-w-0">
                  {basename(file.filename)}
                </span>
                <span className="text-gray-600 text-xs shrink-0">
                  from {file.commit_id.slice(0, 7)}
                </span>
              </div>
              <div className="px-5 pb-4">
                <PlayableAudioFile filename={file.filename} s3Key={file.s3_key} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
