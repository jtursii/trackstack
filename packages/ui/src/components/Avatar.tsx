'use client'

import React from 'react'

interface AvatarProfile {
  display_name?: string | null
  username?: string | null
  avatar_url?: string | null
}

interface AvatarProps {
  profile?: AvatarProfile | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

const TEXT_CLASSES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
}

export function Avatar({ profile, email, size = 'md' }: AvatarProps) {
  const avatarUrl = profile?.avatar_url?.trim()
  const name = profile?.display_name?.trim() || profile?.username?.trim() || email?.trim()
  const initials = name ? name.slice(0, 2).toUpperCase() : '??'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? 'user'}
        className={`${SIZE_CLASSES[size]} rounded-full object-cover border border-gray-700 flex-shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-full bg-gradient-to-br from-gray-600 to-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0`}
    >
      <span className={`text-white font-semibold ${TEXT_CLASSES[size]}`}>{initials}</span>
    </div>
  )
}
