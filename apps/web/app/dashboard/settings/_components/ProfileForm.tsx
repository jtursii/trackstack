'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { Avatar } from '@trackstack/ui'

interface Profile {
  id: string
  display_name: string | null
  username: string | null
  bio: string | null
  avatar_url: string | null
}

interface Props {
  profile: Profile | null
  email: string
}

export default function ProfileForm({ profile, email }: Props) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setSaving(false); return }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        display_name: displayName || null,
        username: username || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      })
      .eq('id', user.id)

    setSaving(false)
    if (updateErr) {
      setError(updateErr.message)
    } else {
      setSaved(true)
    }
  }

  const previewProfile = {
    display_name: displayName || null,
    username: username || null,
    avatar_url: avatarUrl || null,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar profile={previewProfile} email={email} size="lg" />
        <div>
          <p className="text-white text-sm font-medium">
            {displayName || username || email.split('@')[0]}
          </p>
          <p className="text-gray-500 text-xs">{email}</p>
        </div>
      </div>

      <div>
        <label className="block text-gray-400 text-xs uppercase tracking-[0.2em] mb-2">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => { setDisplayName(e.target.value); setSaved(false) }}
          placeholder="Your display name"
          className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 text-sm focus:outline-none focus:border-gray-500 placeholder-gray-600"
        />
      </div>

      <div>
        <label className="block text-gray-400 text-xs uppercase tracking-[0.2em] mb-2">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setSaved(false) }}
          placeholder="your-username"
          className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 text-sm focus:outline-none focus:border-gray-500 placeholder-gray-600"
        />
      </div>

      <div>
        <label className="block text-gray-400 text-xs uppercase tracking-[0.2em] mb-2">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => { setBio(e.target.value); setSaved(false) }}
          placeholder="Tell us about yourself"
          rows={3}
          className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 text-sm focus:outline-none focus:border-gray-500 placeholder-gray-600 resize-none"
        />
      </div>

      <div>
        <label className="block text-gray-400 text-xs uppercase tracking-[0.2em] mb-2">
          Avatar URL
        </label>
        <input
          type="url"
          value={avatarUrl}
          onChange={(e) => { setAvatarUrl(e.target.value); setSaved(false) }}
          placeholder="https://..."
          className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 text-sm focus:outline-none focus:border-gray-500 placeholder-gray-600"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="border border-gray-600 text-gray-300 rounded-xl px-6 py-2.5 text-sm hover:border-white hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
      </button>
    </div>
  )
}
