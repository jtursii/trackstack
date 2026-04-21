import React from 'react'

export interface FileTreeNode {
  name: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
  /** Optional Tailwind class applied to the node label — useful for color-coded diffs */
  labelClassName?: string
}

interface FileTreeProps {
  nodes: FileTreeNode[]
  onSelect?: (node: FileTreeNode) => void
  depth?: number
}

export function FileTree({ nodes, onSelect, depth = 0 }: FileTreeProps) {
  return (
    <ul className="text-sm font-mono leading-relaxed">
      {nodes.map((node, i) => (
        <li key={i}>
          <button
            className="flex items-center gap-1.5 w-full text-left px-2 py-0.5 rounded hover:bg-gray-700 transition-colors"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => onSelect?.(node)}
          >
            <span className="text-gray-500 text-xs select-none">
              {node.type === 'folder' ? '▶' : '·'}
            </span>
            <span className={node.labelClassName ?? 'text-gray-200'}>{node.name}</span>
          </button>
          {node.children && node.children.length > 0 && (
            <FileTree nodes={node.children} onSelect={onSelect} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  )
}
