import { Link } from 'react-router-dom'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'
export default function Footer() {
  const { settings } = useSiteSettings()
  return (
    <footer className="atelier-footer">
      <div className="atelier-footer__top">
        <Link to="/" className="atelier-wordmark">
          SALT ORDO<span>Ткань. Ремесло. Семейная история.</span>
        </Link>
        <p>
          Готовые изделия и индивидуальный пошив.
          <br />
          Бишкек, ул. Мукаша Абдраева, 198/1.
          <br />
          Посещение по предварительной договорённости.
        </p>
        <div>
          <a
            href={whatsappUrl(
              settings.whatsapp,
              'Здравствуйте! Хочу обсудить изделие Salt Ordo.',
            )}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp ↗
          </a>
          <a href={`tel:+${String(settings.whatsapp).replace(/[^0-9]/g, '')}`}>
            {settings.whatsapp}
          </a>
          <a href={settings.instagram} target="_blank" rel="noreferrer">
            Instagram ↗
          </a>
        </div>
      </div>
      <nav aria-label="Полезные страницы">
        <Link to="/collections">Коллекции</Link>
        <Link to="/materials">Материалы</Link>
        <Link to="/care">Уход</Link>
        <Link to="/selection">Моя подборка</Link>
        <Link to="/cart">Корзина заявок</Link>
        <Link to="/privacy">Конфиденциальность</Link>
        <Link to="/cookies">Cookies</Link>
        <button
          onClick={() =>
            window.dispatchEvent(new Event('salt-cookie-settings'))
          }
        >
          Настройки cookies
        </button>
      </nav>
      <div className="atelier-footer__bottom">
        <span>© {new Date().getFullYear()} Salt Ordo</span>
        <span>Бишкек · Кыргызстан</span>
      </div>
    </footer>
  )
}
