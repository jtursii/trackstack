import { createClient } from '@/lib/supabase/server'
import Sidebar from './_components/Sidebar'
import TopBar from './_components/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const [{ data: { user } }, { data: projectsRaw }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('projects')
      .select('id, name')
      .order('created_at', { ascending: false }),
  ])

  const projects = (projectsRaw ?? []) as { id: string; name: string }[]

  return (
    <div className="flex min-h-screen">
      <Sidebar email={user?.email ?? ''} projects={projects} />
      <div className="ml-64 flex-1 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex flex-col">
        <TopBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
