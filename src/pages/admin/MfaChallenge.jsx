import '../../security.css'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import { request } from '../../lib/crm'
export default function MfaChallenge(){
  const {user,mfa,loading,refresh,logout}=useAuth(),navigate=useNavigate()
  const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  if(loading)return <p role="status">Проверяем сессию…</p>
  if(!user)return <Navigate to="/admin/login" replace/>
  if(!mfa?.required)return <Navigate to="/admin/" replace/>
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{await request('mfa',{operation:'verify',factor_id:mfa.factors[0].id,code});setCode('');await refresh();navigate('/admin/',{replace:true})}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <main className="security-page"><section className="admin-panel"><h1>Подтвердите вход</h1><p>Введите код из приложения-аутентификатора. Клиентские данные откроются только после проверки.</p><form className="auth-form" onSubmit={submit}><label>Одноразовый код<input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)}/></label>{error&&<p role="alert" className="notice notice--error">{error}</p>}<button className="btn btn--primary" disabled={busy}>Подтвердить</button></form><p>Если телефон потерян, обратитесь к владельцу. Владелец восстанавливает доступ через Supabase Dashboard после проверки личности; пароль сам по себе не отключает MFA.</p><button className="btn btn--soft" onClick={logout}>Выйти</button></section></main>
}
