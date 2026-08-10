import { useEffect, useState } from 'react'
import {
  ArrowRight, Box, CheckCircle2, HeartHandshake, Image as ImageIcon, Layers3,
  MessageCircle, PackageCheck, Palette, Ruler, Scissors, ShieldCheck, Sparkles, Truck
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { listCategories, listProducts } from '../lib/api'
import ProductCard from '../components/ProductCard'
import Ornament from '../components/Ornament'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { categoryName } from '../lib/productText'
import { whatsappUrl } from '../lib/whatsapp'

const categoryIcons = [Layers3, PackageCheck, Box, Palette, Scissors, Sparkles]
const whyIcons = [PackageCheck, Palette, Scissors, MessageCircle]

export default function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const { lang, t } = useLanguage()
  const { settings } = useSiteSettings()

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
  }, [])

  const featured = products.filter((p) => p.is_featured || p.is_new || p.is_on_sale).slice(0, 4)
  const visibleProducts = featured.length ? featured : products.slice(0, 4)

  return (
    <>
      <section className="hero section">
        <div className="container hero__grid">
          <div className="hero__content">
            <span className="eyebrow">{t.hero.eyebrow}</span>
            <h1>{t.hero.title}</h1>
            <p>{t.hero.text}</p>
            <div className="hero__actions">
              <Link className="btn btn--primary" to="/catalog">{t.hero.catalog}<ArrowRight size={18}/></Link>
              <a className="btn btn--ghost" href={whatsappUrl(settings.whatsapp, t.common.whatsappText)} target="_blank" rel="noreferrer"><MessageCircle size={18}/>{t.hero.consult}</a>
            </div>
            <div className="hero__trust">
              <span><Scissors size={17}/>{t.hero.trust1}</span>
              <span><Truck size={17}/>{t.hero.trust2}</span>
              <span><Palette size={17}/>{t.hero.trust3}</span>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="hero-art__orb hero-art__orb--pink"/>
            <div className="hero-art__orb hero-art__orb--blue"/>
            <div className="hero-art__card hero-art__card--main">
              <div className="hero-art__logo"><img src="/salt-ordo-logo.png" alt=""/></div>
              <div className="hero-art__lines"><span/><span/><span/></div>
              <strong>{t.hero.cardTitle}</strong>
              <small>{t.hero.cardText}</small>
            </div>
            <div className="hero-art__card hero-art__card--small rose"><span>Salt Ordo</span><strong>{t.hero.chip1}</strong></div>
            <div className="hero-art__card hero-art__card--small blue"><span>Custom</span><strong>{t.hero.chip2}</strong></div>
            <Ornament className="hero-art__ornament"/>
          </div>
        </div>
      </section>

      <section className="section categories-section" id="categories">
        <div className="container">
          <div className="section-heading">
            <div><span className="eyebrow">{t.category.eyebrow}</span><h2>{t.category.title}</h2></div>
            <Link className="text-link" to="/catalog">{t.category.all}<ArrowRight size={17}/></Link>
          </div>
          {categories.length > 0 ? (
            <div className="category-grid">
              {categories.slice(0, 6).map((category, index) => {
                const Icon = categoryIcons[index % categoryIcons.length]
                return (
                  <Link className="category-card" key={category.id} to={`/catalog?category=${category.slug}`}>
                    <span className="category-card__icon"><Icon/></span>
                    <strong>{categoryName(category, lang)}</strong>
                    <small>{t.category.open}</small>
                    <ArrowRight className="category-card__arrow"/>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="soft-empty-row"><ImageIcon/><span>{t.category.empty}</span></div>
          )}
        </div>
      </section>

      <section className="section products-section">
        <div className="container">
          <div className="section-heading">
            <div><span className="eyebrow">{t.featured.eyebrow}</span><h2>{t.featured.title}</h2><p>{t.featured.text}</p></div>
            <Link className="btn btn--soft" to="/catalog">{t.featured.all}</Link>
          </div>
          {error && <div className="notice notice--error">{error}</div>}
          {visibleProducts.length ? (
            <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product}/>)}</div>
          ) : (
            <div className="catalog-empty-inline"><PackageCheck/><div><strong>{t.featured.emptyTitle}</strong><span>{t.featured.emptyText}</span></div></div>
          )}
        </div>
      </section>

      <section className="section custom-order-section" id="custom-order">
        <div className="container custom-order-grid">
          <div className="custom-order-copy">
            <span className="eyebrow">{t.custom.eyebrow}</span>
            <h2>{t.custom.title}</h2>
            <p>{t.custom.text}</p>
            <div className="custom-order-points">
              <span><ImageIcon/>{t.custom.point1}</span>
              <span><Palette/>{t.custom.point2}</span>
              <span><Ruler/>{t.custom.point3}</span>
              <span><CheckCircle2/>{t.custom.point4}</span>
            </div>
            <a className="btn btn--primary" href={whatsappUrl(settings.whatsapp, t.common.customWhatsappText)} target="_blank" rel="noreferrer"><MessageCircle size={18}/>{t.custom.cta}</a>
            <small className="custom-order-note">{t.custom.note}</small>
          </div>
          <div className="custom-order-visual" aria-hidden="true">
            <div className="custom-order-board">
              <span className="custom-order-board__tag">CUSTOM</span>
              <div className="custom-order-swatches"><i/><i/><i/><i/></div>
              <div className="custom-order-shape"><Ornament/></div>
              <strong>Salt Ordo</strong>
              <small>your style · your palette · your size</small>
            </div>
            <div className="custom-order-float custom-order-float--one"><Scissors/><span>stitch</span></div>
            <div className="custom-order-float custom-order-float--two"><Palette/><span>palette</span></div>
          </div>
        </div>
      </section>

      <section className="section why-section">
        <div className="container why-grid">
          <div className="why-intro">
            <span className="eyebrow">{t.why.eyebrow}</span>
            <h2>{t.why.title}</h2>
            <p>{t.why.text}</p>
            <Ornament className="why-ornament"/>
          </div>
          <div className="why-cards">
            {t.why.cards.map(([title, text], index) => {
              const Icon = whyIcons[index]
              return <article className="why-card" key={title}><span><Icon/></span><h3>{title}</h3><p>{text}</p></article>
            })}
          </div>
        </div>
      </section>

      <section className="section delivery-section" id="delivery">
        <div className="container delivery-card">
          <div className="delivery-card__icon"><Truck/></div>
          <div className="delivery-card__copy">
            <span className="eyebrow">{t.delivery.eyebrow}</span>
            <h2>{t.delivery.title}</h2>
            <p>{t.delivery.text}</p>
            <strong className="delivery-live-note">{settings[`delivery_note_${lang}`] || t.hero.trust2}</strong>
            <div className="delivery-points">
              <span><ShieldCheck/>{t.delivery.point1}</span>
              <span><PackageCheck/>{t.delivery.point2}</span>
              <span><HeartHandshake/>{t.delivery.point3}</span>
            </div>
          </div>
          <a className="btn btn--primary" href={whatsappUrl(settings.whatsapp, t.common.deliveryWhatsappText)} target="_blank" rel="noreferrer">{t.delivery.cta}<ArrowRight size={18}/></a>
        </div>
      </section>

      <section className="section how-section">
        <div className="container">
          <div className="section-heading section-heading--center"><div><span className="eyebrow">{t.steps.eyebrow}</span><h2>{t.steps.title}</h2></div></div>
          <div className="steps">{t.steps.items.map(([number,title,text]) => <article className="step-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>
    </>
  )
}
