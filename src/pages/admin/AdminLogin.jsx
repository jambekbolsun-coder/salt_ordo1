import { useEffect, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, LogIn, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import Logo from '../../components/Logo'
import Ornament from '../../components/Ornament'

export default function AdminLogin() {
  const { login, signupFirstOwner, isStaff, loading: authLoading, supabaseConfigured } = useAuth()
  const [form, setForm] = useState({ email: '', password: '', fullName:'' })
  const [setup, setSetup] = useState(false)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!authLoading && isStaff) navigate(location.state?.from || '/admin', { replace: true })
  }, [authLoading, isStaff, navigate, location.state])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (setup) {
        const result = await signupFirstOwner(form.email.trim(), form.password, form.fullName.trim())
        if (result.confirmationRequired) {
          setNotice('Проверьте email и подтвердите регистрацию. После этого вернитесь сюда и войдите.')
          return
        }
      } else {
        await login(form.email.trim(), form.password)
      }
      navigate(location.state?.from || '/admin', { replace: true })
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
          <h1>Каталог, заказы и команда — в одном спокойном интерфейсе.</h1>
          <p>Товары, единая цена, фотографии, характеристики и заявки доступны только владельцу сайта.</p>
          <div className="admin-auth__trust">
            <span><ShieldCheck/> Доступ только сотрудникам</span>
            <span><LockKeyhole/> Публичной регистрации нет</span>
          </div>
          <Ornament className="admin-auth__ornament"/>
        </div>
      </section>

      <section className="admin-auth__panel">
        <div className="admin-auth__card">
          <div className="admin-auth__mobile-logo"><Logo compact/></div>
          <span className="eyebrow">Административный отдел</span>
          <h2>{setup ? 'Первичная настройка' : 'Вход в систему'}</h2>
          <p>Эта страница не отображается на клиентской стороне. Доступ открывается только через адрес <strong>/admin</strong>.</p>

          <form onSubmit={submit} className="auth-form">
            {setup && <label>
              <span>Имя владельца</span>
              <div className="input-with-icon"><UserRound/><input value={form.fullName} onChange={(e)=>setForm({...form,fullName:e.target.value})} placeholder="Имя и фамилия" minLength="2" required/></div>
            </label>}
            <label>
              <span>Email</span>
              <div className="input-with-icon"><Mail/><input type="email" autoComplete="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="name@example.com" required/></div>
            </label>
            <label>
              <span>Пароль</span>
              <div className="input-with-icon">
                <LockKeyhole/>
                <input type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} placeholder="••••••••" minLength="8" required/>
                <button type="button" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'} onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button>
              </div>
            </label>
            {error && <div className="notice notice--error">{error}</div>}
            {notice && <div className="notice notice--success">{notice}</div>}
            {!supabaseConfigured && <div className="notice notice--error">Supabase ещё не подключён к этой сборке.</div>}
            <button className="btn btn--primary btn--block" disabled={busy || authLoading || !supabaseConfigured}>
              <LogIn size={18}/>{busy || authLoading ? 'Проверяем…' : setup ? 'Создать владельца' : 'Войти'}
            </button>
          </form>
          <div className="admin-auth__links"><button type="button" className="text-link" onClick={()=>{setSetup(!setup);setError('');setNotice('')}}>{setup ? 'У меня уже есть доступ' : 'Первый запуск: создать владельца'}</button><Link to="/">Вернуться на сайт</Link></div>
        </div>
      </section>
    </main>
  )
}
