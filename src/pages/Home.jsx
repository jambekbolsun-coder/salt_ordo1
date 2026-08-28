import { Image as ImageIcon, PackageCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HeroSlider from '../components/HeroSlider'
import ProductCard from '../components/ProductCard'
import { listCategories, listProducts } from '../lib/api'
import { categoryName } from '../lib/productText'
import { useLanguage } from '../state/LanguageContext'

export default function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const { lang, t } = useLanguage()

  useEffect(() => {
    let active = true
    Promise.all([listProducts(), listCategories()])
      .then(([productRows, categoryRows]) => {
        if (!active) return
        setProducts(productRows)
        setCategories(categoryRows)
      })
      .catch((err) => active && setError(err.message || t.common.error))
    return () => { active = false }
  }, [t.common.error])

  const featured = products.filter((product) => product.is_featured || product.is_new || product.is_on_sale).slice(0, 4)
  const visibleProducts = featured.length ? featured : products.slice(0, 4)

  return (
    <>
      <HeroSlider/>
      <section className="home-catalog" id="categories">
        <div className="container home-catalog__inner">
          <div className="home-catalog__heading">
            <h2>{t.catalog.eyebrow}</h2>
            <Link to="/catalog">{t.category.all}</Link>
          </div>
          {categories.length > 0 ? (
            <nav className="home-category-pills" aria-label={t.catalog.category}>
              {categories.slice(0, 6).map((category, index) => (
                <Link className={index === 0 ? 'is-active' : ''} key={category.id} to={`/catalog?category=${category.slug}`}>
                  {categoryName(category, lang)}
                </Link>
              ))}
            </nav>
          ) : (
            <div className="soft-empty-row"><ImageIcon/><span>{t.category.empty}</span></div>
          )}
          {error && <div className="notice notice--error">{error}</div>}
          {visibleProducts.length ? (
            <div className="product-grid home-product-grid">
              {visibleProducts.map((product) => <ProductCard key={product.id} product={product}/>)}
            </div>
          ) : (
            <div className="catalog-empty-inline"><PackageCheck/><div><strong>{t.featured.emptyTitle}</strong><span>{t.featured.emptyText}</span></div></div>
          )}
        </div>
      </section>
    </>
  )
}
