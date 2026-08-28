import { Instagram, MapPin, MessageCircle, Navigation, Phone, Scissors, Sparkles } from 'lucide-react'
import LeadCapture from '../components/LeadCapture'
import { whatsappUrl } from '../lib/whatsapp'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'

const copy = {
  ru: {
    eyebrow:'Контакты Salt Ordo',
    title:'Обсудим ваш комплект лично',
    text:'Покажите референс, расскажите о традиции, цветах и размерах — мы предложим состав комплекта и заранее согласуем сроки.',
    profile:'Мастерская домашнего текстиля',
    handmade:'Ручная работа',
    complexity:'Любая сложность',
    order:'По записи',
    write:'Написать',
    call:'Позвонить',
    channels:'Выберите удобный способ связи',
    channelText:'Отвечаем на вопросы о тканях, комплектации, сроках, доставке и индивидуальном пошиве.',
    addressTitle:'Шоурум в Бишкеке',
    address:'ул. Мукаша Абдраева, 198/1',
    addressText:'Перед приездом напишите нам — подготовим нужные ткани и примеры работ к вашему визиту.',
    route:'Открыть маршрут',
    formTitle:'Опишите будущий заказ',
    formText:'Оставьте контакты — заявка сохранится в системе, а продолжить обсуждение можно будет в WhatsApp.',
    instagram:'Работы и новинки',
    whatsapp:'Быстрый ответ',
    phone:'Прямой звонок',
  },
  kg: {
    eyebrow:'Salt Ordo байланыштары',
    title:'Комплектиңизди чогуу талкуулайлы',
    text:'Референсти көрсөтүп, салт, түс жана өлчөм тууралуу айтыңыз — комплекттин курамын сунуштап, мөөнөтүн алдын ала макулдашабыз.',
    profile:'Үй текстилинин устаканасы',
    handmade:'Кол менен жасалат',
    complexity:'Каалаган татаалдык',
    order:'Алдын ала жазылуу',
    write:'Жазуу',
    call:'Чалуу',
    channels:'Ыңгайлуу байланыш жолун тандаңыз',
    channelText:'Кездеме, комплект, мөөнөт, жеткирүү жана жеке тигүү боюнча жооп беребиз.',
    addressTitle:'Бишкектеги шоурум',
    address:'Мукаша Абдраев көч., 198/1',
    addressText:'Келерден мурун жазыңыз — керектүү кездемелерди жана иш үлгүлөрүн даярдайбыз.',
    route:'Маршрутту ачуу',
    formTitle:'Буйрутмаңызды сүрөттөп бериңиз',
    formText:'Байланышыңызды калтырыңыз — арыз системада сакталат, андан кийин WhatsApp аркылуу улантасыз.',
    instagram:'Иштер жана жаңылыктар',
    whatsapp:'Тез жооп',
    phone:'Түз чалуу',
  },
  en: {
    eyebrow:'Contact Salt Ordo',
    title:'Let’s shape your set together',
    text:'Share a reference and tell us about the occasion, colors and dimensions. We will propose the set composition and confirm timing in advance.',
    profile:'Home textile atelier',
    handmade:'Made by hand',
    complexity:'Any complexity',
    order:'By appointment',
    write:'Message us',
    call:'Call',
    channels:'Choose the easiest way to reach us',
    channelText:'Ask about fabrics, set composition, production timing, delivery and custom tailoring.',
    addressTitle:'Bishkek showroom',
    address:'198/1 Mukasha Abdrayeva St.',
    addressText:'Message before visiting so we can prepare the right fabrics and work samples for you.',
    route:'Open directions',
    formTitle:'Tell us about your order',
    formText:'Leave your details. The request will be saved and the conversation can continue in WhatsApp.',
    instagram:'Work and new pieces',
    whatsapp:'Fast response',
    phone:'Direct call',
  },
}

const mapUrl = 'https://www.google.com/maps/search/?api=1&query=%D0%91%D0%B8%D1%88%D0%BA%D0%B5%D0%BA%2C%20%D0%9C%D1%83%D0%BA%D0%B0%D1%88%D0%B0%20%D0%90%D0%B1%D0%B4%D1%80%D0%B0%D0%B5%D0%B2%D0%B0%20198%2F1'

export default function Contacts() {
  const { lang, t } = useLanguage()
  const { settings } = useSiteSettings()
  const text = copy[lang] || copy.ru
  const phoneHref = `tel:+${String(settings.whatsapp).replace(/\D/g,'')}`
  const whatsapp = whatsappUrl(settings.whatsapp, t.common.whatsappText)

  return (
    <section className="contacts-page page-section">
      <div className="container contacts-page__container">
        <div className="contacts-intro">
          <div className="contacts-intro__copy">
            <span className="eyebrow"><Sparkles/>{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.text}</p>
            <div className="contacts-intro__actions">
              <a className="btn btn--primary" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle/>{text.write}</a>
              <a className="btn btn--ghost" href={phoneHref}><Phone/>{text.call}</a>
            </div>
          </div>

          <article className="contact-profile-card">
            <div className="contact-profile-card__visual">
              <img src="/hero-blush-handmade.webp" alt="Salt Ordo handmade textile set"/>
              <span><Scissors/> Salt Ordo</span>
            </div>
            <div className="contact-profile-card__body">
              <div><strong>SALT ORDO</strong><span>{text.profile}</span></div>
              <div className="contact-profile-card__facts">
                <span><b>{text.handmade}</b><small>Salt Ordo</small></span>
                <span><b>{text.complexity}</b><small>Custom</small></span>
                <span><b>{text.order}</b><small>Bishkek</small></span>
              </div>
            </div>
          </article>
        </div>

        <section className="contact-channels" aria-labelledby="contact-channels-title">
          <div className="contact-section-heading">
            <span>01</span>
            <div><h2 id="contact-channels-title">{text.channels}</h2><p>{text.channelText}</p></div>
          </div>
          <div className="contact-channel-grid">
            <a href={whatsapp} target="_blank" rel="noreferrer"><i><MessageCircle/></i><span><strong>WhatsApp</strong><small>{text.whatsapp}</small></span><b>↗</b></a>
            <a href={phoneHref}><i><Phone/></i><span><strong>{settings.whatsapp}</strong><small>{text.phone}</small></span><b>↗</b></a>
            <a href={settings.instagram} target="_blank" rel="noreferrer"><i><Instagram/></i><span><strong>@salt_ordo</strong><small>{text.instagram}</small></span><b>↗</b></a>
          </div>
        </section>

        <section className="contact-visit">
          <div className="contact-visit__map" aria-hidden="true">
            <div className="contact-visit__grid"/>
            <span className="contact-visit__pin"><MapPin/></span>
            <span className="contact-visit__label">SALT ORDO</span>
          </div>
          <div className="contact-visit__copy">
            <span className="eyebrow">02 · {text.addressTitle}</span>
            <h2>{text.address}</h2>
            <p>{text.addressText}</p>
            <a className="btn btn--ghost" href={mapUrl} target="_blank" rel="noreferrer"><Navigation/>{text.route}</a>
          </div>
        </section>

        <section className="contact-form-section">
          <div className="contact-section-heading">
            <span>03</span>
            <div><h2>{text.formTitle}</h2><p>{text.formText}</p></div>
          </div>
          <LeadCapture source="contact_page" message={t.common.whatsappText}/>
        </section>
      </div>
    </section>
  )
}
