import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSiteSettings } from '../lib/api'
import { DEFAULT_WHATSAPP } from '../lib/whatsapp'
import { useLocation } from 'react-router-dom'

const defaults = {
  brand_name: 'Salt Ordo',
  whatsapp: DEFAULT_WHATSAPP,
  instagram: 'https://www.instagram.com/salt_ordo/',
  delivery_note_ru: 'Доставка по всему Кыргызстану',
  delivery_note_kg: 'Кыргызстандын бардык аймагына жеткирүү',
  delivery_note_en: 'Delivery across Kyrgyzstan',
  seo_title: 'Salt Ordo — домашний текстиль и индивидуальные заказы',
  seo_description: 'Төшөк, сеп-комплекты, сандыки и домашний текстиль Salt Ordo. Готовые изделия, индивидуальные заказы и доставка по Кыргызстану.',
}

const SiteSettingsContext = createContext(null)

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaults)
  const { pathname } = useLocation()
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')

  useEffect(() => {
    let active = true
    getSiteSettings().then((data) => {
      if (active && data) setSettings({ ...defaults, ...data })
    }).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    document.title = isAdmin ? 'Salt Ordo Admin' : settings.seo_title
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', isAdmin ? 'Рабочее пространство Salt Ordo: каталог, заявки и аналитика.' : settings.seo_description)
  }, [isAdmin, settings.seo_title, settings.seo_description])

  const value = useMemo(() => ({ settings, setSettings }), [settings])
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
}

export const useSiteSettings = () => useContext(SiteSettingsContext)
