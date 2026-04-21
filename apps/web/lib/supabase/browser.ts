import { createBrowserClient } from '@supabase/ssr'

/**
 * Call inside a Client Component to get a cookie-aware Supabase client.
 * Sessions written here are visible to the Next.js middleware (cookie-based),
 * which is why we use createBrowserClient instead of the core singleton.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
