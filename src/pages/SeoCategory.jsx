import { useEffect, useMemo, useState } from 'react'
import { Check, MessageCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import SeoHead from '../components/SeoHead'
import { listProducts } from '../lib/api'
import { SITE_ORIGIN, categoryLandingByPageSlug } from '../lib/seoContent'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'
import NotFound from './NotFound'

export default function SeoCategory() {
  const { pageSlug } = useParams()
  const landing = categoryLandingByPageSlug(pageSlug)
  const [products, setProducts] = useState([])
  const { lang, t } = useLanguage()
  const { settings } = useSiteSettings()

  useEffect(() => {
    if (!landing) return undefined
    let active = true
    listProducts().then((rows) => active && setProducts(rows)).catch(() => {})
    return () => { active = false }
  }, [landing])

  const filtered = useMemo(
    () => products.filter((product) => product.category?.slug === landing?.categorySlug),
    [products, landing?.categorySlug],
  )

  if (!landing) return <NotFound />
  const copy = landing.copy[lang] || landing.copy.ru
  const path = `/${landing.slug}`
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: copy.title,
      description: copy.description,
      url: `${SITE_ORIGIN}${path}`,
      isPartOf: { '@type': 'WebSite', name: 'Salt Ordo', url: SITE_ORIGIN },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t.nav.home, item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: copy.eyebrow, item: `${SITE_ORIGIN}${path}` },
      ],
    },
  ]

  return (
    <section className="seo-category-page page-section">
      <SeoHead title={`${copy.title} | Salt Ordo`} description={copy.description} path={path} image={landing.heroImage} schema={schema}/>
      <div className="container">
        <div className="seo-category-hero">
          <div className="seo-category-hero__copy">
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.lead}</p>
            <div className="seo-category-actions">
              <a className="btn btn--primary" href={whatsappUrl(settings.whatsapp, copy.title)} target="_blank" rel="noreferrer"><MessageCircle/>{t.cta.button}</a>
              <Link className="btn btn--ghost" to={`/catalog?category=${landing.categorySlug}`}>{t.nav.catalog}</Link>
            </div>
          </div>
          <img src={landing.heroImage} alt={copy.eyebrow} fetchpriority="high"/>
        </div>

        <div className="seo-category-benefits" aria-label={copy.title}>
          {copy.points.map((point) => <span key={point}><Check/>{point}</span>)}
        </div>

        <section className="seo-category-products">
          <div className="home-catalog__heading"><h2>{copy.eyebrow}</h2><Link to={`/catalog?category=${landing.categorySlug}`}>{t.category.all}</Link></div>
          {filtered.length > 0
            ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product}/>)}</div>
            : <div className="seo-category-empty"><p>{copy.details}</p><Link className="btn btn--ghost" to="/contacts">{t.nav.contacts}</Link></div>}
        </section>

        <section className="seo-category-copy">
          <h2>{copy.title}</h2>
          <p>{copy.details}</p>
          <p>{lang === 'kg'
            ? 'Salt Ordo буюмдарды Бишкекте кол менен даярдайт. Түс, кездеме, өлчөм жана комплекттин курамы менеджер менен алдын ала макулдашылат.'
            : lang === 'en'
              ? 'Salt Ordo pieces are handmade in Bishkek. Color, fabric, dimensions and set composition are agreed with a manager before production.'
              : 'Изделия Salt Ordo создаются вручную в Бишкеке. Цвет, ткань, размер и состав комплекта заранее согласовываются с менеджером.'}</p>
        </section>
      </div>
    </section>
  )
}
