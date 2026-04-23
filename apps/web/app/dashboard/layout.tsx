import { createClient } from '@/lib/supabase/server'
import Sidebar from './_components/Sidebar'
import TopBar from './_components/TopBar'

interface Profile {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: projectsRaw }, { data: profileRaw }] = await Promise.all([
    supabase.from('projects').select('id, name').order('created_at', { ascending: false }),
    user
      ? supabase.from('profiles').select('id, display_name, username, avatar_url').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const projects = (projectsRaw ?? []) as { id: string; name: string }[]
  const profile = profileRaw as Profile | null

  return (
    <div className="flex min-h-screen">
      <Sidebar email={user?.email ?? ''} profile={profile} projects={projects} />
      <div className="ml-64 flex-1 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex flex-col">
        <TopBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
