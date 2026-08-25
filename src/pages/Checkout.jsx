import { useMemo, useState } from 'react'
import { CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../state/CartContext'
import { createLead, createOrder } from '../lib/api'
import { money } from '../lib/format'
import { useLanguage } from '../state/LanguageContext'
import { useSiteSettings } from '../state/SiteSettingsContext'
import { localizedField } from '../lib/productText'
import { whatsappUrl } from '../lib/whatsapp'
import { getTrackingIds, track } from '../lib/analytics'

export default function Checkout() {
  const { items, total, clear } = useCart()
  const { lang, t } = useLanguage()
  const { settings } = useSiteSettings()
  const [form, setForm] = useState({ customerName:'', phone:'', email:'', city:'', deliveryMethod:'manager', note:'' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [whatsappLink, setWhatsappLink] = useState('')

  const hasRequest = useMemo(() => items.some((item) => item.price_on_request || item.sale_price == null), [items])
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  const buildMessage = (orderNumber) => {
    const lines = items.map((item,index) => `${index + 1}. ${localizedField(item, 'name', lang)} — ${item.quantity}`).join('\n')
    if (lang === 'kg') return `Саламатсызбы, Salt Ordo!\n\n№${orderNumber} буюртмамды тактагым келет.\n\n${lines}\n\nАты: ${form.customerName}\nТелефон: ${form.phone}\nДарек/шаар: ${form.city || '—'}\n\nБар-жогун, акыркы баасын, даярдоо мөөнөтүн жана жеткирүүнү тактап бериңиз.`
    if (lang === 'en') return `Hello, Salt Ordo!\n\nI would like to confirm request #${orderNumber}.\n\n${lines}\n\nName: ${form.customerName}\nPhone: ${form.phone}\nCity: ${form.city || '—'}\n\nPlease confirm availability, final price, production time and delivery.`
    return `Здравствуйте, Salt Ordo!\n\nХочу уточнить заявку №${orderNumber}.\n\n${lines}\n\nИмя: ${form.customerName}\nТелефон: ${form.phone}\nГород: ${form.city || '—'}\n\nПодскажите, пожалуйста, наличие, финальную стоимость, срок изготовления и доставку.`
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!items.length) return
    const whatsappWindow = window.open('about:blank', '_blank')
    setSending(true)
    setError('')
    try {
      const order = await createOrder({ ...form, items, language: lang })
      await createLead({
        source:'checkout',
        customerName:form.customerName,
        phone:form.phone,
        email:form.email,
        message:`${form.note || ''} · Заявка ${order.order_number}`.trim(),
        ...getTrackingIds(),
      })
      const link = whatsappUrl(settings.whatsapp, buildMessage(order.order_number))
      setWhatsappLink(link)
      setResult(order)
      clear()
      track('whatsapp_click', { metadata:{ source:'checkout', orderNumber:order.order_number } })
      if (whatsappWindow) {
        whatsappWindow.opener = null
        whatsappWindow.location.replace(link)
      }
    } catch (err) {
      if (whatsappWindow) whatsappWindow.close()
      setError(err.message || t.common.error)
    } finally {
      setSending(false)
    }
  }

  if (result) return (
    <section className="section page-section">
      <div className="container narrow-container">
        <div className="success-card">
          <span className="success-card__icon"><CheckCircle2/></span>
          <span className="eyebrow">Salt Ordo</span>
          <h1>{t.checkout.successTitle}</h1>
          <p>{t.checkout.successText}</p>
          <div className="success-card__actions">
            <a className="btn btn--primary" href={whatsappLink} target="_blank" rel="noreferrer"><MessageCircle size={18}/>{t.checkout.openWhatsapp}</a>
            <Link className="btn btn--ghost" to="/catalog">{t.checkout.backCatalog}</Link>
          </div>
        </div>
      </div>
    </section>
  )

  return (
    <section className="section page-section">
      <div className="container">
        <div className="page-hero compact-page-hero"><span className="eyebrow">{t.checkout.eyebrow}</span><h1>{t.checkout.title}</h1><p>{t.checkout.text}</p></div>
        {items.length === 0 ? <div className="notice">{t.cart.emptyText}</div> : <div className="checkout-layout">
          <form className="form-card" onSubmit={submit}>
            <div className="form-grid">
              <label><span>{t.checkout.name} *</span><input name="customerName" value={form.customerName} onChange={change} required autoComplete="name"/></label>
              <label><span>{t.checkout.phone} *</span><input name="phone" value={form.phone} onChange={change} required inputMode="tel" autoComplete="tel" placeholder="+996 ..."/></label>
              <label><span>Email</span><input name="email" type="email" value={form.email} onChange={change} autoComplete="email" placeholder="name@example.com"/></label>
              <label><span>{t.checkout.city}</span><input name="city" value={form.city} onChange={change}/></label>
              <label><span>{t.checkout.delivery}</span><select name="deliveryMethod" value={form.deliveryMethod} onChange={change}><option value="manager">{t.checkout.manager}</option><option value="delivery">{t.checkout.courier}</option><option value="pickup">{t.checkout.pickup}</option></select></label>
              <label className="form-span-2"><span>{t.checkout.note}</span><textarea name="note" value={form.note} onChange={change} rows="4" placeholder={t.checkout.notePlaceholder}/></label>
            </div>
            {error && <div className="notice notice--error">{error}</div>}
            <button className="btn btn--primary btn--block" disabled={sending}>{sending ? t.checkout.sending : t.checkout.submit}</button>
            <div className="form-security"><ShieldCheck size={17}/><span>{t.checkout.text}</span></div>
          </form>

          <aside className="checkout-summary">
            <span className="eyebrow">{t.cart.title}</span>
            {items.map((item) => <div className="checkout-summary__item" key={item.id}><span>{localizedField(item,'name',lang)}<small>× {item.quantity}</small></span><strong>{item.price_on_request ? t.catalog.requestPrice : money(Number(item.sale_price||0)*item.quantity, t.common.som)}</strong></div>)}
            <div className="summary-line summary-line--total"><span>{t.cart.total}</span><strong>{money(total, t.common.som)}</strong></div>
            {hasRequest && <p className="summary-note">{t.cart.requestPriceNote}</p>}
          </aside>
        </div>}
      </div>
    </section>
  )
}
