import { createClient } from '@supabase/supabase-js'

// Project-specific names prevent unrelated Vercel variables from overriding
// Salt Ordo's public Supabase configuration during a production build.
const url = import.meta.env.VITE_SALT_SUPABASE_URL
const key = import.meta.env.VITE_SALT_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigured = Boolean(url && key && !url.includes('YOUR_PROJECT_REF'))

// Keep credentials for this app window only, never in persistent localStorage.
// In storage-restricted browsers the session lives in memory until reload.
const sessionMemory = new Map()
export const adminAuthStorage = {
  getItem(name) {
    try { return sessionStorage.getItem(name) } catch { return sessionMemory.get(name) || null }
  },
  setItem(name, value) {
    try { sessionStorage.setItem(name, value) } catch { sessionMemory.set(name, value) }
  },
  removeItem(name) {
    sessionMemory.delete(name)
    try { sessionStorage.removeItem(name) } catch { /* Storage can be disabled. */ }
  },
}
export const ADMIN_AUTH_KEY = 'salt-ordo-admin-auth'

if (supabaseConfigured) {
  // Retire the previous Supabase localStorage session on this origin.
  try { localStorage.removeItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`) } catch { /* Storage can be disabled. */ }
}

export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        storage: adminAuthStorage,
        storageKey: ADMIN_AUTH_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    })
  : null
