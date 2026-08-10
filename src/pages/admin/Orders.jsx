import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Search } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'
import { listOrders, updateOrderStatus } from '../../lib/api'
import { dateTime, money } from '../../lib/format'
import StatusPill from '../../components/StatusPill'

const statuses = [
  ['new','Новый'],['contacted','Связались'],['confirmed','Подтверждён'],['production','На изготовлении'],
  ['ready','Готов'],['delivery','Передан в доставку'],['delivered','Доставлен'],['cancelled','Отменён']
]

export default function Orders() {
  const [items,setItems] = useState([])
  const [q,setQ] = useState('')
  const [status,setStatusFilter] = useState('all')
  const [error,setError] = useState('')
  const load = () => listOrders().then(setItems).catch((err)=>setError(err.message))
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter((order) => {
    const hit = !q || `${order.order_number || ''} ${order.customer_name || ''} ${order.phone || ''} ${order.city || ''}`.toLowerCase().includes(q.toLowerCase())
    return hit && (status === 'all' || order.status === status)
  }), [items,q,status])

  const changeStatus = async (id,value) => {
    setItems((current)=>current.map((item)=>item.id===id?{...item,status:value}:item))
    try { await updateOrderStatus(id,value) } catch (err) { setError(err.message); await load() }
  }

  return <>
    <AdminPageHeader eyebrow="Продажи" title="Заказы и заявки" text="Каждая заявка с сайта сохраняется здесь до перехода клиента в WhatsApp."/>
    <div className="admin-toolbar">
      <label className="search-field"><Search/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Номер заказа, имя, телефон, город…"/></label>
      <select value={status} onChange={(e)=>setStatusFilter(e.target.value)}><option value="all">Все статусы</option>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
    </div>
    {error && <div className="notice notice--error">{error}</div>}
    <section className="admin-panel admin-panel--flush"><div className="admin-table-wrap"><table className="admin-table order-admin-table">
      <thead><tr><th>Заказ</th><th>Клиент</th><th>Город</th><th>Товары</th><th>Сумма</th><th>Статус</th><th>Связь</th></tr></thead>
      <tbody>{filtered.map((order) => <tr key={order.id}>
        <td data-label="Заказ"><strong>{order.order_number}</strong><small>{dateTime(order.created_at)}</small></td>
        <td data-label="Клиент"><strong>{order.customer_name || 'Клиент'}</strong><small>{order.phone}</small></td>
        <td data-label="Город">{order.city || '—'}</td>
        <td data-label="Товары"><span className="order-items-mini">{(order.order_items || []).slice(0,3).map((item)=><small key={item.id}>{item.product_name} × {item.quantity}</small>)}{(order.order_items || []).length > 3 && <small>+ ещё {(order.order_items || []).length - 3}</small>}</span></td>
        <td data-label="Сумма"><strong>{money(order.total_amount)}</strong>{order.has_request_price && <small>есть цена по запросу</small>}</td>
        <td data-label="Статус"><select className="status-select" value={order.status} onChange={(e)=>changeStatus(order.id,e.target.value)}>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><StatusPill status={order.status}/></td>
        <td data-label="Связь"><a className="icon-btn" target="_blank" rel="noreferrer" href={`https://wa.me/${String(order.phone || '').replace(/\D/g,'')}?text=${encodeURIComponent(`Здравствуйте! По вашей заявке ${order.order_number} в Salt Ordo.`)}`} aria-label="WhatsApp"><MessageCircle/></a></td>
      </tr>)}{filtered.length === 0 && <tr><td colSpan="7" className="empty-cell">Заказов пока нет.</td></tr>}</tbody>
    </table></div></section>
  </>
}
