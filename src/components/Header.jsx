import { useEffect, useRef, useState } from 'react'
import { Check, Heart, Instagram, Languages, Menu, MessageCircle, Search, ShoppingBag, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import Logo from './Logo'
import { useCart } from '../state/CartContext'
import { useFavorites } from '../state/FavoritesContext'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'

const languageOptions = [
  ['ru', 'RU', 'Русский'],
  ['kg', 'KG', 'Кыргызча'],
  ['en', 'EN', 'English'],
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { count, pulse: cartPulse } = useCart()
  const { ids, pulse: favoritePulse } = useFavorites()
  const { lang, setLang, t } = useLanguage()
  const { settings } = useSiteSettings()
  const langRef = useRef(null)

  const links = [
    ['/', t.nav.home, true],
    ['/catalog', t.nav.catalog],
    ['/#custom-order', t.nav.custom],
    ['/#delivery', t.nav.delivery],
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const top = window.scrollY
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.body.style.position = 'fixed'
    document.body.style.top = `-${top}px`
    document.body.style.width = '100%'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, top)
    }
  }, [open])

  useEffect(() => {
    const close = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) setLangOpen(false)
    }
    const key = (event) => event.key === 'Escape' && setLangOpen(false)
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', key)
    }
  }, [])

  const chooseLang = (next) => {
    setLang(next)
    setLangOpen(false)
  }

  const currentLanguage = languageOptions.find(([code]) => code === lang) || languageOptions[0]

  return (
    <>
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container site-header__inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Primary navigation">
            {links.map(([to, label, end]) => to.includes('#')
              ? <a key={to} href={to}>{label}</a>
              : <NavLink key={to} to={to} end={Boolean(end)}>{label}</NavLink>
            )}
          </nav>

          <div className="header-actions">
            <div className="language-menu" ref={langRef}>
              <button className={`language-trigger ${langOpen ? 'is-open' : ''}`} type="button" onClick={() => setLangOpen((v) => !v)} aria-expanded={langOpen} aria-haspopup="menu" aria-label="Change language">
                <Languages size={18}/>
                <span className="language-trigger__code">{currentLanguage[1]}</span>
                <span className="language-trigger__name">{currentLanguage[2]}</span>
              </button>
              <div className={`language-popover ${langOpen ? 'is-open' : ''}`} role="menu">
                <div className="language-popover__title">Language · Тил · Язык</div>
                {languageOptions.map(([code, short, label]) => (
                  <button key={code} type="button" role="menuitem" className={lang === code ? 'is-active' : ''} onClick={() => chooseLang(code)}>
                    <span className="language-popover__code">{short}</span>
                    <strong>{label}</strong>
                    <Check className="language-popover__check" aria-hidden="true"/>
                  </button>
                ))}
              </div>
            </div>
            <Link to="/catalog" className="icon-btn header-search" aria-label={t.nav.catalog}><Search size={20}/></Link>
            <Link to="/favorites" className={`icon-btn badge-wrap header-favorite ${favoritePulse ? 'is-pulsing' : ''}`} aria-label={t.favorites.title}>
              <Heart size={20}/>{ids.length > 0 && <span className="mini-badge">{ids.length}</span>}
            </Link>
            <Link to="/cart" className={`icon-btn badge-wrap header-cart ${cartPulse ? 'is-pulsing' : ''}`} aria-label={t.cart.title}>
              <ShoppingBag size={20}/>{count > 0 && <span className="mini-badge">{count}</span>}
            </Link>
            <button className="icon-btn menu-btn" type="button" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={21}/></button>
          </div>
        </div>
      </header>

      <div className={`drawer-backdrop ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)}/>
      <aside className={`mobile-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="mobile-drawer__top">
          <Logo compact/>
          <button className="icon-btn" type="button" onClick={() => setOpen(false)} aria-label="Close"><X/></button>
        </div>
        <div className="mobile-drawer__hero">
          <span>Salt Ordo</span>
          <strong>{t.hero.cardTitle}</strong>
        </div>
        <nav className="mobile-drawer__nav">
          {links.map(([to,label]) => to.includes('#')
            ? <a key={to} href={to} onClick={() => setOpen(false)}>{label}</a>
            : <Link key={to} to={to} onClick={() => setOpen(false)}>{label}</Link>
          )}
        </nav>
        <div className="mobile-drawer__language">
          {languageOptions.map(([code,,label]) => (
            <button key={code} type="button" className={lang === code ? 'is-active' : ''} onClick={() => chooseLang(code)}>{label}</button>
          ))}
        </div>
        <div className="mobile-drawer__bottom">
          <a className="btn btn--primary btn--block" href={whatsappUrl(settings.whatsapp, t.common.whatsappText)} target="_blank" rel="noreferrer"><MessageCircle size={18}/>{t.hero.consult}</a>
          <a className="btn btn--ghost btn--block" href={settings.instagram} target="_blank" rel="noreferrer"><Instagram size={18}/> Instagram</a>
        </div>
      </aside>
    </>
  )
}
