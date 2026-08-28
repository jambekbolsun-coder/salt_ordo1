import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Instagram, MapPin, Phone, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'

const content = {
  ru: [
    { eyebrow:'Ручная работа в Бишкеке', title:'Комфорт, созданный вручную', text:'Төшөк, подушки и целые комплекты — в вашей палитре, размере и стиле.', cta:'Смотреть каталог' },
    { eyebrow:'Наш шоурум', title:'Бишкек, Мукаша Абдраева 198/1', text:'Приезжайте посмотреть ткани, оттенки и готовые работы вживую.', cta:'Открыть контакты' },
    { eyebrow:'Всегда на связи', title:'+996 998 992 996', text:'Instagram @salt_ordo · консультация и заказ через WhatsApp.', cta:'Написать нам' },
  ],
  kg: [
    { eyebrow:'Бишкекте кол менен жасалат', title:'Кол менен жасалган ыңгайлуулук', text:'Төшөк, жаздык жана толук комплекттер — сиздин түсүңүздө, өлчөмүңүздө жана стилиңизде.', cta:'Каталогду көрүү' },
    { eyebrow:'Биздин шоурум', title:'Бишкек, Мукаша Абдраева 198/1', text:'Кездемелерди, түстөрдү жана даяр иштерди көрүү үчүн келиңиз.', cta:'Байланышты ачуу' },
    { eyebrow:'Ар дайым байланыштабыз', title:'+996 998 992 996', text:'Instagram @salt_ordo · кеңеш жана WhatsApp аркылуу буйрутма.', cta:'Бизге жазуу' },
  ],
  en: [
    { eyebrow:'Handmade in Bishkek', title:'Comfort, crafted by hand', text:'Floor bedding, pillows and complete sets in your palette, size and style.', cta:'Browse catalog' },
    { eyebrow:'Our showroom', title:'Bishkek, Mukasha Abdrayeva 198/1', text:'Visit us to see fabrics, colors and finished work in person.', cta:'Open contacts' },
    { eyebrow:'Always in touch', title:'+996 998 992 996', text:'Instagram @salt_ordo · consultation and orders via WhatsApp.', cta:'Contact us' },
  ],
}

const media = [
  ['/hero-sep.webp', Sparkles],
  ['/hero-toshok.webp', MapPin],
  ['/hero-sandyk.webp', Phone],
]

export default function HeroSlider() {
  const { lang } = useLanguage()
  const { settings } = useSiteSettings()
  const [active, setActive] = useState(0)
  const dragStart = useRef(null)
  const slides = content[lang] || content.ru

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 4000)
    return () => window.clearInterval(timer)
  }, [slides.length])

  const change = (direction) => setActive((value) => (value + direction + slides.length) % slides.length)
  const pointerDown = (event) => {
    if (event.target.closest('button, a')) return
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
      <div className="hero-slider__viewport" onPointerDown={pointerDown} onPointerUp={pointerUp}>
        {slides.map((slide, index) => {
          const [image, Icon] = media[index]
          const action = index === 0 ? { to:'/catalog' } : index === 1 ? { href:'#contacts' } : { href:settings.instagram, external:true }
          return (
            <article className={`hero-slide ${active === index ? 'is-active' : ''}`} key={slide.title} aria-hidden={active !== index}>
              <img src={image} alt="" fetchPriority={index === 0 ? 'high' : 'auto'}/>
              <div className="hero-slide__veil" aria-hidden="true"/>
              <div className="container hero-slide__content">
                <span className="hero-slide__eyebrow"><Icon aria-hidden="true"/>{slide.eyebrow}</span>
                <h1>{slide.title}</h1>
                <p>{slide.text}</p>
                {action.to
                  ? <Link className="btn btn--primary" to={action.to}>{slide.cta}<ArrowRight aria-hidden="true"/></Link>
                  : <a className="btn btn--primary" href={action.href} target={action.external ? '_blank' : undefined} rel={action.external ? 'noreferrer' : undefined}>{index === 2 && <Instagram aria-hidden="true"/>}{slide.cta}<ArrowRight aria-hidden="true"/></a>}
              </div>
            </article>
          )
        })}
        <button className="hero-slider__arrow is-prev" type="button" onClick={() => change(-1)} aria-label="Previous slide"><ChevronLeft aria-hidden="true"/></button>
        <button className="hero-slider__arrow is-next" type="button" onClick={() => change(1)} aria-label="Next slide"><ChevronRight aria-hidden="true"/></button>
        <div className="hero-slider__dots">
          {slides.map((slide, index) => <button key={slide.title} type="button" className={active === index ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`Slide ${index + 1}`}/>) }
        </div>
      </div>
    </section>
  )
}
