import { createClient } from '@supabase/supabase-js'
import { consent, campaignAttribution } from './consent'

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
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: async (input, init) => {
        const requestUrl=new URL(String(input))
        if(requestUrl.pathname.startsWith('/rest/v1/rpc/')&&!window.location.pathname.startsWith('/admin')) {
          const name=requestUrl.pathname.split('/').pop()
          if(['create_public_order','create_public_lead','start_public_quiz','save_public_quiz_answer','complete_public_quiz','dismiss_public_quiz','track_public_event'].includes(name)) {
            return fetch('/api/index?route=public',{method:'POST',headers:{'Content-Type':'application/json','X-Salt-Request':'1'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({operation:name,payload:JSON.parse(init.body),consent:consent(),attribution:campaignAttribution()})})
          }
        }
        if(window.location.pathname.startsWith('/admin')) {
          const target=new URL(String(input))
          const headers=new Headers(init?.headers); headers.delete('authorization');headers.delete('apikey');headers.set('X-Salt-Request','1')
          const response=await fetch(`/api/index?route=proxy&path=${encodeURIComponent(target.pathname+target.search)}`,{...init,headers,credentials:'same-origin',cache:'no-store'})
          if(response.status===403){const data=await response.clone().json().catch(()=>({}));if(data.code==='MFA_REQUIRED')window.dispatchEvent(new Event('salt-mfa-required'))}
          if(response.status===401) window.dispatchEvent(new Event('salt-session-expired'))
          return response
        }
        return fetch(input, { ...init, cache: 'no-store' })
      } },
    })
  : null
