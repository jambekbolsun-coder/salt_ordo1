import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

export default function ProtectedAdmin() {
  const { loading, isStaff, supabaseConfigured } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="screen-loader"><img src="/salt-ordo-logo.png" alt=""/><span>Загружаем кабинет…</span></div>
  }

  if (!supabaseConfigured) {
    return (
      <div className="screen-loader screen-loader--error">
        <img src="/salt-ordo-logo.png" alt=""/>
        <strong>Админ-панель ещё не подключена к Supabase</strong>
        <span>Добавьте параметры проекта в .env и перезапустите приложение.</span>
      </div>
    )
  }

  if (!isStaff) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  return <Outlet/>
}
