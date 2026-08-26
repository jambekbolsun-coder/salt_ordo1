import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
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
import HeroSlider from '../components/HeroSlider'

const categoryIcons = [Layers3, PackageCheck, Box, Palette, Scissors, Sparkles]
const whyIcons = [PackageCheck, Palette, Scissors, MessageCircle]

gsap.registerPlugin(ScrollTrigger)

export default function Home() {
  const pageRef = useRef(null)
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
  }, [t.common.error])

  const featured = products.filter((p) => p.is_featured || p.is_new || p.is_on_sale).slice(0, 4)
  const visibleProducts = featured.length ? featured : products.slice(0, 4)

  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add({ motion:'(prefers-reduced-motion: no-preference)', desktop:'(min-width: 1025px)' }, (context) => {
      if (!context.conditions.motion) return

      gsap.utils.toArray('.reveal-item').forEach((element) => {
        gsap.from(element, {
          opacity:0,
          y:24,
          duration:.7,
          ease:'power3.out',
          scrollTrigger:{ trigger:element, start:'top 88%', once:true },
        })
      })

      gsap.fromTo('.custom-order-board',
        { scale:.9, opacity:.55 },
        { scale:1, opacity:1, ease:'none', scrollTrigger:{ trigger:'.custom-order-section', start:'top 86%', end:'center 48%', scrub:.6 } },
      )

      if (context.conditions.desktop) {
        ScrollTrigger.create({
          trigger:'.why-grid',
          start:'top 108px',
          end:'bottom bottom-=96',
          pin:'.why-intro',
          pinSpacing:false,
        })
      }
    })
    return () => media.revert()
  }, { scope:pageRef })

  return (
    <div className="home-page" ref={pageRef}>
      <HeroSlider/>

      <div className="trust-marquee" aria-label={t.hero.eyebrow}>
        <div className="trust-marquee__track">
          {[t.hero.trust1, t.hero.trust2, t.hero.trust3].map((item) => <span key={item}><i aria-hidden="true"/>{item}</span>)}
          <div aria-hidden="true">
            {[t.hero.trust1, t.hero.trust2, t.hero.trust3].map((item) => <span key={`copy-${item}`}><i/>{item}</span>)}
          </div>
        </div>
      </div>

      <section className="section categories-section" id="categories">
        <div className="container">
          <div className="section-heading reveal-item">
            <div><span className="eyebrow">{t.category.eyebrow}</span><h2>{t.category.title}</h2></div>
            <Link className="text-link" to="/catalog">{t.category.all}<ArrowRight size={17}/></Link>
          </div>
          {categories.length > 0 ? (
            <div className="category-grid">
              {categories.slice(0, 6).map((category, index) => {
                const Icon = categoryIcons[index % categoryIcons.length]
                return (
                  <Link className="category-card reveal-item" key={category.id} to={`/catalog?category=${category.slug}`}>
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
          <div className="section-heading reveal-item">
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
          <div className="custom-order-copy reveal-item">
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

      <section className="section why-section" id="about">
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
              return <article className="why-card reveal-item" key={title}><span><Icon/></span><h3>{title}</h3><p>{text}</p></article>
            })}
          </div>
        </div>
      </section>

      <section className="section delivery-section" id="delivery">
        <div className="container delivery-card reveal-item">
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
          <div className="section-heading section-heading--center reveal-item"><div><span className="eyebrow">{t.steps.eyebrow}</span><h2>{t.steps.title}</h2></div></div>
          <div className="steps">{t.steps.items.map(([number,title,text]) => <article className="step-card reveal-item" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>
    </div>
  )
}
