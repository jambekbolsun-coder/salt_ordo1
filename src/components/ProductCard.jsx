import { ArrowUpRight, Check, Heart, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductVisual from './ProductVisual'
import { money } from '../lib/format'
import { useCart } from '../state/CartContext'
import { useFavorites } from '../state/FavoritesContext'
import { useLanguage } from '../state/LanguageContext'
import { categoryName, discountPercent, isPromotionActive, localizedField, promoLabel } from '../lib/productText'

export default function ProductCard({ product }) {
  const { add } = useCart()
  const { has, toggle } = useFavorites()
  const { lang, t } = useLanguage()
  const [added, setAdded] = useState(false)
  const [favoriteFlash, setFavoriteFlash] = useState(false)
  const name = localizedField(product, 'name', lang)
  const category = categoryName(product.category, lang) || 'Salt Ordo'
  const seam = localizedField(product, 'seam', lang)
  const promo = isPromotionActive(product)
  const discount = promo ? discountPercent(product) : 0
  const label = promoLabel(product, lang) || (discount ? `-${discount}%` : t.catalog.saleBadge)
  const favorite = has(product.id)

  useEffect(() => {
    if (!added) return undefined
    const timer = window.setTimeout(() => setAdded(false), 1100)
    return () => window.clearTimeout(timer)
  }, [added])

  useEffect(() => {
    if (!favoriteFlash) return undefined
    const timer = window.setTimeout(() => setFavoriteFlash(false), 650)
    return () => window.clearTimeout(timer)
  }, [favoriteFlash])

  const addToCart = () => {
    add(product)
    setAdded(true)
  }

  const toggleFavorite = () => {
    toggle(product.id)
    setFavoriteFlash(true)
  }

  return (
    <article className={`product-card ${added ? 'is-added' : ''}`}>
      <div className="product-card__media">
        <Link to={`/product/${product.slug}`} aria-label={`${t.catalog.openProduct}: ${name}`}>
          <ProductVisual product={product}/>
        </Link>
        <div className="product-card__badges">
          {promo && <span className="product-badge product-badge--sale">{label}</span>}
          {!promo && product.is_new && <span className="product-badge">NEW</span>}
        </div>
        <button className={`favorite-btn ${favorite ? 'is-active' : ''} ${favoriteFlash ? 'is-animating' : ''}`} onClick={toggleFavorite} aria-label={t.catalog.favorite}>
          <Heart size={19} fill={favorite ? 'currentColor' : 'none'}/>
        </button>
        <div className={`product-card__feedback ${added ? 'is-visible' : ''}`} aria-live="polite">
          <Check size={17}/><span>{t.catalog.added || t.catalog.add}</span>
        </div>
      </div>
      <div className="product-card__body">
        <div className="product-card__meta">{category}{seam ? ` · ${seam}` : ''}</div>
        <Link className="product-card__title" to={`/product/${product.slug}`}>{name}</Link>
        <div className="product-card__price">
          <strong>{product.price_on_request ? t.catalog.requestPrice : money(product.sale_price, t.common.som)}</strong>
          {promo && product.old_price && <del>{money(product.old_price, t.common.som)}</del>}
        </div>
        <div className="product-card__actions">
          <button className={`btn btn--soft ${added ? 'is-success' : ''}`} onClick={addToCart}>
            {added ? <Check size={17}/> : <ShoppingBag size={17}/>} {added ? (t.catalog.added || t.catalog.add) : t.catalog.add}
          </button>
          <Link className="icon-btn" to={`/product/${product.slug}`} aria-label={t.catalog.openProduct}><ArrowUpRight size={19}/></Link>
        </div>
      </div>
    </article>
  )
}
