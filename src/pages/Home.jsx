import { Image as ImageIcon, PackageCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HeroSlider from '../components/HeroSlider'
import ProductCard from '../components/ProductCard'
import { listCategories, listProducts } from '../lib/api'
import { categoryName } from '../lib/productText'
import { useLanguage } from '../state/LanguageContext'
import SeoHead from '../components/SeoHead'
import { SITE_ORIGIN, categoryLandingPages, categoryPathBySlug } from '../lib/seoContent'

const homeSchema = [
  {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Store'],
    name: 'Salt Ordo',
    url: SITE_ORIGIN,
    image: `${SITE_ORIGIN}/og.webp`,
    telephone: '+996998992996',
    priceRange: '3 500–22 200 KGS',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'ул. Мукаша Абдраева, 198/1',
      addressLocality: 'Бишкек',
      addressCountry: 'KG',
    },
    areaServed: { '@type': 'Country', name: 'Кыргызстан' },
    sameAs: ['https://www.instagram.com/salt_ordo/'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Salt Ordo',
    url: SITE_ORIGIN,
    inLanguage: ['ru', 'ky', 'en'],
  },
]

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
      <SeoHead
        title="Кызга сеп и жер төшөк в Бишкеке | Salt Ordo"
        description="Salt Ordo — кызга сеп, жер төшөк, жууркан, жаздык и сандык ручной работы в Бишкеке. Готовые изделия, индивидуальный пошив и доставка по Кыргызстану."
        path="/"
        image="/og.webp"
        schema={homeSchema}
      />
      <HeroSlider/>
      <section className="home-seo-intro">
        <div className="container">
          <span className="eyebrow">Salt Ordo · Бишкек</span>
          <h2>{lang === 'kg' ? 'Кызга сеп, жер төшөк жана үй текстили' : lang === 'en' ? 'Bridal dowry sets and handmade home textiles' : 'Кызга сеп, жер төшөк и домашний текстиль ручной работы'}</h2>
          <p>{lang === 'kg'
            ? 'Даяр буюмдарды тандаңыз же сүрөтүңүз боюнча жеке комплектке буйрутма бериңиз. Кездеме, түс, өлчөм жана жасалгалоо сиздин каалооңузга ылайык тандалат.'
            : lang === 'en'
              ? 'Choose an available piece or order a coordinated set from your reference. Fabric, palette, dimensions and finishing are tailored to you.'
              : 'Выберите готовое изделие или закажите комплект по своему референсу. Подберём ткань, цвет, размер и оформление под вашу традицию и интерьер.'}</p>
          <nav className="home-seo-links" aria-label="Популярные категории">
            {categoryLandingPages.map((item) => <Link key={item.slug} to={`/${item.slug}`}>{(item.copy[lang] || item.copy.ru).eyebrow}</Link>)}
          </nav>
        </div>
      </section>
      <section className="home-catalog" id="categories">
        <div className="container home-catalog__inner">
          <div className="home-catalog__heading">
            <h2>{t.catalog.eyebrow}</h2>
            <Link to="/catalog">{t.category.all}</Link>
          </div>
          {categories.length > 0 ? (
            <nav className="home-category-pills" aria-label={t.catalog.category}>
              {categories.slice(0, 6).map((category, index) => (
                <Link className={index === 0 ? 'is-active' : ''} key={category.id} to={categoryPathBySlug[category.slug] || `/catalog?category=${category.slug}`}>
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
