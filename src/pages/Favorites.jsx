import { useEffect, useMemo, useState } from 'react'
import { listProducts } from '../lib/api'
import ProductCard from '../components/ProductCard'
import EmptyState from '../components/EmptyState'
import { useFavorites } from '../state/FavoritesContext'
import { useLanguage } from '../state/LanguageContext'

export default function Favorites() {
  const [products, setProducts] = useState([])
  const { ids } = useFavorites()
  const { t } = useLanguage()
  useEffect(() => { listProducts().then(setProducts).catch(() => setProducts([])) }, [])
  const list = useMemo(() => products.filter((product) => ids.includes(product.id)), [products, ids])

  return (
    <section className="section page-section">
      <div className="container">
        <div className="page-hero compact-page-hero"><span className="eyebrow">{t.favorites.eyebrow}</span><h1>{t.favorites.title}</h1></div>
        {list.length === 0
          ? <EmptyState type="heart" title={t.favorites.emptyTitle} text={t.favorites.emptyText} action={t.favorites.toCatalog}/>
          : <div className="product-grid">{list.map((product) => <ProductCard key={product.id} product={product}/>)}</div>}
      </div>
    </section>
  )
}
