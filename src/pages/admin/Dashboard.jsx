import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BarChart3, Bot, ClipboardList, FolderTree, PackageCheck, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAnalyticsData, listCategories, listChatbotFaqs, listLeads, listProducts, listStaff } from '../../lib/api'
import { money } from '../../lib/format'
import AdminPageHeader from '../../components/AdminPageHeader'
import { useAuth } from '../../state/AuthContext'

export default function Dashboard() {
  const { role } = useAuth()
  const catalogAccess = ['owner','admin','content'].includes(role)
  const teamAccess = ['owner','admin'].includes(role)
  const crmAccess = ['owner','admin','manager'].includes(role)
  const [data, setData] = useState({ products:[], categories:[], faqs:[], staff:[], leads:[], analytics:{events:[],quizzes:[],leads:[]} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const jobs = [
      catalogAccess ? listProducts({ includeDrafts:true }) : Promise.resolve([]),
      catalogAccess ? listCategories({ admin:true }) : Promise.resolve([]),
      catalogAccess ? listChatbotFaqs({ admin:true }) : Promise.resolve([]),
      teamAccess ? listStaff() : Promise.resolve([]),
      crmAccess ? listLeads() : Promise.resolve([]),
      crmAccess ? getAnalyticsData() : Promise.resolve({ events:[], quizzes:[], leads:[] }),
    ]
    Promise.all(jobs)
      .then(([products,categories,faqs,staff,leads,analytics]) => active && setData({ products,categories,faqs,staff,leads,analytics }))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [catalogAccess, teamAccess, crmAccess])

  const metrics = useMemo(() => {
    const items = []
    if (catalogAccess) {
      items.push(['Все товары', data.products.length, ShoppingBag, '/admin/products'])
      items.push(['Опубликовано', data.products.filter((item)=>item.status === 'published').length, PackageCheck, '/admin/products'])
      items.push(['Категории', data.categories.length, FolderTree, '/admin/categories'])
      items.push(['Ответы чат-бота', data.faqs.filter((item)=>item.is_active).length, Bot, '/admin/chatbot'])
    }
    if (teamAccess) items.push(['Сотрудники', data.staff.filter((item)=>item.is_active).length, PackageCheck, '/admin/staff'])
    if (crmAccess) {
      items.push(['Новые заявки', data.leads.filter((item)=>item.status === 'new').length, ClipboardList, '/admin/leads'])
      items.push(['Посетители', new Set(data.analytics.events.filter((item)=>item.event_type === 'page_view').map((item)=>item.visitor_id)).size, BarChart3, '/admin/analytics'])
    }
    return items
  }, [data, catalogAccess, teamAccess, crmAccess])

  return <>
    <AdminPageHeader eyebrow="Salt Ordo · Dashboard" title="Управление сайтом" text="Здесь только то, что действительно нужно для каталога, контента и команды." actions={catalogAccess ? <Link className="btn btn--primary" to="/admin/products/new">Добавить товар</Link> : null}/>
    {error && <div className="notice notice--error">{error}</div>}
    {!catalogAccess && !teamAccess && !crmAccess && <div className="notice">Для этой роли сейчас нет отдельных разделов управления.</div>}
    <div className="admin-stat-grid admin-stat-grid--compact">{metrics.map(([label,value,Icon,to]) => <Link className="admin-stat" to={to} key={label}><span className="admin-stat__icon"><Icon/></span><span><small>{label}</small><strong>{loading ? '—' : value}</strong></span><ArrowRight className="admin-stat__arrow"/></Link>)}</div>
    {catalogAccess && <div className="admin-two-col admin-two-col--catalog">
      <section className="admin-panel">
        <div className="admin-panel__head"><div><span className="eyebrow">Каталог</span><h2>Последние товары</h2></div><Link className="text-link" to="/admin/products">Открыть каталог</Link></div>
        <div className="admin-quick-list">{data.products.slice(0,7).map((product) => <Link to={`/admin/products/${product.id}`} className="admin-quick-item" key={product.id}><span className={`product-dot ${product.status === 'published' ? 'is-live' : ''}`}/><span><strong>{product.name_ru || 'Без названия'}</strong><small>{Number(product.stock_qty || 0) > 0 ? `${product.stock_qty} шт. в наличии` : 'Под заказ'} · {product.seam_ru || product.seam || 'шов не указан'}</small></span><strong>{product.price_on_request ? 'По запросу' : money(product.sale_price)}</strong></Link>)}{!loading && data.products.length === 0 && <div className="empty-cell">Каталог пуст. Добавьте первый товар.</div>}</div>
      </section>
      <section className="admin-panel chatbot-summary-card">
        <div className="admin-panel__head"><div><span className="eyebrow">Чат-бот</span><h2>Частые вопросы</h2></div><Link className="text-link" to="/admin/chatbot">Настроить</Link></div>
        <p>Добавляйте вопросы и ответы на русском, кыргызском и английском. Помощник покажет их посетителю и поможет перейти в WhatsApp, если точного ответа нет.</p>
        <div className="chatbot-summary-list">
          {data.faqs.filter((item)=>item.is_active).slice(0,4).map((item)=><span key={item.id}><Bot size={16}/>{item.question_ru}</span>)}
          {!loading && data.faqs.filter((item)=>item.is_active).length === 0 && <small>Ответов пока нет — можно добавить первый FAQ.</small>}
        </div>
      </section>
    </div>}
  </>
}
