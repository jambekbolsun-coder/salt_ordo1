import { ArrowUpRight, Bookmark, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFavorites } from '../state/FavoritesContext'
import { processSteps } from '../lib/atelierContent'
export function EditorialPhoto({
  slug,
  alt,
  priority = false,
  className = '',
}) {
  return (
    <img
      className={`editorial-photo ${className}`}
      src={`/atelier/${slug}-960.webp`}
      srcSet={`/atelier/${slug}-480.webp 480w, /atelier/${slug}-960.webp 960w`}
      sizes="(max-width:700px) 100vw,50vw"
      alt={alt}
      width="960"
      height="1280"
      loading={priority ? 'eager' : 'lazy'}
      fetchpriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  )
}
export function HeroMedia({ video = null, ...photo }) {
  if (!video) return <EditorialPhoto {...photo} />
  return (
    <video
      className="editorial-photo"
      controls
      playsInline
      preload="none"
      poster={`/atelier/${photo.slug}-960.webp`}
      aria-label={photo.alt}
    >
      <source src={video} type="video/mp4" />
    </video>
  )
}
export function PhotoSlot({ src, label, format = '4:5' }) {
  if (!src) return <PhotoPending label={label} format={format} />
  const [width, height] = format.split(':').map(Number)
  return (
    <img
      className="editorial-photo"
      src={src}
      alt={label}
      loading="lazy"
      decoding="async"
      width={width * 400}
      height={height * 400}
      style={{ aspectRatio: `${width}/${height}` }}
    />
  )
}
export function TextLink({ to, children }) {
  return (
    <Link className="atelier-link" to={to}>
      {children}
      <ArrowUpRight size={18} aria-hidden="true" />
    </Link>
  )
}
export function SaveIdea({ item, compact = false }) {
  const { contains, toggleItem } = useFavorites()
  const selected = contains(item)
  return (
    <button
      type="button"
      className={`save-idea ${selected ? 'is-saved' : ''}`}
      aria-pressed={selected}
      aria-label={`${selected ? 'Убрать из подборки' : 'В подборку'}: ${item.label}`}
      onClick={() => toggleItem(item)}
    >
      {selected ? (
        <Check size={18} aria-hidden="true" />
      ) : (
        <Bookmark size={18} aria-hidden="true" />
      )}
      {!compact && (selected ? 'В подборке' : 'В подборку')}
    </button>
  )
}
export function PageIntro({ eyebrow, title, children }) {
  return (
    <header className="atelier-intro">
      <nav className="atelier-crumbs" aria-label="Хлебные крошки">
        <Link to="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <span>{eyebrow || title}</span>
      </nav>
      <span className="atelier-kicker">{eyebrow || 'Salt Ordo · Бишкек'}</span>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  )
}
export function PhotoPending({ label, format = '4:5' }) {
  return (
    <div className="photo-pending">
      <span className="photo-pending__mark" aria-hidden="true">
        SO
      </span>
      <p>{label}</p>
      <small>Фотография появится здесь · {format}</small>
    </div>
  )
}
export function Process({ compact = false }) {
  return (
    <section className="atelier-section">
      <div className="atelier-section-head">
        <span className="atelier-kicker">От разговора к изделию</span>
        <h2>
          У каждой вещи
          <br />
          <em>свой путь.</em>
        </h2>
      </div>
      <ol className={`process-list ${compact ? 'is-compact' : ''}`}>
        {processSteps.map(([title, text], i) => (
          <li key={title}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
export function Invitation() {
  return (
    <section className="atelier-invitation">
      <span className="atelier-kicker">Начнём с вашей идеи</span>
      <h2>
        Каким будет
        <br />
        <em>ваш комплект?</em>
      </h2>
      <p>
        Можно прийти с готовым замыслом. А можно — с одним любимым оттенком.
      </p>
      <TextLink to="/individual-order">Обсудить индивидуальный заказ</TextLink>
      <TextLink to="/contacts">Посетить мастерскую</TextLink>
    </section>
  )
}
