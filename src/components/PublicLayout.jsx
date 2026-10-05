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
import SeoHead from './SeoHead'
import { openTrackedWhatsApp } from '../lib/whatsapp-tracking'

const utilitySeo = {
  '/favorites': ['Избранные товары | Salt Ordo', 'Сохранённые товары Salt Ordo.'],
  '/cart': ['Корзина | Salt Ordo', 'Товары, выбранные для заказа в Salt Ordo.'],
  '/checkout': ['Оформление заявки | Salt Ordo', 'Оформление заявки на изделия Salt Ordo.'],
  '/privacy': ['Политика конфиденциальности | Salt Ordo', 'Политика конфиденциальности сайта Salt Ordo.'],
  '/cookies': ['Политика cookies | Salt Ordo', 'Информация об использовании cookies на сайте Salt Ordo.'],
}

export default function PublicLayout() {
  const location = useLocation()

  const lastPage=useRef('')
  useEffect(()=>{
    const change=()=>{revokeProviders();campaignAttribution();track('consent_change');track('page_view')}
    const click=e=>{const a=e.target.closest?.('a[href]');if(a&&/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(a.href)){track('whatsapp_click');if(!e.defaultPrevented&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();const context=a.closest('[data-wa-product]');openTrackedWhatsApp(a.href,{product:context?.dataset.waProduct,category:context?.dataset.waCategory})}}}
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
      {utilitySeo[location.pathname] && <SeoHead title={utilitySeo[location.pathname][0]} description={utilitySeo[location.pathname][1]} path={location.pathname} robots="noindex, follow"/>}
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
