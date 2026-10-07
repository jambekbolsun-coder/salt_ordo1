import { useEffect, useRef, useState } from 'react'
import { Bookmark, Menu, Search, ShoppingBag, X } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useLanguage } from '../state/LanguageContext'
import { useFavorites } from '../state/FavoritesContext'
import { useCart } from '../state/CartContext'
import { useAtelierCopy } from '../lib/atelierHooks'
export default function Header() {
  const [open, setOpen] = useState(false)
  const dialog = useRef(null)
  const trigger = useRef(null)
  const { pathname } = useLocation()
  const { lang, setLang, t } = useLanguage()
  const a = useAtelierCopy()
  const { items } = useFavorites()
  const { count } = useCart()
  const links = [
    ['/collections', a.collections],
    ['/materials', a.materials],
    ['/individual-order', a.order],
    ['/atelier', a.atelier],
    ['/works', a.works],
    ['/contacts', t.nav.contacts],
  ]
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  useEffect(() => {
    if (open) {
      const node = dialog.current
      const button = trigger.current
      node?.showModal()
      const previous = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = previous
        node?.close()
        button?.focus()
      }
    }
  }, [open])
  const language = (
    <select
      aria-label="Язык / Тил / Language"
      value={lang}
      onChange={(e) => setLang(e.target.value)}
    >
      <option value="ru">RU</option>
      <option value="kg">KG</option>
      <option value="en">EN</option>
    </select>
  )
  return (
    <>
      <header className="atelier-header">
        <div className="atelier-header__inner">
          <Link
            to="/"
            className="atelier-wordmark"
            aria-label="Salt Ordo — главная"
          >
            SALT ORDO<span>текстильное ателье · Бишкек</span>
          </Link>
          <nav className="atelier-desktop-nav" aria-label="Основная навигация">
            {links.map(([url, label]) => (
              <NavLink key={url} to={url}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="atelier-header__actions">
            {language}
            <Link to="/collections" aria-label={t.catalog.search}>
              <Search size={20} />
            </Link>
            <Link
              to="/selection"
              className="selection-nav"
              aria-label={`${a.selection}: ${items.length}`}
            >
              <Bookmark size={20} />
              <span>{items.length || ''}</span>
            </Link>
            {count > 0 && (
              <Link to="/cart" aria-label={`${t.cart.title}: ${count}`}>
                <ShoppingBag size={20} />
              </Link>
            )}
            <button
              ref={trigger}
              className="atelier-menu-button"
              aria-label="Открыть меню"
              aria-expanded={open}
              aria-controls="atelier-menu"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>
      <dialog
        ref={dialog}
        id="atelier-menu"
        aria-label="Меню Salt Ordo"
        className="atelier-menu"
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false)
        }}
      >
        <div className="atelier-menu__top">
          <span>SALT ORDO</span>
          <button aria-label="Закрыть меню" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <nav aria-label="Мобильная навигация">
          <NavLink to="/" onClick={() => setOpen(false)}>
            {t.nav.home}
          </NavLink>
          {links.map(([url, label]) => (
            <NavLink key={url} to={url} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
          <NavLink to="/selection" onClick={() => setOpen(false)}>
            {a.selection} · {items.length}
          </NavLink>
          <NavLink to="/cart" onClick={() => setOpen(false)}>
            {t.cart.title}
          </NavLink>
        </nav>
        <p>Ткань. Ремесло. Семейная история.</p>
        {language}
      </dialog>
    </>
  )
}
