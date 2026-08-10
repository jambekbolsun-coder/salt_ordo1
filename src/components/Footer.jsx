import { Instagram, MessageCircle, Phone, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'

export default function Footer() {
  const { lang, t } = useLanguage()
  const { settings } = useSiteSettings()
  const phoneHref = `tel:+${String(settings.whatsapp).replace(/\D/g,'')}`
  const delivery = settings[`delivery_note_${lang}`] || t.delivery.title

  return (
    <footer className="site-footer">
      <div className="container footer-cta">
        <div className="footer-cta__copy">
          <span className="eyebrow">Salt Ordo</span>
          <h2>{t.cta.title}</h2>
          <p>{t.cta.text}</p>
        </div>
        <a className="btn btn--primary" href={whatsappUrl(settings.whatsapp, t.common.customWhatsappText)} target="_blank" rel="noreferrer"><MessageCircle size={18}/>{t.cta.button}</a>
      </div>

      <div className="container footer-main">
        <div className="footer-brand">
          <Logo/>
          <p>{t.footer.text}</p>
          <div className="footer-delivery"><Truck size={16}/><span>{delivery}</span></div>
        </div>

        <div className="footer-group">
          <strong>{t.footer.navigation}</strong>
          <div className="footer-links">
            <Link to="/">{t.nav.home}</Link>
            <Link to="/catalog">{t.nav.catalog}</Link>
            <a href="/#custom-order">{t.nav.custom}</a>
            <a href="/#delivery">{t.nav.delivery}</a>
          </div>
        </div>

        <div className="footer-group footer-contact">
          <strong>{t.footer.contact}</strong>
          <a href={phoneHref}><Phone size={17}/>{settings.whatsapp}</a>
          <a href={whatsappUrl(settings.whatsapp, t.common.whatsappText)} target="_blank" rel="noreferrer"><MessageCircle size={17}/> WhatsApp</a>
          <a href={settings.instagram} target="_blank" rel="noreferrer"><Instagram size={17}/> @salt_ordo</a>
        </div>
      </div>

      <div className="container footer-bottom"><span>© {new Date().getFullYear()} Salt Ordo</span><span>{t.footer.rights}</span></div>
    </footer>
  )
}
