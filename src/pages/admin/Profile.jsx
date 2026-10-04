import { Link } from 'react-router-dom'
import { useState } from 'react'
import { KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'
import { useAuth } from '../../state/AuthContext'
import { request } from '../../lib/crm'

export default function Profile() {
  const { staff, user } = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const updatePassword = async (event) => {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try { await request('password',{password});setNotice('Пароль обновлён.');setPassword('') }
    catch(error){setError(error.message)} finally{setBusy(false)}
  }

  return <>
    <AdminPageHeader eyebrow="Аккаунт" title="Профиль" text="Данные сотрудника и безопасность входа."/>
    <p><Link className="btn btn--soft" to="/admin/security">Двухэтапный вход и сессии</Link></p>
    <div className="admin-two-col profile-grid">
      <section className="admin-panel profile-card">
        <span className="profile-card__avatar"><UserRound/></span>
        <h2>{staff?.full_name || 'Salt Ordo'}</h2>
        <p><Mail/>{staff?.email || user?.email}</p>
        <p><ShieldCheck/>{staff?.role || 'staff'}</p>
      </section>
      <section className="admin-panel">
        <div className="admin-panel__head"><div><span className="eyebrow">Безопасность</span><h2>Новый пароль</h2></div></div>
        <form className="profile-password" onSubmit={updatePassword}>
          <label><KeyRound/><input aria-label="Новый пароль" autoComplete="new-password" type="password" minLength={12} required value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="Минимум 12 символов"/></label>
          {notice && <div className="notice notice--success">{notice}</div>}
          {error && <div className="notice notice--error">{error}</div>}
          <button className="btn btn--primary" disabled={busy} type="submit">{busy ? 'Сохраняем…' : 'Обновить пароль'}</button>
        </form>
      </section>
    </div>
  </>
}
