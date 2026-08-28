import { useEffect, useRef, useState } from 'react'
import { Check, Heart, Instagram, Languages, Menu, MessageCircle, Search, ShoppingBag, X } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
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

const themeOptions = [
  ['pink', 'Розовая тема'],
  ['red', 'Красная тема'],
  ['blue', 'Синяя тема'],
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeSection,setActiveSection] = useState('home')
  const [theme, setTheme] = useState(() => {
    try { return window.localStorage.getItem('salt-ordo-theme') || 'pink' } catch { return 'pink' }
  })
  const { count, pulse: cartPulse } = useCart()
  const { ids, pulse: favoritePulse } = useFavorites()
  const { lang, setLang, t } = useLanguage()
  const { settings } = useSiteSettings()
  const langRef = useRef(null)
  const drawerRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { window.localStorage.setItem('salt-ordo-theme', theme) } catch { return undefined }
  }, [theme])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (location.pathname !== '/') { setActiveSection(''); return }
    let ticking = false
    const update = () => {
      ticking = false
      const marker = window.scrollY + 180
      const about = document.getElementById('about')
      const contacts = document.getElementById('contacts')
      if (contacts && marker >= contacts.offsetTop) setActiveSection('contacts')
      else if (about && marker >= about.offsetTop) setActiveSection('about')
      else setActiveSection('home')
    }
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update) }
    }
    update()
    window.addEventListener('scroll',onScroll,{ passive:true })
    window.addEventListener('hashchange',update)
    return () => {
      window.removeEventListener('scroll',onScroll)
      window.removeEventListener('hashchange',update)
    }
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const top = window.scrollY
    const previousFocus = document.activeElement
    const previousPadding = document.body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key !== 'Tab' || !drawerRef.current) return
      const focusable = [...drawerRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.body.style.position = 'fixed'
    document.body.style.top = `-${top}px`
    document.body.style.width = '100%'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
    window.addEventListener('keydown', onKey)
    requestAnimationFrame(() => drawerRef.current?.querySelector('button')?.focus())
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.paddingRight = previousPadding
      window.scrollTo(0, top)
      previousFocus?.focus?.({ preventScroll: true })
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

  const submitSearch = (event) => {
    event.preventDefault()
    const value = query.trim()
    navigate(value ? `/catalog?q=${encodeURIComponent(value)}` : '/catalog')
    setOpen(false)
  }

  return (
    <>
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container site-header__inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Primary navigation">
            <Link className={location.pathname === '/' && activeSection === 'home' ? 'active' : ''} to="/">{t.nav.home}</Link>
            <NavLink to="/catalog">{t.nav.catalog}</NavLink>
            <a className={location.pathname === '/' && activeSection === 'about' ? 'active' : ''} href="/#about">{t.nav.about}</a>
            <a className={location.pathname === '/' && activeSection === 'contacts' ? 'active' : ''} href="/#contacts">{t.nav.contacts}</a>
          </nav>

          <form className="header-search-form" role="search" onSubmit={submitSearch}>
            <Search aria-hidden="true"/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.catalog.search} aria-label={t.catalog.search}/>
            <button type="submit" aria-label={t.catalog.search}><Search aria-hidden="true"/></button>
          </form>

          <div className="header-actions">
            <div className="language-menu" ref={langRef}>
              <button className={`language-trigger ${langOpen ? 'is-open' : ''}`} type="button" onClick={() => setLangOpen((v) => !v)} aria-expanded={langOpen} aria-controls="language-popover" aria-haspopup="menu" aria-label="Change language">
                <Languages size={18}/>
                <span className="language-trigger__code">{currentLanguage[1]}</span>
                <span className="language-trigger__name">{currentLanguage[2]}</span>
              </button>
              <div id="language-popover" className={`language-popover ${langOpen ? 'is-open' : ''}`} role="menu">
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
            <div className="theme-swatches" role="group" aria-label="Цветовая тема">
              {themeOptions.map(([value, label]) => (
                <button key={value} className={`theme-swatch theme-swatch--${value}`} type="button" onClick={() => setTheme(value)} aria-label={label} aria-pressed={theme === value}/>
              ))}
            </div>
            <Link to="/catalog" className="icon-btn header-search-button" aria-label={t.catalog.search}><Search size={20}/></Link>
            <Link to="/favorites" className={`icon-btn badge-wrap header-favorite ${favoritePulse ? 'is-pulsing' : ''}`} aria-label={t.favorites.title}>
              <Heart size={20}/>{ids.length > 0 && <span className="mini-badge">{ids.length}</span>}
            </Link>
            <Link to="/cart" className={`icon-btn badge-wrap header-cart ${cartPulse ? 'is-pulsing' : ''}`} aria-label={t.cart.title}>
              <ShoppingBag size={20}/>{count > 0 && <span className="mini-badge">{count}</span>}
            </Link>
            <a className="header-whatsapp" href={whatsappUrl(settings.whatsapp, t.common.whatsappText)} target="_blank" rel="noreferrer" aria-label="WhatsApp">
              <MessageCircle size={25}/>
            </a>
            <button className="icon-btn menu-btn" type="button" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={21}/></button>
          </div>
        </div>
      </header>

      <div className={`drawer-backdrop ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)}/>
      <aside ref={drawerRef} className={`mobile-drawer ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Навигация" aria-hidden={!open}>
        <div className="mobile-drawer__top">
          <Logo compact/>
          <button className="icon-btn" type="button" onClick={() => setOpen(false)} aria-label="Close"><X/></button>
        </div>
        <div className="mobile-drawer__hero">
          <span>Salt Ordo</span>
          <strong>{t.hero.cardTitle}</strong>
        </div>
        <form className="mobile-drawer__search" role="search" onSubmit={submitSearch}>
          <Search aria-hidden="true"/>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.catalog.search} aria-label={t.catalog.search}/>
          <button type="submit" aria-label={t.catalog.search}><Search aria-hidden="true"/></button>
        </form>
        <nav className="mobile-drawer__nav">
          <Link to="/" onClick={()=>setOpen(false)}>{t.nav.home}</Link>
          <Link to="/catalog" onClick={()=>setOpen(false)}>{t.nav.catalog}</Link>
          <a href="/#about" onClick={()=>setOpen(false)}>{t.nav.about}</a>
          <a href="/#contacts" onClick={()=>setOpen(false)}>{t.nav.contacts}</a>
        </nav>
        <div className="mobile-drawer__language">
          {languageOptions.map(([code,,label]) => (
            <button key={code} type="button" className={lang === code ? 'is-active' : ''} onClick={() => chooseLang(code)}>{label}</button>
          ))}
        </div>
        <div className="mobile-drawer__themes" role="group" aria-label="Цветовая тема">
          {themeOptions.map(([value, label]) => (
            <button key={value} type="button" className={theme === value ? 'is-active' : ''} onClick={() => setTheme(value)}>
              <i className={`theme-swatch theme-swatch--${value}`} aria-hidden="true"/>{label}
            </button>
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
