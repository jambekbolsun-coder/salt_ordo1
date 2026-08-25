import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bot, Boxes, ChevronLeft, ClipboardList, Gauge, LogOut, Menu, PackagePlus,
  Settings, ShoppingBag, Tags, UserRound, X
} from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../state/AuthContext'

const nav = [
  ['/admin', 'Обзор', Gauge, ['owner','admin','manager','content'], true],
  ['/admin/leads', 'Заявки', ClipboardList, ['owner','admin','manager']],
  ['/admin/analytics', 'Аналитика', BarChart3, ['owner','admin','manager']],
  ['/admin/products', 'Товары', ShoppingBag, ['owner','admin','content']],
  ['/admin/products/new', 'Добавить товар', PackagePlus, ['owner','admin','content']],
  ['/admin/categories', 'Категории', Tags, ['owner','admin','content']],
  ['/admin/chatbot', 'Чат-бот', Bot, ['owner','admin','content']],
  ['/admin/staff', 'Сотрудники', UserRound, ['owner','admin']],
  ['/admin/settings', 'Настройки', Settings, ['owner','admin']],
  ['/admin/profile', 'Профиль', UserRound, ['owner','admin','manager','content']],
]

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { staff, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const signOut = async () => {
    await logout()
    navigate('/admin/login')
  }

  return (
    <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <div className={`admin-backdrop ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)}/>
      <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
        <div className="admin-sidebar__brand">
          <Logo compact={collapsed}/>
          <button className="icon-btn admin-close" onClick={() => setOpen(false)} aria-label="Закрыть меню"><X/></button>
        </div>
        <div className="admin-sidebar__label">{!collapsed && 'Управление Salt Ordo'}</div>
        <nav className="admin-nav">
          {nav.filter(([, , , roles]) => roles.includes(staff?.role)).map(([to,label,Icon,,end]) => (
            <NavLink key={to} to={to} end={Boolean(end)} onClick={() => setOpen(false)} title={collapsed ? label : undefined}>
              <Icon size={19}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__bottom">
          <button className="admin-user" onClick={signOut}>
            <span className="admin-user__avatar">{(staff?.full_name || 'SO').slice(0,2).toUpperCase()}</span>
            <span className="admin-user__text"><strong>{staff?.full_name || 'Salt Ordo'}</strong><small>{staff?.role || 'owner'}</small></span>
            <LogOut size={18}/>
          </button>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <button className="icon-btn admin-menu" onClick={() => setOpen(true)} aria-label="Открыть меню"><Menu/></button>
          <button className="icon-btn admin-collapse" onClick={() => setCollapsed((x)=>!x)} title="Свернуть меню"><ChevronLeft/></button>
          <div className="admin-topbar__title"><Boxes size={19}/><span>Каталог и контент</span></div>
          <a className="btn btn--small btn--soft" href="/" target="_blank" rel="noreferrer">Открыть сайт</a>
        </header>
        <main className="admin-main"><Outlet/></main>
      </div>
    </div>
  )
}
