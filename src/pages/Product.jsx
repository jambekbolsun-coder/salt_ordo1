import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Heart, Instagram, MessageCircle, Minus, Phone, Plus, ShoppingBag, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getProduct } from '../lib/api'
import { money } from '../lib/format'
import ProductVisual from '../components/ProductVisual'
import EmptyState from '../components/EmptyState'
import { useCart } from '../state/CartContext'
import { useFavorites } from '../state/FavoritesContext'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { categoryName, isPromotionActive, localizedField } from '../lib/productText'
import { whatsappUrl } from '../lib/whatsapp'

export default function Product() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const { add } = useCart()
  const { has, toggle } = useFavorites()
  const { lang, t } = useLanguage()
  const { settings } = useSiteSettings()

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    setActiveImage(0)
    getProduct(slug)
      .then((data) => active && setProduct(data))
      .catch((error) => { if (active) { setProduct(null); setLoadError(error.message || t.common.error) } })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    if (!added) return undefined
    const timer = window.setTimeout(() => setAdded(false), 1100)
    return () => window.clearTimeout(timer)
  }, [added])

  if (loading) return <div className="screen-loader"><img src="/salt-ordo-logo.png" alt=""/><span>{t.common.loading}</span></div>
  if (!product) return <section className="section page-section"><div className="container"><EmptyState title={t.catalog.emptyTitle} text={loadError || t.catalog.emptyText}/></div></section>

  const sortedImages = (product.images || []).slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
  const currentImage = sortedImages[Math.min(activeImage, Math.max(0, sortedImages.length - 1))]
  const name = localizedField(product, 'name', lang)
  const description = localizedField(product, 'description', lang)
  const seam = localizedField(product, 'seam', lang)
  const material = localizedField(product, 'material', lang)
  const category = categoryName(product.category, lang) || 'Salt Ordo'
  const promo = isPromotionActive(product)
  const phoneHref = `tel:+${String(settings.whatsapp).replace(/\D/g,'')}`
  const message = lang === 'kg'
    ? `Саламатсызбы! «${name}» товары мага жакты. Баасын, бар-жогун жана буйрутма шарттарын тактап бересизби?`
    : lang === 'en'
      ? `Hello! I like “${name}”. Could you please confirm the price, availability and order details?`
      : `Здравствуйте! Мне понравился товар «${name}». Подскажите, пожалуйста, по цене, наличию и условиям заказа.`

  const showImage = (direction) => {
    if (sortedImages.length < 2) return
    setActiveImage((current) => (current + direction + sortedImages.length) % sortedImages.length)
  }

  const addToCart = () => {
    add(product, qty)
    setAdded(true)
  }

  return (
    <section className="section product-page">
      <div className="container">
        <Link className="back-link" to="/catalog"><ArrowLeft size={17}/>{t.product.back}</Link>
        <div className="product-detail">
          <div className="product-detail__gallery">
            <div className="product-detail__main">
              {currentImage?.public_url
                ? <img className="product-detail__image" src={currentImage.public_url} alt={currentImage.alt_text || name}/>
                : <ProductVisual product={product}/>
              }
              {sortedImages.length > 1 && <>
                <button className="gallery-arrow gallery-arrow--prev" type="button" onClick={() => showImage(-1)} aria-label={t.product.previousImage || 'Previous image'}><ChevronLeft/></button>
                <button className="gallery-arrow gallery-arrow--next" type="button" onClick={() => showImage(1)} aria-label={t.product.nextImage || 'Next image'}><ChevronRight/></button>
                <span className="gallery-counter">{activeImage + 1} / {sortedImages.length}</span>
              </>}
            </div>
            {sortedImages.length > 1 && <div className="product-thumbs" aria-label={t.product.gallery || 'Gallery'}>{sortedImages.map((image,index) => <button type="button" key={image.id || image.public_url} className={activeImage === index ? 'is-active' : ''} onClick={()=>setActiveImage(index)} aria-label={`${t.catalog.openProduct} ${index + 1}`}><img src={image.public_url} alt="" loading="lazy"/></button>)}</div>}
          </div>

          <div className="product-detail__info">
            <span className="eyebrow">{category}</span>
            <h1>{name}</h1>
            <div className="detail-price">
              <strong>{product.price_on_request ? t.product.priceOnRequest : money(product.sale_price, t.common.som)}</strong>
              {promo && product.old_price && <del>{money(product.old_price, t.common.som)}</del>}
            </div>
            {description && <p className="detail-description">{description}</p>}

            <div className="detail-specs">
              <div><span>{t.product.seam}</span><strong>{seam || '—'}</strong></div>
              <div><span>{t.product.material}</span><strong>{material || '—'}</strong></div>
              <div><span>{t.product.colors}</span><strong>{(product.colors || []).join(', ') || '—'}</strong></div>
              <div><span>{t.product.sizes}</span><strong>{(product.sizes || []).join(', ') || '—'}</strong></div>
              <div><span>{t.product.stock}</span><strong>{Number(product.stock_qty || 0) > 0 ? `${t.product.inStock}: ${product.stock_qty}` : t.product.madeToOrder}</strong></div>
              {product.production_days != null && <div><span>{t.product.production}</span><strong>{product.production_days} {t.product.days}</strong></div>}
              {product.sku && <div><span>{t.product.sku}</span><strong>{product.sku}</strong></div>}
            </div>

            <div className="detail-actions">
              <div className="qty-control"><button type="button" onClick={()=>setQty(Math.max(1,qty-1))} aria-label="Minus"><Minus/></button><span>{qty}</span><button type="button" onClick={()=>setQty(Math.min(99,qty+1))} aria-label="Plus"><Plus/></button></div>
              <button className={`btn btn--primary ${added ? 'is-success' : ''}`} type="button" onClick={addToCart}>{added ? <Check size={18}/> : <ShoppingBag size={18}/>} {added ? (t.catalog.added || t.product.add) : t.product.add}</button>
              <button className={`icon-btn favorite-large ${has(product.id)?'is-active':''}`} type="button" onClick={()=>toggle(product.id)} aria-label={t.catalog.favorite}><Heart fill={has(product.id)?'currentColor':'none'}/></button>
            </div>
            <a className="btn btn--ghost btn--block" href={whatsappUrl(settings.whatsapp, message)} target="_blank" rel="noreferrer"><MessageCircle size={18}/>{t.product.whatsapp}</a>

            <div className="detail-trust">
              <span><Check/>{t.custom.point2}</span>
              <span><Check/>{t.custom.point3}</span>
              <span><Check/>{t.product.customHint}</span>
            </div>
          </div>
        </div>

        <section className="product-contact-card">
          <div className="product-contact-card__copy">
            <span className="eyebrow">Salt Ordo</span>
            <h2>{t.product.contactTitle || t.cta.title}</h2>
            <p>{t.product.contactText || t.cta.text}</p>
            <div className="product-contact-card__delivery"><Truck/><span>{settings[`delivery_note_${lang}`] || t.delivery.title}</span></div>
          </div>
          <div className="product-contact-card__actions">
            <a className="btn btn--primary" href={whatsappUrl(settings.whatsapp, message)} target="_blank" rel="noreferrer"><MessageCircle/>{t.product.contactWhatsapp || t.product.whatsapp}</a>
            <a className="btn btn--ghost" href={phoneHref}><Phone/>{t.product.contactCall || settings.whatsapp}</a>
            <a className="btn btn--ghost" href={settings.instagram} target="_blank" rel="noreferrer"><Instagram/>{t.product.contactInstagram || 'Instagram'}</a>
          </div>
        </section>
      </div>
    </section>
  )
}
