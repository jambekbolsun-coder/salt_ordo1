import { createContext, useContext, useEffect, useState } from 'react'
import { request } from '../lib/crm'
import { supabaseConfigured, adminAuthStorage, ADMIN_AUTH_KEY } from '../lib/supabase'
const AuthContext=createContext(null)
export function AuthProvider({children}) {
  const [identity,setIdentity]=useState(null),[loading,setLoading]=useState(true)
  useEffect(()=>{
    adminAuthStorage.removeItem(ADMIN_AUTH_KEY)
    let alive=true
    const hydrate=async()=>{
      let pending=false;try{pending=Boolean(sessionStorage.getItem('salt-logout-pending'))}catch{/* Storage may be disabled. */}
      if(pending){await request('logout',{});try{sessionStorage.removeItem('salt-logout-pending')}catch{/* Restricted storage. */}return}
      return request('session')
    }
    hydrate().then(data=>{if(alive&&data)setIdentity(data)}).catch(()=>{}).finally(()=>{if(alive)setLoading(false)})
    const clear=()=>setIdentity(null)
    const challenge=()=>setIdentity(v=>v?{...v,mfa:{...v.mfa,required:true}}:v)
    window.addEventListener('salt-mfa-required',challenge)
    const crossTab=e=>{if(e.key==='salt-admin-logout')clear()}
    window.addEventListener('salt-session-expired',clear)
    window.addEventListener('storage',crossTab)
    return()=>{alive=false;window.removeEventListener('salt-mfa-required',challenge);window.removeEventListener('salt-session-expired',clear);window.removeEventListener('storage',crossTab)}
  },[])
  const login=async(email,password)=>{const data=await request('login',{email,password});try{sessionStorage.removeItem('salt-logout-pending')}catch{/* Restricted storage. */}setIdentity(data);return data}
  const logout=async()=>{
    try{localStorage.setItem('salt-admin-logout',String(Date.now()))}catch{/* Storage can be disabled. */}
    try {sessionStorage.setItem('salt-logout-pending','1')}catch{/* Restricted storage. */}
    try {await request('logout',{});sessionStorage.removeItem('salt-logout-pending')}catch {/* Local lock remains until server logout succeeds. */}
    setIdentity(null);adminAuthStorage.removeItem(ADMIN_AUTH_KEY)
    window.location.replace('/admin/login')
  }
  return <AuthContext.Provider value={{session:identity?{user:identity.user}:null,user:identity?.user,staff:identity?.staff,role:identity?.staff?.role,isStaff:Boolean(identity?.staff?.is_active)&&!identity?.mfa?.required,mfa:identity?.mfa,refresh:async()=>{const data=await request('session');setIdentity(data);return data},loading,login,logout,supabaseConfigured}}>{children}</AuthContext.Provider>
}
export const useAuth=()=>useContext(AuthContext)
