import photoManifest from '../lib/photo-manifest.json'
import Ornament from './Ornament'
import { useLanguage } from '../state/LanguageContext'
import { categoryName, localizedField } from '../lib/productText'

export default function ProductVisual({ product, compact = false }) {
  const { lang } = useLanguage()
  const image = product?.images?.slice?.().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))[0]
  const name = localizedField(product, 'name', lang) || 'Salt Ordo'
  if (image?.public_url) {
    const optimized=photoManifest[image.public_url]
    return <img className="product-photo" width={optimized?.width||960} height={optimized?.height||1280} srcSet={optimized?`/atelier/${optimized.slug}-480.webp 480w, /atelier/${optimized.slug}-960.webp 960w`:undefined} sizes="(max-width:700px) 45vw, 30vw" src={optimized?`/atelier/${optimized.slug}-960.webp`:image.public_url} alt={image.alt_text || name} loading="lazy" />
  }
  return (
    <div className={`product-placeholder tone-${product?.hero_tone || 'mix'} ${compact ? 'is-compact' : ''}`}>
      <div className="product-placeholder__fabric"/>
      <Ornament className="product-placeholder__ornament"/>
      <span>Salt Ordo</span>
      <small>{categoryName(product?.category, lang) || name}</small>
    </div>
  )
}
