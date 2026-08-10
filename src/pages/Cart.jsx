import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../state/CartContext'
import { money } from '../lib/format'
import ProductVisual from '../components/ProductVisual'
import EmptyState from '../components/EmptyState'
import { useLanguage } from '../state/LanguageContext'
import { categoryName, localizedField } from '../lib/productText'

export default function Cart() {
  const { items, setQty, remove, total } = useCart()
  const { lang, t } = useLanguage()
  if (items.length === 0) return <section className="section page-section"><div className="container"><div className="page-hero compact-page-hero"><span className="eyebrow">{t.cart.eyebrow}</span><h1>{t.cart.title}</h1></div><EmptyState type="cart" title={t.cart.emptyTitle} text={t.cart.emptyText} action={t.cart.toCatalog}/></div></section>

  const hasRequest = items.some((item) => item.price_on_request || item.sale_price == null)
  return (
    <section className="section page-section">
      <div className="container">
        <div className="page-hero compact-page-hero"><span className="eyebrow">{t.cart.eyebrow}</span><h1>{t.cart.title}</h1></div>
        <div className="cart-layout">
          <div className="cart-list">
            {items.map((item) => {
              const name = localizedField(item, 'name', lang)
              return <article className="cart-item" key={item.id}>
                <div className="cart-item__media"><ProductVisual compact product={item}/></div>
                <div className="cart-item__body">
                  <span>{categoryName(item.category, lang)}</span><strong>{name}</strong><small>{item.seam || ''}</small>
                  <div className="cart-item__mobile-price">{item.price_on_request ? t.catalog.requestPrice : money(item.sale_price, t.common.som)}</div>
                </div>
                <div className="qty-control"><button type="button" onClick={()=>setQty(item.id,item.quantity-1)} aria-label="Minus"><Minus/></button><span>{item.quantity}</span><button type="button" onClick={()=>setQty(item.id,item.quantity+1)} aria-label="Plus"><Plus/></button></div>
                <div className="cart-item__price"><strong>{item.price_on_request ? t.catalog.requestPrice : money(Number(item.sale_price||0)*item.quantity, t.common.som)}</strong></div>
                <button className="icon-btn danger-btn" type="button" onClick={()=>remove(item.id)} aria-label={t.cart.remove}><Trash2/></button>
              </article>
            })}
          </div>
          <aside className="order-summary">
            <span className="eyebrow">{t.cart.total}</span>
            <div className="summary-line"><span>{t.catalog.found}</span><strong>{items.reduce((sum,item)=>sum+item.quantity,0)}</strong></div>
            <div className="summary-line summary-line--total"><span>{t.cart.total}</span><strong>{money(total, t.common.som)}</strong></div>
            {hasRequest && <p className="summary-note">{t.cart.requestPriceNote}</p>}
            <Link className="btn btn--primary btn--block" to="/checkout">{t.cart.checkout}<ArrowRight size={18}/></Link>
            <Link className="btn btn--ghost btn--block" to="/catalog">{t.cart.continue}</Link>
          </aside>
        </div>
      </div>
    </section>
  )
}
