import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Search, UserRound } from 'lucide-react'
import { listCustomers } from '../../lib/api'
import { dateTime } from '../../lib/format'
import AdminPageHeader from '../../components/AdminPageHeader'

export default function Customers() {
  const [items,setItems] = useState([])
  const [q,setQ] = useState('')
  const [error,setError] = useState('')
  useEffect(() => { listCustomers().then(setItems).catch((err)=>setError(err.message)) }, [])
  const filtered = useMemo(() => items.filter((customer)=>!q || `${customer.name || ''} ${customer.phone || ''} ${customer.city || ''}`.toLowerCase().includes(q.toLowerCase())), [items,q])

  return <>
    <AdminPageHeader eyebrow="База клиентов" title="Клиенты" text="Контакты появляются автоматически из заявок. Регистрация покупателей не требуется."/>
    <div className="admin-toolbar"><label className="search-field"><Search/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Имя, телефон, город…"/></label></div>
    {error && <div className="notice notice--error">{error}</div>}
    <div className="customer-card-grid">
      {filtered.map((customer) => <article className="customer-card" key={customer.id}><span className="customer-card__avatar"><UserRound/></span><div><h3>{customer.name || 'Клиент Salt Ordo'}</h3><p>{customer.phone || 'Телефон не указан'}</p><small>{customer.city || 'Город не указан'} · заявок: {customer.orders_count || 1} · последний заказ: {dateTime(customer.last_order_at || customer.created_at)}</small></div>{customer.phone && <a className="icon-btn" href={`https://wa.me/${String(customer.phone).replace(/\D/g,'')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle/></a>}</article>)}
      {filtered.length === 0 && <div className="admin-panel empty-cell">Клиентов пока нет.</div>}
    </div>
  </>
}
