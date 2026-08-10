import { Heart, Home, LayoutGrid, MessageCircle, ShoppingBag } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useCart } from '../state/CartContext'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'

export default function MobileBottomNav() {
  const { count } = useCart()
  const { t } = useLanguage()
  const { settings } = useSiteSettings()
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <NavLink to="/"><Home/><span>{t.nav.home}</span></NavLink>
      <NavLink to="/catalog"><LayoutGrid/><span>{t.nav.catalog}</span></NavLink>
      <NavLink to="/favorites"><Heart/><span>{t.favorites.title}</span></NavLink>
      <NavLink to="/cart" className="badge-wrap"><ShoppingBag/><span>{t.cart.title}</span>{count>0&&<b>{count}</b>}</NavLink>
      <a href={whatsappUrl(settings.whatsapp, t.common.whatsappText)} target="_blank" rel="noreferrer"><MessageCircle/><span>WhatsApp</span></a>
    </nav>
  )
}
