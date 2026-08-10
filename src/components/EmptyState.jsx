import { Heart, ShoppingBag, SearchX, PackageOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import Ornament from './Ornament'

const icons = { heart: Heart, cart: ShoppingBag, search: SearchX, package: PackageOpen }

export default function EmptyState({ type='package', title, text, action='Перейти в каталог', to='/catalog' }) {
  const Icon = icons[type] || PackageOpen
  return (
    <div className="empty-state">
      <div className="empty-state__icon"><Icon size={34}/></div>
      <Ornament className="empty-state__ornament"/>
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="btn btn--primary" to={to}>{action}</Link>
    </div>
  )
}
