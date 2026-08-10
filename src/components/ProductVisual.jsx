import Ornament from './Ornament'
import { useLanguage } from '../state/LanguageContext'
import { categoryName, localizedField } from '../lib/productText'

export default function ProductVisual({ product, compact = false }) {
  const { lang } = useLanguage()
  const image = product?.images?.slice?.().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))[0]
  const name = localizedField(product, 'name', lang) || 'Salt Ordo'
  if (image?.public_url) {
    return <img className="product-photo" src={image.public_url} alt={image.alt_text || name} loading="lazy" />
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
