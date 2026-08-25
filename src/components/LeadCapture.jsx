import { useState } from 'react'
import { CheckCircle2, Mail, MessageCircle, Phone, UserRound, X } from 'lucide-react'
import { createLead } from '../lib/api'
import { getTrackingIds, track } from '../lib/analytics'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { whatsappUrl } from '../lib/whatsapp'

const labels = {
  ru: { title:'Оставьте контакты', text:'Мы сохраним заявку и откроем WhatsApp с готовым сообщением.', name:'Ваше имя', phone:'Номер телефона', email:'Email — необязательно', note:'Комментарий — необязательно', submit:'Продолжить в WhatsApp', sending:'Сохраняем…', success:'Заявка сохранена', error:'Не удалось сохранить заявку.' },
  kg: { title:'Байланышыңызды калтырыңыз', text:'Арызды сактап, даяр билдирүү менен WhatsApp ачабыз.', name:'Атыңыз', phone:'Телефон номери', email:'Email — милдеттүү эмес', note:'Комментарий — милдеттүү эмес', submit:'WhatsApp аркылуу улантуу', sending:'Сакталууда…', success:'Арыз сакталды', error:'Арызды сактоо мүмкүн болгон жок.' },
  en: { title:'Leave your contact details', text:'We will save the request and open WhatsApp with a prepared message.', name:'Your name', phone:'Phone number', email:'Email — optional', note:'Comment — optional', submit:'Continue in WhatsApp', sending:'Saving…', success:'Request saved', error:'Could not save the request.' },
}

export default function LeadCapture({
  source = 'contact', product = null, message = '', onClose = null, compact = false,
}) {
  const { lang } = useLanguage()
  const { settings } = useSiteSettings()
  const text = labels[lang] || labels.ru
  const [form, setForm] = useState({ name:'', phone:'', email:'', note:'' })
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const change = (key) => (event) => setForm((state) => ({ ...state, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const tracking = getTrackingIds()
      await createLead({
        source,
        customerName: form.name,
        phone: form.phone,
        email: form.email,
        message: form.note || message,
        productId: product?.id || null,
        ...tracking,
      })
      setStatus('success')
      track('whatsapp_click', { productId: product?.id || null, metadata: { source } })
      window.open(whatsappUrl(settings.whatsapp, message || form.note), '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err.message || text.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`lead-capture ${compact ? 'is-compact' : ''}`}>
      {onClose && <button className="lead-capture__close icon-btn" type="button" onClick={onClose} aria-label="Close"><X/></button>}
      <div className="lead-capture__heading">
        <span>{status === 'success' ? <CheckCircle2/> : <MessageCircle/>}</span>
        <div><h3>{status === 'success' ? text.success : text.title}</h3><p>{text.text}</p></div>
      </div>
      <form onSubmit={submit}>
        <label><UserRound/><input required minLength={2} maxLength={100} value={form.name} onChange={change('name')} placeholder={text.name}/></label>
        <label><Phone/><input required inputMode="tel" minLength={9} maxLength={20} value={form.phone} onChange={change('phone')} placeholder={text.phone}/></label>
        <label><Mail/><input type="email" maxLength={160} value={form.email} onChange={change('email')} placeholder={text.email}/></label>
        {!compact && <textarea maxLength={1000} value={form.note} onChange={change('note')} placeholder={text.note}/>}
        {error && <div className="notice notice--error">{error}</div>}
        <button className="btn btn--primary btn--block" type="submit" disabled={busy}>{busy ? text.sending : text.submit}<MessageCircle/></button>
      </form>
    </section>
  )
}
