'use client'

import { useState } from 'react'
import { supabase } from '@trackstack/core'

interface LoginViewProps {
  onLogin: () => void
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // onLogin() fires immediately; onAuthStateChange in page.tsx is a safety net.
    onLogin()
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-50">Trackstack</h1>
        <p className="text-gray-500 text-sm">Sign in to continue</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4"
      >
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-600 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-600 transition-colors"
          />
        </div>

        {error && (
          <p role="alert" className="text-red-400 text-xs">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2.5 text-sm font-medium transition-colors mt-2"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
