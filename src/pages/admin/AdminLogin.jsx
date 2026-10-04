import { useEffect, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, LogIn, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import Logo from '../../components/Logo'
import Ornament from '../../components/Ornament'
import AdminInstallCard from '../../components/AdminInstallCard'
import { useAdminPwa } from '../../state/AdminPwaContext'

export default function AdminLogin() {
  const { login, isStaff, mfa, loading: authLoading, supabaseConfigured } = useAuth()
  const [form, setForm] = useState({ email: '', password: '', fullName:'' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { online } = useAdminPwa()

  useEffect(() => {
    if(!authLoading&&mfa?.required)navigate('/admin/mfa',{replace:true})
    if (!authLoading && isStaff) navigate(location.state?.from || '/admin/', { replace: true })
  }, [authLoading, isStaff, navigate, location.state, mfa])

  const submit = async (event) => {
    event.preventDefault()
    if (busy || authLoading) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const identity=await login(form.email.trim(), form.password)
      navigate(identity.mfa?.required?'/admin/mfa':(location.state?.from || '/admin/'), { replace: true })
    } catch (err) {
      setError(err.message || 'Не удалось войти. Проверьте email и пароль.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-auth">
      <section className="admin-auth__story">
        <div className="admin-auth__story-inner">
          <Logo />
          <span className="admin-auth__kicker"><Sparkles size={16}/> Salt Ordo · управление</span>
          <h1>Управление Salt Ordo — в одном приложении.</h1>
          <p>Рабочее пространство вашей команды: управляйте магазином с компьютера или телефона.</p>
          <div className="admin-auth__trust">
            <span><ShieldCheck/> Доступ по роли сотрудника</span>
            <span><LockKeyhole/> Защищённый вход</span>
          </div>
          <Ornament className="admin-auth__ornament"/>
        </div>
      </section>

      <section className="admin-auth__panel">
        <div className="admin-auth__card">
          <div className="admin-auth__mobile-logo"><Logo compact/></div>
          <span className="eyebrow">Административный отдел</span>
          <h2>Вход в систему</h2>
          <p>Войдите с учётной записью сотрудника, чтобы открыть рабочее пространство Salt Ordo.</p>

          <form onSubmit={submit} className="auth-form">
            <label>
              <span>Email</span>
              <div className="input-with-icon"><Mail/><input type="email" autoComplete="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="name@example.com" required/></div>
            </label>
            <label>
              <span>Пароль</span>
              <div className="input-with-icon">
                <LockKeyhole/>
                <input aria-label="Пароль" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} placeholder="••••••••" minLength="8" required/>
                <button type="button" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'} onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button>
              </div>
            </label>
            {error && <div className="notice notice--error" role="alert">{error}</div>}
            {notice && <div className="notice notice--success">{notice}</div>}
            {!supabaseConfigured && <div className="notice notice--error">Supabase ещё не подключён к этой сборке.</div>}
            <button type="submit" className="btn btn--primary btn--block" disabled={busy || authLoading || !supabaseConfigured || !online} aria-busy={busy}>
              <LogIn size={18}/>{busy ? 'Проверяем…' : 'Войти'}
            </button>
          </form>
          <div className="admin-auth__links"><span>Доступ выдаёт владелец Salt Ordo.</span><Link to="/">Вернуться на сайт</Link></div>
          <AdminInstallCard compact/>
        </div>
      </section>
    </main>
  )
}
