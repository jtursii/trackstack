'use client'

import { useState } from 'react'
import { supabase } from '@trackstack/core'
import WaveformBars from './WaveformBars'

interface LoginViewProps {
  onLogin: () => void
}

type Tab = 'signin' | 'signup'

export default function LoginView({ onLogin }: LoginViewProps) {
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    if (tab === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      onLogin()
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setInfo('Check your email to confirm your account.')
      setLoading(false)
    }
  }

  function switchTab(t: Tab) {
    setTab(t)
    setError(null)
    setInfo(null)
  }

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Background orbs */}
      <div
        className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-15%] right-[5%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' }}
      />

      {/* Wordmark */}
      <div className="absolute top-6 left-6">
        <span className="font-bold tracking-wider text-white text-sm">trackstack</span>
      </div>

      {/* Center column */}
      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center gap-8 px-4">
        <WaveformBars />

        <div className="text-center space-y-2">
          <h1 className="text-white text-2xl font-semibold">Sign in to trackstack</h1>
          <p className="text-gray-400 text-sm">Version control for Ableton producers.</p>
        </div>

        <div className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8">
          {/* Tab switcher */}
          <div className="flex gap-6 border-b border-gray-700 mb-6">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={`pb-3 text-sm font-medium transition-all duration-200 ${
                  tab === t
                    ? 'text-white border-b-2 border-white -mb-px'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="Email"
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-400 focus:outline-none text-sm transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              placeholder="Password"
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-400 focus:outline-none text-sm transition-colors"
            />

            {error && <p className="text-red-400 text-xs">{error}</p>}
            {info && <p className="text-green-400 text-xs">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 text-sm mt-2"
            >
              {loading
                ? tab === 'signin' ? 'Signing in…' : 'Creating account…'
                : tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom note */}
      <p className="absolute bottom-6 left-0 right-0 text-center text-gray-600 text-xs">
        Your session is stored locally and never shared.
      </p>
    </div>
  )
}
