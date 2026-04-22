import { createClient } from '@/lib/supabase/server'
import ProjectsList from './_components/ProjectsList'

interface CommitMeta {
  id: string
  message: string
  created_at: string
}

interface ProjectRow {
  id: string
  name: string
  local_path: string
  created_at: string
  commits: CommitMeta[]
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, local_path, created_at, commits(id, message, created_at)')
    .order('created_at', { ascending: false })

  const projects = (data as ProjectRow[] | null) ?? []

  return (
    <div className="px-8 py-10">
      <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-6">
        <span className="w-10 h-[2px] bg-gray-600" />
        Your Repositories
      </div>
      <ProjectsList projects={projects} />
    </div>
  )
}
