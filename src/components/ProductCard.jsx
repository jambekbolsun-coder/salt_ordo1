import { Bookmark } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductVisual from './ProductVisual'
import { money } from '../lib/format'
import { useFavorites } from '../state/FavoritesContext'
import { useLanguage } from '../state/LanguageContext'
import { categoryName, discountPercent, isPromotionActive, localizedField, promoLabel } from '../lib/productText'
import { hasViewedProduct } from '../lib/productViewState'

export default function ProductCard({ product }) {
  const { has, toggle } = useFavorites()
  const { lang, t } = useLanguage()
  const [favoriteFlash, setFavoriteFlash] = useState(false)
  const name = localizedField(product, 'name', lang)
  const category = categoryName(product.category, lang) || 'Salt Ordo'
  const seam = localizedField(product, 'seam', lang)
  const promo = isPromotionActive(product)
  const discount = promo ? discountPercent(product) : 0
  const label = promoLabel(product, lang) || (discount ? `-${discount}%` : t.catalog.saleBadge)
  const favorite = has(product.id)
  const showNew = product.is_new && !hasViewedProduct(product.id)

  useEffect(() => {
    if (!favoriteFlash) return undefined
    const timer = window.setTimeout(() => setFavoriteFlash(false), 650)
    return () => window.clearTimeout(timer)
  }, [favoriteFlash])

  const toggleFavorite = () => {
    toggle(product.id, product)
    setFavoriteFlash(true)
  }

  return (
    <article className="product-card" data-wa-product={name} data-wa-category={category}>
      <div className="product-card__media">
        <Link to={`/product/${product.slug}`} aria-label={`${t.catalog.openProduct}: ${name}`}>
          <ProductVisual product={product}/>
        </Link>
        <div className="product-card__badges">
          {promo && <span className="product-badge product-badge--sale">{label}</span>}
          {!promo && showNew && <span className="product-badge">NEW</span>}
        </div>
        <button className={`favorite-btn ${favorite ? 'is-active' : ''} ${favoriteFlash ? 'is-animating' : ''}`} onClick={toggleFavorite} aria-pressed={favorite} aria-label={`${favorite?'Убрать из подборки':'В подборку'}: ${name}`}>
          <Bookmark size={19} fill={favorite ? 'currentColor' : 'none'}/>
        </button>
      </div>
      <div className="product-card__body">
        <div className="product-card__meta">{category}{seam ? ` · ${seam}` : ''}</div>
        <Link className="product-card__title" to={`/product/${product.slug}`}>{name}</Link>
        <div className="product-card__price">
          <strong>{product.price_on_request ? t.catalog.requestPrice : money(product.sale_price, t.common.som)}</strong>
          {promo && product.old_price && <del>{money(product.old_price, t.common.som)}</del>}
        </div>
        <p className="product-stock">{Number(product.stock_qty)>0 ? (Number(product.stock_qty)<=5 ? `Осталось: ${product.stock_qty}` : t.catalog.inStock) : t.catalog.madeToOrder}</p>
        <div className="product-card__actions">
          <Link className="btn btn--card-detail" to={`/product/${product.slug}`}>{t.catalog.openProduct}</Link>
        </div>
      </div>
    </article>
  )
}
