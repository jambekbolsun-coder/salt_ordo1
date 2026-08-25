import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Mail, MessageCircle, Phone, Search, UserRound } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'
import { listLeads, updateLead } from '../../lib/api'
import { useSiteSettings } from '../../state/SiteSettingsContext'
import { whatsappUrl } from '../../lib/whatsapp'

const statuses = [
  ['new','Новая'],['in_progress','В работе'],['contacted','Связались'],['won','Успешная'],['lost','Закрыта'],
]

export default function Leads() {
  const { settings } = useSiteSettings()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    listLeads().then(setLeads).catch((err)=>setError(err.message)).finally(()=>setLoading(false))
  }, [])

  const filtered = useMemo(() => leads.filter((lead) => {
    if (status && lead.status !== status) return false
    const haystack = [lead.customer_name,lead.phone,lead.email,lead.product_name,lead.message].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  }), [leads, query, status])

  const changeStatus = async (lead, nextStatus) => {
    const previous = lead.status
    setLeads((rows)=>rows.map((row)=>row.id === lead.id ? { ...row, status:nextStatus } : row))
    try { await updateLead(lead.id, { status:nextStatus }) }
    catch (err) {
      setLeads((rows)=>rows.map((row)=>row.id === lead.id ? { ...row, status:previous } : row))
      setError(err.message)
    }
  }

  return <>
    <AdminPageHeader eyebrow="CRM · Заявки" title="Заявки клиентов" text="Контакты из карточек товаров, формы связи и WhatsApp собраны в одном месте."/>
    <div className="admin-toolbar">
      <label className="search-field"><Search/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Имя, телефон, товар…"/></label>
      <select value={status} onChange={(event)=>setStatus(event.target.value)}><option value="">Все статусы</option>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
    </div>
    {error && <div className="notice notice--error">{error}</div>}
    <section className="admin-panel">
      <div className="admin-panel__head"><div><span className="eyebrow">Входящие</span><h2>{loading ? 'Загружаем…' : `${filtered.length} заявок`}</h2></div></div>
      <div className="lead-list">
        {filtered.map((lead)=>(
          <article className="lead-row" key={lead.id}>
            <span className="lead-row__avatar"><UserRound/></span>
            <div className="lead-row__main">
              <strong>{lead.customer_name}</strong>
              <small>{new Date(lead.created_at).toLocaleString('ru-RU')} · {lead.source}</small>
              {lead.product_name && <a href={lead.products?.slug ? `/product/${lead.products.slug}` : undefined} target="_blank" rel="noreferrer">{lead.product_name}<ExternalLink/></a>}
              {lead.message && <p>{lead.message}</p>}
            </div>
            <div className="lead-row__contacts">
              <a href={`tel:${lead.phone}`}><Phone/>{lead.phone}</a>
              {lead.email && <a href={`mailto:${lead.email}`}><Mail/>{lead.email}</a>}
              <a className="lead-whatsapp" href={whatsappUrl(settings.whatsapp, `Здравствуйте, ${lead.customer_name}! Пишем по вашей заявке в Salt Ordo.`)} target="_blank" rel="noreferrer"><MessageCircle/>WhatsApp</a>
            </div>
            <select className={`lead-status is-${lead.status}`} value={lead.status} onChange={(event)=>changeStatus(lead,event.target.value)}>
              {statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </article>
        ))}
        {!loading && filtered.length === 0 && <div className="empty-cell">Заявок по выбранным условиям нет.</div>}
      </div>
    </section>
  </>
}
