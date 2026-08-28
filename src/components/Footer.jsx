import { Instagram, MessageCircle, Phone, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'
import LeadCapture from './LeadCapture'

export default function Footer() {
  const { lang, t } = useLanguage()
  const { settings } = useSiteSettings()
  const phoneHref = `tel:+${String(settings.whatsapp).replace(/\D/g,'')}`
  const delivery = settings[`delivery_note_${lang}`] || t.delivery.title

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-shell">
          <div className="footer-top">
            <div className="footer-brand">
              <Logo/>
              <p>{t.footer.text}</p>
            </div>
            <div className="footer-top__action">
              <div><strong>{t.cta.title}</strong><small>{t.cta.text}</small></div>
              <a className="btn btn--primary" href={whatsappUrl(settings.whatsapp, t.common.customWhatsappText)} target="_blank" rel="noreferrer"><MessageCircle size={18}/>{t.cta.button}</a>
            </div>
            <LeadCapture compact source="contact" message={t.common.whatsappText}/>
          </div>

          <div className="footer-row">
            <nav className="footer-links" aria-label={t.footer.navigation}>
              <span>{t.footer.navigation}</span>
              <Link to="/">{t.nav.home}</Link>
              <Link to="/catalog">{t.nav.catalog}</Link>
              <Link to="/contacts">{t.nav.contacts}</Link>
            </nav>

            <div className="footer-contact">
              <span>{t.footer.contact}</span>
              <a href={phoneHref}><Phone size={16}/>{settings.whatsapp}</a>
              <a href={whatsappUrl(settings.whatsapp, t.common.whatsappText)} target="_blank" rel="noreferrer"><MessageCircle size={16}/> WhatsApp</a>
              <a href={settings.instagram} target="_blank" rel="noreferrer"><Instagram size={16}/> Instagram</a>
            </div>

            <div className="footer-delivery"><Truck size={17}/><span>{delivery}</span></div>
          </div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Salt Ordo</span><span>{t.footer.rights}</span></div>
      </div>
    </footer>
  )
}
