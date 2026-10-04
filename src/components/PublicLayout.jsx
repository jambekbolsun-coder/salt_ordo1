import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import QuizOverlay from './QuizOverlay'
import { track } from '../lib/analytics'
import CookieConsent from './CookieConsent'
import { revokeProviders } from '../lib/measurement'
import { campaignAttribution } from '../lib/consent'

export default function PublicLayout() {
  const location = useLocation()

  const lastPage=useRef('')
  useEffect(()=>{
    const change=()=>{revokeProviders();campaignAttribution();track('consent_change');track('page_view')}
    const click=e=>{const a=e.target.closest?.('a[href]');if(a&&/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(a.href))track('whatsapp_click')}
    window.addEventListener('salt-consent-change',change);document.addEventListener('click',click);revokeProviders()
    return()=>{window.removeEventListener('salt-consent-change',change);document.removeEventListener('click',click)}
  },[])
  useEffect(() => {
    if(lastPage.current===location.key)return;lastPage.current=location.key
    campaignAttribution()
    if(location.pathname==='/catalog')track('catalog_view')
    if(location.pathname==='/checkout')track('begin_checkout')
    track('page_view', { path: `${location.pathname}${location.search}` })
  }, [location.pathname, location.search, location.key])

  return (
    <div className="public-app">
      <a className="skip-link" href="#main-content">Перейти к содержанию</a>
      <Header />
      <main id="main-content"><Outlet/></main>
      <Footer />
      <QuizOverlay />
      <MobileBottomNav />
      <CookieConsent/>
    </div>
  )
}
