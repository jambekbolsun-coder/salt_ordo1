import { createClient } from '@supabase/supabase-js'

// Project-specific names prevent unrelated Vercel variables from overriding
// Salt Ordo's public Supabase configuration during a production build.
const url = import.meta.env.VITE_SALT_SUPABASE_URL
const key = import.meta.env.VITE_SALT_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigured = Boolean(url && key && !url.includes('YOUR_PROJECT_REF'))

export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
