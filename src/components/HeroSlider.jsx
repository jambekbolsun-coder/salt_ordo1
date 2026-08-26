import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle, Palette, Pause, Play, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'

const content = {
  ru: [
    { eyebrow:'Ручная работа в Бишкеке', title:'Комфорт, созданный вручную', text:'Төшөк, подушки и целые комплекты — в вашей палитре, размере и стиле.', cta:'Смотреть каталог', alt:'Розовый комплект Salt Ordo с вышитыми подушками' },
    { eyebrow:'Цвета, которые подходят вам', title:'Комплект в вашей палитре', text:'Сочетаем оттенки, орнамент и фактуру так, чтобы весь набор выглядел цельно.', cta:'Обсудить комплект', alt:'Голубой комплект Salt Ordo с декоративным орнаментом' },
    { eyebrow:'Индивидуальный пошив', title:'По вашему размеру и референсу', text:'Покажите пример — подберём ткань, состав комплекта, отделку и срок изготовления.', cta:'Написать в WhatsApp', alt:'Комплект Salt Ordo в бежевых и коричневых тонах' },
  ],
  kg: [
    { eyebrow:'Бишкекте кол менен жасалат', title:'Кол менен жасалган ыңгайлуулук', text:'Төшөк, жаздык жана толук комплекттер — сиздин түсүңүздө, өлчөмүңүздө жана стилиңизде.', cta:'Каталогду көрүү', alt:'Саймалуу жаздыктары бар кызгылт Salt Ordo комплекти' },
    { eyebrow:'Сизге ылайык түстөр', title:'Сиздин палитраңыздагы комплект', text:'Түстөрдү, оймону жана кездемени бүтүндөй көрүнгөндөй айкалыштырабыз.', cta:'Комплектти талкуулоо', alt:'Көк түстөгү оймолуу Salt Ordo комплекти' },
    { eyebrow:'Жеке тигүү', title:'Сиздин өлчөм жана үлгү боюнча', text:'Үлгүңүздү көрсөтүңүз — кездемени, курамды, жасалганы жана мөөнөттү тандайбыз.', cta:'WhatsAppка жазуу', alt:'Күрөң жана беж түстөгү Salt Ordo комплекти' },
  ],
  en: [
    { eyebrow:'Handmade in Bishkek', title:'Comfort, crafted by hand', text:'Floor bedding, pillows and complete sets in your palette, size and style.', cta:'Browse catalog', alt:'Pink Salt Ordo bedding set with embroidered pillows' },
    { eyebrow:'Colors chosen around you', title:'A set in your palette', text:'We coordinate color, pattern and texture so every piece feels like one complete set.', cta:'Discuss a set', alt:'Blue Salt Ordo bedding set with decorative patterns' },
    { eyebrow:'Made to order', title:'Built from your size and reference', text:'Share an example and we will match the fabric, set composition, finishing and timing.', cta:'Message on WhatsApp', alt:'Salt Ordo bedding set in cream and earthy brown tones' },
  ],
}

const media = [
  [{ desktop:'/banners/hero-pink-desktop.webp', tablet:'/banners/hero-pink-tablet.webp', mobile:'/banners/hero-pink-mobile.webp' }, Sparkles],
  [{ desktop:'/banners/hero-blue-desktop.webp', tablet:'/banners/hero-blue-tablet.webp', mobile:'/banners/hero-blue-mobile.webp' }, Palette],
  [{ desktop:'/banners/hero-earth-desktop.webp', tablet:'/banners/hero-earth-tablet.webp', mobile:'/banners/hero-earth-mobile.webp' }, MessageCircle],
]

const controlLabels = {
  ru: { previous:'Предыдущий слайд', next:'Следующий слайд', slide:'Слайд', play:'Запустить слайдер', pause:'Остановить слайдер' },
  kg: { previous:'Мурунку слайд', next:'Кийинки слайд', slide:'Слайд', play:'Слайдерди иштетүү', pause:'Слайдерди токтотуу' },
  en: { previous:'Previous slide', next:'Next slide', slide:'Slide', play:'Play carousel', pause:'Pause carousel' },
}

export default function HeroSlider() {
  const { lang } = useLanguage()
  const { settings } = useSiteSettings()
  const [active, setActive] = useState(0)
  const [manualPaused, setManualPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const dragStart = useRef(null)
  const slides = content[lang] || content.ru
  const labels = controlLabels[lang] || controlLabels.ru
  const paused = manualPaused || interacting

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 5000)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  const change = (direction) => {
    setManualPaused(true)
    setActive((value) => (value + direction + slides.length) % slides.length)
  }

  const pointerDown = (event) => {
    if (event.target.closest('button, a')) return
    setManualPaused(true)
    dragStart.current = event.clientX
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const pointerUp = (event) => {
    if (dragStart.current == null) return
    const distance = event.clientX - dragStart.current
    dragStart.current = null
    if (Math.abs(distance) > 45) change(distance > 0 ? -1 : 1)
  }

  return (
    <section className="hero-slider" aria-roledescription="carousel" aria-label="Salt Ordo">
      <div className="hero-slider__viewport" onPointerDown={pointerDown} onPointerUp={pointerUp} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false) }}>
        {slides.map((slide, index) => {
          const [images, Icon] = media[index]
          const action = index === 0
            ? { to:'/catalog' }
            : index === 1
              ? { href:'#custom-order' }
              : { href:whatsappUrl(settings.whatsapp, slide.text), external:true }

          return (
            <article className={`hero-slide ${active === index ? 'is-active' : ''}`} key={slide.title} aria-hidden={active !== index}>
              <picture>
                <source media="(max-width: 640px)" srcSet={images.mobile}/>
                <source media="(max-width: 1100px)" srcSet={images.tablet}/>
                <img src={images.desktop} alt={slide.alt} fetchPriority={index === 0 ? 'high' : 'auto'} loading={index === 0 ? 'eager' : 'lazy'}/>
              </picture>
              <div className="hero-slide__veil" aria-hidden="true"/>
              <div className="container hero-slide__content">
                <span className="hero-slide__eyebrow"><Icon aria-hidden="true"/>{slide.eyebrow}</span>
                <h1>{slide.title}</h1>
                <p>{slide.text}</p>
                {action.to
                  ? <Link className="btn btn--primary" to={action.to}>{slide.cta}<ArrowRight aria-hidden="true"/></Link>
                  : <a className="btn btn--primary" href={action.href} target={action.external ? '_blank' : undefined} rel={action.external ? 'noreferrer' : undefined}>{index === 2 && <MessageCircle aria-hidden="true"/>}{slide.cta}<ArrowRight aria-hidden="true"/></a>}
              </div>
            </article>
          )
        })}
        <button className="hero-slider__arrow is-prev" type="button" onClick={() => change(-1)} aria-label={labels.previous}><ChevronLeft aria-hidden="true"/></button>
        <button className="hero-slider__arrow is-next" type="button" onClick={() => change(1)} aria-label={labels.next}><ChevronRight aria-hidden="true"/></button>
        <div className="hero-slider__dots">
          {slides.map((slide, index) => <button key={slide.title} type="button" className={active === index ? 'is-active' : ''} onClick={() => { setManualPaused(true); setActive(index) }} aria-label={`${labels.slide} ${index + 1}`}/>) }
        </div>
        <button className="hero-slider__pause" type="button" onClick={() => setManualPaused((value) => !value)} aria-label={manualPaused ? labels.play : labels.pause}>
          {manualPaused ? <Play aria-hidden="true"/> : <Pause aria-hidden="true"/>}
        </button>
      </div>
    </section>
  )
}
