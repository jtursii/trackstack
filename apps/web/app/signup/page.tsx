'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'

type SignupState = 'idle' | 'loading' | 'confirm'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<SignupState>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setState('idle')
      return
    }

    setState('confirm')
  }

  if (state === 'confirm') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Link
            href="/"
            className="font-brand inline-block text-lg tracking-[0.3em] uppercase text-white mb-8 hover:text-gray-300 transition-colors"
          >
            Trackstack
          </Link>
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center mx-auto">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                <path d="M4 4h16v16H4V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M4 8l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Check your email</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              We sent a confirmation link to{' '}
              <span className="text-gray-200 font-medium">{email}</span>.
              Click it to activate your account.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm text-gray-400 hover:text-white transition-colors mt-2"
            >
              Back to sign in →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="font-brand inline-block text-lg tracking-[0.3em] uppercase text-white mb-6 hover:text-gray-300 transition-colors"
          >
            Trackstack
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
          <p className="text-gray-500 text-sm mt-2">Start version-controlling your projects</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2"
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
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
                placeholder="Min. 6 characters"
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
              />
            </div>

            {error && (
              <p role="alert" className="text-red-400 text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={state === 'loading'}
              className="w-full bg-white text-black rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] mt-2"
            >
              {state === 'loading' ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
