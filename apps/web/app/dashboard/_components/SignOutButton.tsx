'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="border border-gray-600 text-white rounded-xl px-4 py-2 text-sm hover:bg-white hover:text-black transition-all duration-300"
    >
      Sign out
    </button>
  )
}
