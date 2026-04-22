'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Static data ──────────────────────────────────────────────────────────────

const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    frequency: '/month',
    storage: '1 GB of tracked storage',
    blurb: 'Start sharing ideas while keeping everything versioned.',
    cta: 'Start for Free',
    ctaHref: '/signup',
    highlight: false,
    features: [
      '3 collaborators & 5 projects',
      'Waveform diffs on stems',
      'Community support',
    ],
  },
  {
    name: 'Plus',
    price: '$10',
    frequency: '/month',
    storage: '50 GB of tracked storage',
    blurb: 'Release-ready sessions, stems, and mixes with space to iterate.',
    cta: 'Upgrade to Plus',
    ctaHref: '/signup',
    highlight: true,
    features: [
      'Unlimited collaborators',
      'Snapshot automation history',
      'Priority feedback queue',
    ],
  },
  {
    name: 'Pro',
    price: '$25',
    frequency: '/month',
    storage: '500 GB of tracked storage',
    blurb: 'For studios and collaborators with massive catalogs and deadlines.',
    cta: 'Go Pro',
    ctaHref: '/signup',
    highlight: false,
    features: [
      'Enterprise SSO & audit logs',
      'Dolby Atmos mix archiving',
      'Dedicated producer success rep',
    ],
  },
]

const DEMO_FILES = [
  { type: 'folder', name: 'Ableton_Project', commit: 'Set up Ableton 11 session structure', time: '4 days ago' },
  { type: 'folder', name: 'Samples', commit: 'Drop in updated drum racks', time: '3 days ago' },
  { type: 'file', name: 'Ableton_Project/Session.als', commit: 'Added automation pass', time: '2 hours ago' },
  { type: 'file', name: 'Samples/Drums/clap.wav', commit: 'Tightened clap transient', time: '2 hours ago' },
  { type: 'file', name: 'Samples/Bass/sub-carbon.aif', commit: 'Committed low-end print', time: 'yesterday' },
  { type: 'file', name: 'Mixdowns/mix_v5.wav', commit: 'Printed mixdown v5', time: '18 minutes ago' },
]

// Background orbs
const ORB_CONFIGS = Array.from({ length: 6 }, (_, i) => ({
  size: 300 + i * 100,
  left: `${10 + i * 15}%`,
  top: `${10 + i * 10}%`,
  duration: `${8 + i * 2}s`,
  delay: `${i * 0.5}s`,
}))

// ─── Waveform ─────────────────────────────────────────────────────────────────
// Each bar gets a deterministic max-height and a phase offset via negative animationDelay.
// The CSS keyframe `waveBar` handles the ease-in-out bounce — no JS state needed.
const WAVEFORM_BARS = Array.from({ length: 20 }, (_, i) => {
  const maxH = Math.round(
    10 + Math.sin(i * 0.45) * 16 + Math.cos(i * 0.9) * 10 + Math.sin(i * 1.5) * 6,
  )
  return {
    maxH: Math.max(6, Math.min(52, maxH)),
    dur: (0.52 + (i % 7) * 0.055).toFixed(3),
    // negative delay = bar starts mid-animation at page load, creating staggered wave
    delay: `${-(i * 0.045).toFixed(3)}s`,
  }
})

