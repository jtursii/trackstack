import { createClient } from '@/lib/supabase/server'
import ProfileForm from './_components/ProfileForm'

interface Profile {
  id: string
  display_name: string | null
  username: string | null
  bio: string | null
  avatar_url: string | null
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email ?? ''

  const { data: profileRaw } = user
    ? await supabase.from('profiles').select('id, display_name, username, bio, avatar_url').eq('id', user.id).single()
    : { data: null }

  const profile = profileRaw as Profile | null

  return (
    <div className="px-8 py-10 max-w-2xl">
      <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-6">
        <span className="w-10 h-[2px] bg-gray-600" />
        Settings
      </div>

      {/* Profile section */}
      <div className="bg-gray-900/70 border border-gray-700 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm mb-6">
        <div className="px-6 sm:px-8 py-6 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Profile</h2>
          <p className="text-gray-500 text-sm mt-0.5">Your public profile information</p>
        </div>
        <div className="px-6 sm:px-8 py-6">
          <ProfileForm profile={profile} email={email} />
        </div>
      </div>

      {/* Account section */}
      <div className="bg-gray-900/70 border border-gray-700 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm mb-6">
        <div className="px-6 sm:px-8 py-6 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Account</h2>
          <p className="text-gray-500 text-sm mt-0.5">Your login credentials</p>
        </div>
        <div className="px-6 sm:px-8 py-6">
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-[0.2em] mb-2">
              Email
            </label>
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 text-sm">
              {email}
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-gray-900/70 border border-red-900/40 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="px-6 sm:px-8 py-6 border-b border-red-900/30">
          <h2 className="text-red-400 font-semibold text-lg">Danger Zone</h2>
          <p className="text-gray-500 text-sm mt-0.5">Irreversible actions</p>
        </div>
        <div className="px-6 sm:px-8 py-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-white text-sm font-medium">Delete account</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Permanently delete your account and all associated data.
            </p>
          </div>
          <button
            disabled
            className="shrink-0 border border-red-800/60 text-red-500/60 rounded-xl px-4 py-2 text-sm cursor-not-allowed"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  )
}
