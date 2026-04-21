import { FileTree, AudioPlayer } from '@trackstack/ui'
import type { FileTreeNode } from '@trackstack/ui'

const sampleTree: FileTreeNode[] = [
  {
    name: 'My Project',
    type: 'folder',
    children: [
      { name: 'Kick.wav', type: 'file' },
      { name: 'Snare.wav', type: 'file' },
      {
        name: 'Stems',
        type: 'folder',
        children: [{ name: 'Bass.wav', type: 'file' }],
      },
    ],
  },
]

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <h1 className="text-3xl font-bold tracking-tight">Trackstack</h1>
      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            File Browser
          </p>
          <FileTree nodes={sampleTree} />
        </div>
        <AudioPlayer title="No track selected" />
      </div>
    </main>
  )
}