// ─── Sonar rings ──────────────────────────────────────────────────────────────
// 5 emitter positions, 3 concentric rings each, staggered by 1/3 of duration.
const SONAR_EMITTERS = [
  { left: '14%',  top: '22%', maxSize: 180, dur: 4.2 },
  { left: '80%',  top: '14%', maxSize: 220, dur: 5.4 },
  { left: '18%',  top: '76%', maxSize: 160, dur: 4.8 },
  { left: '84%',  top: '70%', maxSize: 200, dur: 3.9 },
  { left: '52%',  top: '44%', maxSize: 260, dur: 6.2 },
]
const SONAR_RINGS = SONAR_EMITTERS.flatMap((e) =>
  [0, 1, 2].map((k) => ({
    left: e.left,
    top: e.top,
    maxSize: e.maxSize,
    dur: `${e.dur}s`,
    delay: `${(-(e.dur * k) / 3).toFixed(2)}s`,
  })),
)

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false)
  const pricingRef = useRef<HTMLDivElement>(null)
  const demoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-x-hidden">

      {/* ── Background orbs ─────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {ORB_CONFIGS.map((orb, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-5"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              width: orb.size,
              height: orb.size,
              left: orb.left,
              top: orb.top,
              animation: `float ${orb.duration} ease-in-out infinite`,
              animationDelay: orb.delay,
            }}
          />
        ))}
      </div>

      {/* ── Sonar rings ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {SONAR_RINGS.map((ring, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/[0.07]"
            style={{
              left: ring.left,
              top: ring.top,
              width: ring.maxSize,
              height: ring.maxSize,
              marginLeft: -(ring.maxSize / 2),
              marginTop: -(ring.maxSize / 2),
              animation: `sonarExpand ${ring.dur} ease-out infinite`,
              animationDelay: ring.delay,
            }}
          />
        ))}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="relative z-10 flex justify-between items-center px-6 md:px-10 py-6">
        <div className="text-white text-2xl font-bold tracking-wider">trackstack</div>
        <div className="flex items-center gap-6 text-gray-300 text-sm">
          <button
            className="hover:text-white transition-colors hidden md:block"
            onClick={() => demoRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            Demo
          </button>
          <button
            className="hover:text-white transition-colors hidden md:block"
            onClick={() => pricingRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            Pricing
          </button>
          <Link
            href="/login"
            className="px-4 py-2 border border-gray-600 text-white rounded-xl hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div
          className={`transform transition-all duration-1000 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text mb-6">
              trackstack
            </h1>

            {/* Waveform — pure CSS, smooth ease-in-out bounce per bar */}
            <div className="flex justify-center gap-[3px] h-16 items-end mb-6">
              {WAVEFORM_BARS.map((bar, i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 3,
                    height: bar.maxH, // initial height matches mid-animation so no jump on load
                    background: 'linear-gradient(to top, #374151, #ffffff)',
                    animation: `waveBar ${bar.dur}s ease-in-out infinite`,
                    animationDelay: bar.delay,
                    ['--bar-max' as string]: `${bar.maxH}px`,
                  }}
                />
              ))}
            </div>
          </div>

          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
            GitHub for music creators
          </p>

          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Cloud storage, version control, and collaboration tools designed for musicians.
            Track every beat, every revision, every breakthrough.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              Start Creating
            </Link>
            <button
              onClick={() => demoRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 border border-gray-600 text-white rounded-xl hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
            >
              Watch Demo
            </button>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl w-full mx-auto">
            {[
              {
                icon: '☁️',
                title: 'Cloud Storage',
                desc: 'Unlimited storage for your tracks, stems, and project files. Every version, always accessible.',
              },
              {
                icon: '🔄',
                title: 'Version Control',
                desc: 'Track every change, roll back to any version, and never lose a breakthrough take again.',
              },
              {
                icon: '🤝',
                title: 'Collaboration',
                desc: 'Work seamlessly with producers, artists, and engineers — wherever they are in the world.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-500 transition-all duration-300 hover:translate-y-[-4px] text-left"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-white text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Demo workspace ──────────────────────────────────────────── */}
      <div ref={demoRef} className="relative z-10 w-full px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 text-gray-500 text-xs uppercase tracking-[0.3em] mb-6">
            <span className="w-10 h-[2px] bg-gray-600" />
            Demo Workspace
          </div>

          <div className="bg-gray-900/70 border border-gray-700 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
            {/* Repo header */}
            <div className="border-b border-gray-800 px-6 sm:px-10 py-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">trackstack / AbletonSession</p>
                  <h2 className="text-white text-3xl font-semibold">ableton-live-demo</h2>
                  <p className="text-gray-400 mt-2 max-w-xl leading-relaxed">
                    Wireframe of an Ableton set hosted on trackstack — clone flow and file explorer inspired by GitHub.
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  {['Watch', 'Star', 'Fork'].map((label) => (
                    <button
                      key={label}
                      className="px-4 py-2 border border-gray-700 text-gray-300 rounded-xl hover:border-white hover:text-white transition-all text-sm"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Repo tabs */}
            <div className="border-b border-gray-800 px-6 sm:px-10 py-4 flex flex-wrap gap-4 text-sm uppercase tracking-wide">
              {['Code', 'Issues', 'Pull Requests', 'Actions', 'Insights'].map((tab) => (
                <div
                  key={tab}
                  className={`px-3 py-2 rounded-lg ${
                    tab === 'Code'
                      ? 'bg-white text-black font-semibold'
                      : 'text-gray-500 hover:text-white transition-colors cursor-pointer'
                  }`}
                >
                  {tab}
                </div>
              ))}
            </div>

            {/* Branch + clone */}
            <div className="px-6 sm:px-10 py-6 border-b border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm">
              <div className="flex items-center gap-3 text-gray-300">
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  main
                </div>
                <span className="text-gray-700">|</span>
                <span className="text-gray-500">6 branches · 2 tags</span>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-2 text-gray-300 flex items-center gap-3 w-full md:w-auto justify-between md:justify-start font-mono text-xs">
                <span className="uppercase tracking-[0.3em] text-gray-500 font-sans text-[10px] not-italic">Clone</span>
                <span>gh repo clone trackstack/ableton-live-demo</span>
              </div>
            </div>

            {/* File list */}
            <div className="px-6 sm:px-10 py-6">
              <div className="flex items-center gap-3 text-gray-500 text-[10px] uppercase tracking-[0.3em] mb-4">
                Files
                <span className="w-8 h-[1px] bg-gray-700" />
                Latest activity mirrors an Ableton folder hierarchy.
              </div>
              <div className="border border-gray-800 rounded-2xl overflow-hidden">
                {DEMO_FILES.map((file, index) => (
                  <div
                    key={file.name}
                    className={`flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 text-sm bg-gradient-to-r from-gray-900/50 to-gray-900/30 ${
                      index !== DEMO_FILES.length - 1 ? 'border-b border-gray-800/80' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <span className="text-xl">{file.type === 'folder' ? '📁' : '🎧'}</span>
                      <span className="font-medium text-white">{file.name}</span>
                    </div>
                    <div className="flex-1 text-gray-400">{file.commit}</div>
                    <div className="text-gray-600 text-[10px] uppercase tracking-[0.3em] shrink-0">{file.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Referral CTA ────────────────────────────────────────────── */}
      <div className="relative z-10 w-full px-6 py-8">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-gray-900/80 via-gray-800/80 to-gray-900/80 border border-gray-700 rounded-3xl p-8 md:p-12 shadow-[0_15px_60px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 mb-3">Referral Drop</p>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Invite a friend, receive your first month free.
              </h3>
              <p className="text-gray-400 max-w-xl leading-relaxed">
                Share your unique referral link with another artist. When they join any paid plan,
                we comp your next month automatically.
              </p>
            </div>
            <div className="flex flex-col gap-4 min-w-[220px]">
              <button className="w-full px-6 py-4 bg-white text-black font-semibold rounded-2xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105">
                Copy Invite Link
              </button>
              <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 text-center">
                Limit 3 free months per account
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <div ref={pricingRef} className="relative z-10 w-full px-6 py-24">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 mb-4">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Plans that scale with your sound
          </h2>
          <p className="text-gray-400 leading-relaxed">
            Keep the same immersive workflow and choose the storage tier that matches your catalog.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PRICING_TIERS.map((tier, index) => (
            <div
              key={tier.name}
              className={`relative bg-gradient-to-br from-gray-800/60 to-gray-900/60 border rounded-3xl p-8 flex flex-col gap-6 transition-all duration-300 hover:translate-y-[-4px] ${
                tier.highlight
                  ? 'border-gray-500 shadow-[0_0_35px_rgba(255,255,255,0.08)]'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black uppercase tracking-wide text-[10px] font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <div>
                <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-2">{tier.name}</p>
                <div className="flex items-baseline gap-2 text-white">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-gray-400 text-lg">{tier.frequency}</span>
                </div>
                <p className="text-gray-300 mt-3 text-sm">{tier.storage}</p>
              </div>

              <p className="text-gray-400 flex-1 leading-relaxed text-sm">{tier.blurb}</p>

              <ul className="text-gray-300 space-y-2.5 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaHref}
                className={`mt-auto w-full py-3 rounded-2xl font-semibold text-sm text-center transition-all duration-300 transform hover:scale-[1.02] ${
                  tier.highlight
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'border border-gray-700 text-white hover:border-white hover:bg-white hover:text-black'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── Affiliate footer ────────────────────────────────────────── */}
      <footer className="relative z-10 w-full px-6 py-16 border-t border-gray-800/60 mt-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mb-3">Affiliate Partners</p>
              <p className="text-lg text-white font-semibold">Curated tools for producers we trust.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                { name: 'Ableton Live Suite', url: 'https://ableton.com' },
                { name: 'Universal Audio Spark', url: 'https://spark.uaudio.com' },
                { name: 'Splice Sounds', url: 'https://splice.com' },
                { name: 'Loopcloud', url: 'https://loopcloud.com' },
                { name: 'XLN Audio', url: 'https://www.xlnaudio.com' },
              ].map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-gray-700 rounded-full text-gray-400 hover:text-white hover:border-white transition-all duration-200 text-sm"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 border-t border-gray-800/60">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-600 max-w-lg">
              When you buy through partner links, trackstack earns a commission that helps keep the music flowing.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <Link href="/login" className="hover:text-gray-400 transition-colors">Sign in</Link>
              <Link href="/signup" className="hover:text-gray-400 transition-colors">Sign up</Link>
              <span>© {new Date().getFullYear()} Trackstack</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
