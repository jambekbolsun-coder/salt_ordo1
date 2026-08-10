import { useEffect, useMemo, useState } from 'react'
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { listCategories, listProducts } from '../lib/api'
import ProductCard from '../components/ProductCard'
import EmptyState from '../components/EmptyState'
import { useLanguage } from '../state/LanguageContext'
import { categoryName, isPromotionActive, localizedField } from '../lib/productText'

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [mobileFilters, setMobileFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { lang, t } = useLanguage()

  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const saleOnly = params.get('sale') === '1'
  const stock = params.get('stock') || ''
  const sort = params.get('sort') || 'popular'

  useEffect(() => {
    let active = true
    Promise.all([listProducts(), listCategories()])
      .then(([productRows, categoryRows]) => {
        if (!active) return
        setProducts(productRows)
        setCategories(categoryRows)
      })
      .catch((err) => active && setError(err.message || t.common.error))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!mobileFilters) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => event.key === 'Escape' && setMobileFilters(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileFilters])

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    let list = [...products]
    const needle = q.trim().toLowerCase()
    if (needle) {
      list = list.filter((product) => {
        const text = [
          localizedField(product, 'name', lang),
          localizedField(product, 'description', lang),
          localizedField(product, 'seam', lang),
          localizedField(product, 'material', lang),
          ...(product.colors || []),
          ...(product.sizes || []),
        ].filter(Boolean).join(' ').toLowerCase()
        return text.includes(needle)
      })
    }
    if (category) list = list.filter((product) => product.category?.slug === category)
    if (saleOnly) list = list.filter((product) => isPromotionActive(product))
    if (stock === 'in') list = list.filter((product) => Number(product.stock_qty || 0) > 0)
    if (stock === 'order') list = list.filter((product) => Number(product.stock_qty || 0) <= 0)

    if (sort === 'price-asc') list.sort((a,b) => (a.sale_price ?? Infinity) - (b.sale_price ?? Infinity))
    if (sort === 'price-desc') list.sort((a,b) => (b.sale_price ?? -1) - (a.sale_price ?? -1))
    if (sort === 'new') list.sort((a,b) => Number(b.is_new) - Number(a.is_new) || new Date(b.created_at) - new Date(a.created_at))
    if (sort === 'popular') list.sort((a,b) => Number(b.is_featured) - Number(a.is_featured) || Number(b.is_on_sale) - Number(a.is_on_sale) || (a.sort_order || 0) - (b.sort_order || 0))
    return list
  }, [products, q, category, saleOnly, stock, sort, lang])

  const reset = () => setParams({})

  const filterPanel = (
    <div className="filter-panel">
      <div className="filter-panel__top"><strong>{t.catalog.filters}</strong><button className="text-link" type="button" onClick={reset}>{t.catalog.reset}</button></div>
      <div className="filter-group">
        <label>{t.catalog.category}</label>
        <button type="button" className={!category ? 'filter-choice is-active' : 'filter-choice'} onClick={() => set('category','')}>{t.catalog.allCategories}</button>
        {categories.map((item) => <button type="button" key={item.id} className={category === item.slug ? 'filter-choice is-active' : 'filter-choice'} onClick={() => set('category', item.slug)}>{categoryName(item, lang)}</button>)}
      </div>
      <div className="filter-group">
        <label className="check-row"><input type="checkbox" checked={saleOnly} onChange={(e) => set('sale', e.target.checked ? '1' : '')}/><span>{t.catalog.sale}</span></label>
      </div>
      <div className="filter-group">
        <label>{t.product.stock}</label>
        <button type="button" className={!stock ? 'filter-choice is-active' : 'filter-choice'} onClick={() => set('stock','')}>{t.catalog.allStock}</button>
        <button type="button" className={stock === 'in' ? 'filter-choice is-active' : 'filter-choice'} onClick={() => set('stock','in')}>{t.catalog.inStock}</button>
        <button type="button" className={stock === 'order' ? 'filter-choice is-active' : 'filter-choice'} onClick={() => set('stock','order')}>{t.catalog.madeToOrder}</button>
      </div>
    </div>
  )

  return (
    <section className="section page-section">
      <div className="container">
        <div className="page-hero compact-page-hero">
          <span className="eyebrow">{t.catalog.eyebrow}</span>
          <h1>{t.catalog.title}</h1>
          <p>{t.catalog.text}</p>
        </div>

        <div className="catalog-toolbar">
          <label className="search-field"><Search size={19}/><input value={q} onChange={(e)=>set('q',e.target.value)} placeholder={t.catalog.search}/>{q && <button type="button" onClick={() => set('q','')} aria-label="Clear"><X size={17}/></button>}</label>
          <button className="btn btn--soft mobile-filter-btn" type="button" onClick={() => setMobileFilters(true)}><Filter size={18}/>{t.catalog.filters}</button>
          <label className="select-field"><SlidersHorizontal size={18}/><select value={sort} onChange={(e)=>set('sort',e.target.value)} aria-label={t.catalog.sort}>
            <option value="popular">{t.catalog.popular}</option>
            <option value="new">{t.catalog.newest}</option>
            <option value="price-asc">{t.catalog.cheap}</option>
            <option value="price-desc">{t.catalog.expensive}</option>
          </select></label>
        </div>

        {error && <div className="notice notice--error">{error}</div>}
        <div className="catalog-layout">
          <aside className="desktop-filters">{filterPanel}</aside>
          <div>
            <div className="catalog-result-row"><span>{loading ? t.common.loading : `${t.catalog.found}: ${filtered.length}`}</span></div>
            {!loading && filtered.length === 0
              ? <EmptyState type="search" title={t.catalog.emptyTitle} text={products.length ? t.catalog.emptyText : t.featured.emptyText} action={t.catalog.reset} to="/catalog"/>
              : <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product}/>)}</div>}
          </div>
        </div>
      </div>

      <div className={`bottom-sheet-backdrop ${mobileFilters ? 'is-open' : ''}`} onClick={() => setMobileFilters(false)}/>
      <aside className={`bottom-sheet ${mobileFilters ? 'is-open' : ''}`} aria-hidden={!mobileFilters}>
        <div className="bottom-sheet__handle"/>
        <div className="bottom-sheet__header"><strong>{t.catalog.filters}</strong><button className="icon-btn" type="button" onClick={() => setMobileFilters(false)} aria-label="Close"><X/></button></div>
        {filterPanel}
        <button className="btn btn--primary btn--block" type="button" onClick={() => setMobileFilters(false)}>{t.catalog.found}: {filtered.length}</button>
      </aside>
    </section>
  )
}
