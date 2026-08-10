import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Banknote, Boxes, ClipboardList, PackageCheck, ShoppingBag, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listCustomers, listOrders, listProducts, listStaff } from '../../lib/api'
import { dateTime, money } from '../../lib/format'
import AdminPageHeader from '../../components/AdminPageHeader'
import StatusPill from '../../components/StatusPill'
import { useAuth } from '../../state/AuthContext'

export default function Dashboard() {
  const { role } = useAuth()
  const catalogAccess = ['owner','admin','content'].includes(role)
  const salesAccess = ['owner','admin','manager'].includes(role)
  const teamAccess = ['owner','admin'].includes(role)
  const [data, setData] = useState({ products:[], orders:[], customers:[], staff:[] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const jobs = [
      catalogAccess ? listProducts({ includeDrafts:true }) : Promise.resolve([]),
      salesAccess ? listOrders() : Promise.resolve([]),
      salesAccess ? listCustomers() : Promise.resolve([]),
      teamAccess ? listStaff() : Promise.resolve([]),
    ]
    Promise.all(jobs)
      .then(([products,orders,customers,staff]) => active && setData({ products,orders,customers,staff }))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [catalogAccess, salesAccess, teamAccess])

  const metrics = useMemo(() => {
    const items = []
    if (catalogAccess) items.push(['Товары', data.products.length, ShoppingBag, '/admin/products'])
    if (salesAccess) {
      items.push(['Новые заказы', data.orders.filter((order)=>order.status === 'new').length, ClipboardList, '/admin/orders'])
      items.push(['На изготовлении', data.orders.filter((order)=>order.status === 'production').length, Boxes, '/admin/orders'])
      items.push(['Клиенты', data.customers.length, Users, '/admin/customers'])
      const knownRevenue = data.orders.reduce((sum,order) => sum + Number(order.total_amount || 0), 0)
      items.push(['Сумма заявок', money(knownRevenue), Banknote, '/admin/orders'])
    }
    if (teamAccess) items.push(['Сотрудники', data.staff.filter((item)=>item.is_active).length, PackageCheck, '/admin/staff'])
    return items
  }, [data, catalogAccess, salesAccess, teamAccess])

  return <>
    <AdminPageHeader eyebrow="Salt Ordo · Dashboard" title="Обзор бизнеса" text="Здесь отображаются только разделы, доступные вашей роли." actions={catalogAccess ? <Link className="btn btn--primary" to="/admin/products/new">Добавить товар</Link> : null}/>
    {error && <div className="notice notice--error">{error}</div>}
    <div className="admin-stat-grid">{metrics.map(([label,value,Icon,to]) => <Link className="admin-stat" to={to} key={label}><span className="admin-stat__icon"><Icon/></span><span><small>{label}</small><strong>{loading ? '—' : value}</strong></span><ArrowRight className="admin-stat__arrow"/></Link>)}</div>
    <div className={`admin-two-col ${!catalogAccess || !salesAccess ? 'admin-two-col--single' : ''}`}>
      {salesAccess && <section className="admin-panel">
        <div className="admin-panel__head"><div><span className="eyebrow">Заказы</span><h2>Последние заявки</h2></div><Link className="text-link" to="/admin/orders">Все заказы</Link></div>
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Заказ</th><th>Клиент</th><th>Статус</th><th>Сумма</th><th>Дата</th></tr></thead>
          <tbody>{data.orders.slice(0,7).map((order) => <tr key={order.id}><td data-label="Заказ"><strong>{order.order_number}</strong></td><td data-label="Клиент"><span>{order.customer_name || 'Клиент'}</span><small>{order.phone}</small></td><td data-label="Статус"><StatusPill status={order.status}/></td><td data-label="Сумма"><strong>{money(order.total_amount)}</strong></td><td data-label="Дата">{dateTime(order.created_at)}</td></tr>)}{!loading && data.orders.length === 0 && <tr><td colSpan="5" className="empty-cell">Заказов пока нет.</td></tr>}</tbody>
        </table></div>
      </section>}
      {catalogAccess && <section className="admin-panel">
        <div className="admin-panel__head"><div><span className="eyebrow">Каталог</span><h2>Контроль товаров</h2></div><Link className="text-link" to="/admin/products">Открыть</Link></div>
        <div className="admin-quick-list">{data.products.slice(0,6).map((product) => <Link to={`/admin/products/${product.id}`} className="admin-quick-item" key={product.id}><span className={`product-dot ${product.status === 'published' ? 'is-live' : ''}`}/><span><strong>{product.name_ru || 'Без названия'}</strong><small>{Number(product.stock_qty || 0) > 0 ? `${product.stock_qty} шт. в наличии` : 'Под заказ'} · {product.seam || 'шов не указан'}</small></span><strong>{product.price_on_request ? 'По запросу' : money(product.sale_price)}</strong></Link>)}{!loading && data.products.length === 0 && <div className="empty-cell">Каталог пуст. Добавьте первый товар.</div>}</div>
      </section>}
    </div>
  </>
}
