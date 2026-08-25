import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    let mounted = true

    const hydrate = async (nextSession) => {
      if (!mounted) return
      setSession(nextSession)

      if (!nextSession?.user) {
        setStaff(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', nextSession.user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (!mounted) return
      setStaff(error ? null : (data || null))
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => hydrate(nextSession))

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    if (!supabaseConfigured) throw new Error('Supabase пока не подключён к проекту.')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    let { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError) throw staffError
    if (!staffData) {
      const { data: bootstrapData, error: bootstrapError } = await supabase.rpc('bootstrap_first_owner', { p_full_name:'Владелец Salt Ordo' })
      if (!bootstrapError && bootstrapData) {
        staffData = bootstrapData
      } else {
        await supabase.auth.signOut()
        throw new Error('У этого аккаунта нет доступа к административной системе.')
      }
    }

    setSession(data.session)
    setStaff(staffData)
    return { user: data.user, staff: staffData }
  }

  const signupFirstOwner = async (email, password, fullName) => {
    if (!supabaseConfigured) throw new Error('Supabase пока не подключён к проекту.')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    if (!data.session) return { confirmationRequired:true }
    const { data: staffData, error: staffError } = await supabase.rpc('bootstrap_first_owner', { p_full_name:fullName })
    if (staffError) throw staffError
    setSession(data.session)
    setStaff(staffData)
    return { confirmationRequired:false, staff:staffData }
  }

  const logout = async () => {
    if (supabaseConfigured) await supabase.auth.signOut()
    setSession(null)
    setStaff(null)
  }

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    staff,
    role: staff?.role || null,
    isStaff: Boolean(staff?.is_active),
    loading,
    login,
    signupFirstOwner,
    logout,
    supabaseConfigured,
  }), [session, staff, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
