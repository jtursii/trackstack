export interface Track {
  id: string
  name: string
  path: string
  bpm?: number
  key?: string
  duration?: number
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  userId: string
  tracks: Track[]
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  displayName?: string
  createdAt: string
}
