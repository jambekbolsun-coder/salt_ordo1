import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Plus, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'
import { createStaffAccount, listStaff, updateStaff } from '../../lib/api'
import { useAuth } from '../../state/AuthContext'

const roleLabels = { owner:'Владелец', admin:'Администратор', manager:'Менеджер', content:'Контент-менеджер' }

export default function Staff() {
  const { role } = useAuth()
  const canManage = ['owner','admin'].includes(role)
  const [staff,setStaff] = useState([])
  const [q,setQ] = useState('')
  const [form,setForm] = useState({ fullName:'',email:'',password:'',role:'content' })
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [success,setSuccess] = useState('')
  const load = () => listStaff().then(setStaff).catch((err)=>setError(err.message))
  useEffect(() => { load() }, [])
  const filtered = useMemo(() => staff.filter((item)=>!q || `${item.full_name || ''} ${item.email || ''} ${item.role}`.toLowerCase().includes(q.toLowerCase())), [staff,q])

  const create = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    if (form.password.length < 8) { setBusy(false); return setError('Пароль должен содержать минимум 8 символов.') }
    try {
      await createStaffAccount(form)
      setSuccess('Сотрудник создан. Передайте ему email и пароль лично.')
      setForm({ fullName:'',email:'',password:'',role:'content' })
      await load()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const toggle = async (item) => {
    try { await updateStaff(item.id,{ is_active:!item.is_active }); await load() } catch (err) { setError(err.message) }
  }

  return <>
    <AdminPageHeader eyebrow="Команда" title="Сотрудники и роли" text="Публичной регистрации нет. Сотрудников создаёт владелец или администратор прямо здесь."/>
    {canManage && <section className="admin-panel staff-create-panel">
      <div><span className="eyebrow">Новый сотрудник</span><h2>Создать доступ</h2><p>Укажите данные сотрудника. Система создаст аккаунт без отдельной страницы регистрации.</p></div>
      <form className="staff-account-form" onSubmit={create}>
        <label><span>Имя</span><input value={form.fullName} onChange={(e)=>setForm({ ...form,fullName:e.target.value })} required placeholder="Имя и фамилия"/></label>
        <label><span>Email</span><input type="email" value={form.email} onChange={(e)=>setForm({ ...form,email:e.target.value })} required placeholder="manager@example.com"/></label>
        <label><span>Пароль</span><div className="input-with-icon"><KeyRound/><input type="password" minLength="8" value={form.password} onChange={(e)=>setForm({ ...form,password:e.target.value })} required autoComplete="new-password"/></div></label>
        <label><span>Роль</span><select value={form.role} onChange={(e)=>setForm({ ...form,role:e.target.value })}>{role === 'owner' && <option value="admin">Администратор</option>}<option value="content">Контент-менеджер</option></select></label>
        <button className="btn btn--primary" disabled={busy}><Plus/>{busy ? 'Создаём…' : 'Создать сотрудника'}</button>
      </form>
      {success && <div className="notice notice--success">{success}</div>}
      {error && <div className="notice notice--error">{error}</div>}
    </section>}
    <div className="admin-toolbar"><label className="search-field"><Search/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Сотрудник, email, роль…"/></label></div>
    <section className="admin-panel admin-panel--flush"><div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Сотрудник</th><th>Роль</th><th>Статус</th><th>Доступ</th></tr></thead>
      <tbody>{filtered.map((item) => <tr key={item.id}><td data-label="Сотрудник"><div className="admin-product-name"><span className="staff-avatar">{(item.full_name || item.email || 'SO').slice(0,2).toUpperCase()}</span><span><strong>{item.full_name || 'Без имени'}</strong><small>{item.email}</small></span></div></td><td data-label="Роль"><span className="role-pill"><ShieldCheck/>{roleLabels[item.role] || item.role}</span></td><td data-label="Статус"><span className={`visibility-pill ${item.is_active ? 'is-published' : 'is-hidden'}`}>{item.is_active ? 'Активен' : 'Отключён'}</span></td><td data-label="Доступ">{canManage && (role === 'owner' ? item.role !== 'owner' : !['owner','admin'].includes(item.role)) ? <button className={`btn btn--small ${item.is_active ? 'btn--ghost' : 'btn--soft'}`} type="button" onClick={()=>toggle(item)}>{item.is_active ? <><UserX/> Отключить</> : <><UserCheck/> Включить</>}</button> : <small>Защищено</small>}</td></tr>)}{filtered.length === 0 && <tr><td colSpan="4" className="empty-cell">Сотрудников пока нет.</td></tr>}</tbody>
    </table></div></section>
  </>
}
