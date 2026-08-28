import { Heart, Home, LayoutGrid, MapPin, ShoppingBag } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useCart } from '../state/CartContext'
import { useLanguage } from '../state/LanguageContext'

export default function MobileBottomNav() {
  const { count } = useCart()
  const { t } = useLanguage()
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <NavLink to="/"><Home/><span>{t.nav.home}</span></NavLink>
      <NavLink to="/catalog"><LayoutGrid/><span>{t.nav.catalog}</span></NavLink>
      <NavLink to="/favorites"><Heart/><span>{t.favorites.title}</span></NavLink>
      <NavLink to="/cart" className="badge-wrap"><ShoppingBag/><span>{t.cart.title}</span>{count>0&&<b>{count}</b>}</NavLink>
      <NavLink to="/contacts"><MapPin/><span>{t.nav.contacts}</span></NavLink>
    </nav>
  )
}
