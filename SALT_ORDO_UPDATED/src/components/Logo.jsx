import { Link } from 'react-router-dom'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'

const taglines = {
  ru: 'текстиль · готовое и на заказ',
  kg: 'текстиль · даяр жана буюртма',
  en: 'textiles · ready & custom',
}

export default function Logo({ compact = false }) {
  const { lang } = useLanguage()
  const { settings } = useSiteSettings()
  const brand = settings?.brand_name || 'Salt Ordo'
  return (
    <Link className={`brand ${compact ? 'brand--compact' : ''}`} to="/" aria-label={brand}>
      <img src="/salt-ordo-logo.png" alt="" />
      {!compact && (
        <span className="brand__text">
          <strong>{brand}</strong>
          <small>{taglines[lang]}</small>
        </span>
      )}
    </Link>
  )
}
