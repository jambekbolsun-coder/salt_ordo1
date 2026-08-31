import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

const AUTH_TIMEOUT_MS = 15000

function withTimeout(operation, message) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS)
  })

  return Promise.race([Promise.resolve(operation), timeout])
    .finally(() => window.clearTimeout(timer))
}

function readableAuthError(error) {
  if (error?.code === 'email_not_confirmed') {
    return new Error('Подтвердите email по ссылке из письма, затем войдите снова.')
  }
  if (error?.code === 'invalid_credentials') {
    return new Error('Неверный email или пароль.')
  }
  if (error?.code === 'user_banned') {
    return new Error('Этот аккаунт заблокирован. Обратитесь к владельцу сайта.')
  }
  return error instanceof Error ? error : new Error('Не удалось выполнить вход.')
}

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
    let hydrationId = 0
    const scheduledHydrations = new Set()

    const loadStaff = async (userId) => {
      const { data, error } = await withTimeout(
        supabase
          .from('staff')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle(),
        'Проверка доступа заняла слишком много времени. Попробуйте ещё раз.',
      )

      if (error) throw error
      return data || null
    }

    const hydrate = async (nextSession) => {
      if (!mounted) return
      const currentHydration = ++hydrationId
      setSession(nextSession)

      if (!nextSession?.user) {
        setStaff(null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const staffData = await loadStaff(nextSession.user.id)
        if (mounted && currentHydration === hydrationId) setStaff(staffData)
      } catch {
        if (mounted && currentHydration === hydrationId) setStaff(null)
      } finally {
        if (mounted && currentHydration === hydrationId) setLoading(false)
      }
    }

    withTimeout(
      supabase.auth.getSession(),
      'Не удалось проверить текущую сессию. Обновите страницу.',
    )
      .then(({ data, error }) => {
        if (error) throw error
        return hydrate(data.session)
      })
      .catch(() => {
        if (!mounted) return
        setSession(null)
        setStaff(null)
        setLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Supabase can deadlock when another async Supabase request is awaited
      // directly inside this callback. Schedule hydration after Auth releases
      // its internal lock and never return the hydration promise.
      const timer = window.setTimeout(() => {
        scheduledHydrations.delete(timer)
        if (mounted) void hydrate(nextSession)
      }, 0)
      scheduledHydrations.add(timer)
    })

    return () => {
      mounted = false
      hydrationId += 1
      scheduledHydrations.forEach((timer) => window.clearTimeout(timer))
      scheduledHydrations.clear()
      subscription.subscription.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    if (!supabaseConfigured) throw new Error('Supabase пока не подключён к проекту.')

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      'Сервер долго не отвечает. Проверьте интернет и попробуйте ещё раз.',
    )
    if (error) throw readableAuthError(error)

    let { data: staffData, error: staffError } = await withTimeout(
      supabase
        .from('staff')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .maybeSingle(),
      'Не удалось проверить права доступа. Попробуйте ещё раз.',
    )

    if (staffError) throw staffError
    if (!staffData) {
      const { data: bootstrapData, error: bootstrapError } = await withTimeout(
        supabase.rpc('bootstrap_first_owner', { p_full_name:'Владелец Salt Ordo' }),
        'Не удалось настроить доступ владельца. Попробуйте ещё раз.',
      )
      if (!bootstrapError && bootstrapData) {
        staffData = bootstrapData
      } else {
        await supabase.auth.signOut()
        throw new Error('У этого аккаунта нет доступа к административной системе.')
      }
    }

    setSession(data.session)
    setStaff(staffData)
    setLoading(false)
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
    try {
      if (supabaseConfigured) {
        await withTimeout(supabase.auth.signOut(), 'Не удалось завершить сессию. Обновите страницу.')
      }
    } finally {
      setSession(null)
      setStaff(null)
      setLoading(false)
    }
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
