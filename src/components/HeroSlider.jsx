import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Box, ChevronLeft, ChevronRight, MapPin, Palette, Phone, Scissors, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'

const content = {
  ru: [
    { eyebrow:'Ручная работа в Бишкеке', title:'Комфорт, созданный вручную', text:'Төшөк, подушки и целые комплекты — в вашей палитре, размере и стиле.', cta:'Смотреть каталог' },
    { eyebrow:'Наш шоурум', title:'Бишкек, Мукаша Абдраева 198/1', text:'Приезжайте посмотреть ткани, оттенки и готовые работы вживую.', cta:'Открыть контакты' },
    { eyebrow:'Всегда на связи', title:'+996 998 992 996', text:'Instagram @salt_ordo · консультация и заказ через WhatsApp.', cta:'Написать в WhatsApp' },
    { eyebrow:'Кызга сеп', title:'Сеп в одной гармоничной палитре', text:'Соберём төшөк, одеяла, подушки и декор как единый продуманный комплект.', cta:'Выбрать сеп' },
    { eyebrow:'Глубокий цвет', title:'Традиционный орнамент, современная подача', text:'Подберём ткань, вышивку и наполнение под ваш интерьер и бюджет.', cta:'Смотреть жер төшөк' },
    { eyebrow:'Семейная вещь', title:'Сандык, который хранит историю', text:'Размер, резьба, отделка и текстиль согласовываются до начала ручной работы.', cta:'Смотреть сандыки' },
    { eyebrow:'Индивидуальный пошив', title:'Любая идея — в точном исполнении', text:'Пришлите фото или эскиз: адаптируем стиль, размеры и детали под ваш заказ.', cta:'Обсудить заказ' },
  ],
  kg: [
    { eyebrow:'Бишкекте кол менен жасалат', title:'Кол менен жасалган ыңгайлуулук', text:'Төшөк, жаздык жана толук комплекттер — сиздин түсүңүздө, өлчөмүңүздө жана стилиңизде.', cta:'Каталогду көрүү' },
    { eyebrow:'Биздин шоурум', title:'Бишкек, Мукаша Абдраева 198/1', text:'Кездемелерди, түстөрдү жана даяр иштерди көрүү үчүн келиңиз.', cta:'Байланышты ачуу' },
    { eyebrow:'Ар дайым байланыштабыз', title:'+996 998 992 996', text:'Instagram @salt_ordo · кеңеш жана WhatsApp аркылуу буйрутма.', cta:'WhatsApp аркылуу жазуу' },
    { eyebrow:'Кызга сеп', title:'Бир палитрадагы гармониялуу сеп', text:'Төшөк, жууркан, жаздык жана декорду бир бүтүн комплект кылып чогултабыз.', cta:'Сеп тандоо' },
    { eyebrow:'Терең түс', title:'Салттуу оймо, заманбап көрүнүш', text:'Кездемени, сайманы жана толтурууну интерьериңизге ылайык тандайбыз.', cta:'Жер төшөктү көрүү' },
    { eyebrow:'Үй-бүлөлүк буюм', title:'Тарых сактаган сандык', text:'Өлчөмү, оюусу, жасалгасы жана текстили иш башталганга чейин макулдашылат.', cta:'Сандыктарды көрүү' },
    { eyebrow:'Жеке тигүү', title:'Ар бир идеяны так ишке ашырабыз', text:'Сүрөт же эскиз жөнөтүңүз — стилин, өлчөмүн жана деталдарын ылайыкташтырабыз.', cta:'Буйрутманы талкуулоо' },
  ],
  en: [
    { eyebrow:'Handmade in Bishkek', title:'Comfort, crafted by hand', text:'Floor bedding, pillows and complete sets in your palette, size and style.', cta:'Browse catalog' },
    { eyebrow:'Our showroom', title:'Bishkek, Mukasha Abdrayeva 198/1', text:'Visit us to see fabrics, colors and finished work in person.', cta:'Open contacts' },
    { eyebrow:'Always in touch', title:'+996 998 992 996', text:'Instagram @salt_ordo · consultation and orders via WhatsApp.', cta:'Message on WhatsApp' },
    { eyebrow:'Bridal dowry', title:'One harmonious palette for the whole set', text:'Floor bedding, quilts, pillows and details are composed as one considered collection.', cta:'Choose a dowry set' },
    { eyebrow:'Rich color', title:'Traditional ornament, modern expression', text:'Fabric, embroidery and filling are selected around your interior and budget.', cta:'Browse floor bedding' },
    { eyebrow:'An heirloom piece', title:'A chest made to hold a story', text:'Dimensions, carving, finish and textiles are agreed before handcrafting begins.', cta:'Browse chests' },
    { eyebrow:'Custom tailoring', title:'Any idea, made with precision', text:'Send a photo or sketch and we will adapt the style, size and details for you.', cta:'Discuss an order' },
  ],
}

const media = [
  ['/hero-sep.webp', Sparkles],
  ['/hero-toshok.webp', MapPin],
  ['/hero-sandyk.webp', Phone],
  ['/hero-blush-handmade.webp', Sparkles],
  ['/hero-blue-heritage.webp', Palette],
  ['/hero-chest-heirloom.webp', Box],
  ['/hero-sage-modern.webp', Scissors],
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

  const actions = [
    { to:'/catalog' },
    { to:'/contacts' },
    { href:whatsappUrl(settings.whatsapp, slides[2].text), external:true },
    { to:'/catalog?category=sep' },
    { to:'/catalog?category=jer-toshok' },
    { to:'/catalog?category=sandyk' },
    { to:'/contacts' },
  ]

  return (
    <section className="hero-slider" aria-roledescription="carousel" aria-label="Salt Ordo">
      <div className="hero-slider__viewport" onPointerDown={pointerDown} onPointerUp={pointerUp}>
        {slides.map((slide, index) => {
          const [image, Icon] = media[index]
          const action = actions[index]
          return (
            <article className={`hero-slide ${active === index ? 'is-active' : ''}`} key={slide.title} aria-hidden={active !== index}>
              <img src={image} alt="" fetchpriority={index === 0 ? 'high' : 'auto'} decoding="async"/>
              <div className="hero-slide__veil" aria-hidden="true"/>
              <div className="container hero-slide__content">
                <span className="hero-slide__eyebrow"><Icon aria-hidden="true"/>{slide.eyebrow}</span>
                <h1>{slide.title}</h1>
                <p>{slide.text}</p>
                {action.to
                  ? <Link className="btn btn--primary" to={action.to}>{slide.cta}<ArrowRight aria-hidden="true"/></Link>
                  : <a className="btn btn--primary" href={action.href} target={action.external ? '_blank' : undefined} rel={action.external ? 'noreferrer' : undefined}>{slide.cta}<ArrowRight aria-hidden="true"/></a>}
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
