import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, Eye, HelpCircle, MessageCircle, MousePointerClick, Send, Share2, UsersRound, XCircle } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'
import { getAnalyticsData } from '../../lib/api'

const dayKey = (date) => new Date(date).toISOString().slice(0,10)

export default function Analytics() {
  const [data, setData] = useState({ events:[], quizzes:[], leads:[] })
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAnalyticsData().then(setData).catch((err)=>setError(err.message)).finally(()=>setLoading(false))
  }, [])

  const report = useMemo(() => {
    const since = Date.now() - days * 86400000
    const events = data.events.filter((row)=>{
      const isRecent = new Date(row.created_at).getTime() >= since
      const isVerificationEvent = row.metadata?.qa === true || row.metadata?.channel === 'qa'
      return isRecent && !isVerificationEvent
    })
    const quizzes = data.quizzes.filter((row)=>new Date(row.created_at).getTime() >= since)
    const leads = data.leads.filter((row)=>new Date(row.created_at).getTime() >= since)
    const pageViews = events.filter((row)=>row.event_type === 'page_view')
    const visitors = new Set(pageViews.map((row)=>row.visitor_id)).size
    const productViews = events.filter((row)=>row.event_type === 'product_view')
    const productShares = events.filter((row)=>row.event_type === 'product_share')
    const sharingVisitors = new Set(productShares.map((row)=>row.visitor_id)).size
    const whatsapp = events.filter((row)=>row.event_type === 'whatsapp_click').length
    const completed = quizzes.filter((row)=>row.completed_at).length
    const dismissed = quizzes.filter((row)=>row.dismissed_at && !row.completed_at).length
    const categories = {}
    const products = {}
    const sharedProducts = {}
    events.filter((row)=>row.event_type === 'category_view' || row.event_type === 'product_view').forEach((row)=>{
      if (row.category_slug) categories[row.category_slug] = (categories[row.category_slug] || 0) + 1
      if (row.event_type === 'product_view' && row.product_id) {
        const label = row.products?.name_ru || row.product_id.slice(0,8)
        products[label] = (products[label] || 0) + 1
      }
    })
    productShares.forEach((row) => {
      if (!row.product_id) return
      const label = row.products?.name_ru || row.product_id.slice(0,8)
      sharedProducts[label] = (sharedProducts[label] || 0) + 1
    })
    const daily = {}
    for (let i=days-1;i>=0;i--) {
      const key = new Date(Date.now()-i*86400000).toISOString().slice(0,10)
      daily[key] = 0
    }
    pageViews.forEach((row)=>{ const key=dayKey(row.created_at); if (key in daily) daily[key] += 1 })
    return {
      visitors, views:pageViews.length, productViews:productViews.length, whatsapp,
      sharingVisitors, shares:productShares.length,
      started:quizzes.length, completed, dismissed, leads:leads.length,
      categories:Object.entries(categories).sort((a,b)=>b[1]-a[1]).slice(0,6),
      products:Object.entries(products).sort((a,b)=>b[1]-a[1]).slice(0,6),
      sharedProducts:Object.entries(sharedProducts).sort((a,b)=>b[1]-a[1]).slice(0,6),
      daily:Object.entries(daily),
    }
  }, [data, days])

  const maxDaily = Math.max(1,...report.daily.map(([,value])=>value))
  const maxCategory = Math.max(1,...report.categories.map(([,value])=>value))
  const maxProduct = Math.max(1,...report.products.map(([,value])=>value))
  const maxSharedProduct = Math.max(1,...report.sharedProducts.map(([,value])=>value))

  const cards = [
    ['Посетители',report.visitors,UsersRound],['Просмотры страниц',report.views,Eye],
    ['Просмотры товаров',report.productViews,MousePointerClick],['Заявки',report.leads,MessageCircle],
    ['Поделились ссылкой',report.sharingVisitors,Share2],['Всего отправок',report.shares,Send],
    ['Начали квиз',report.started,HelpCircle],['Прошли квиз',report.completed,CheckCircle2],
    ['Закрыли квиз',report.dismissed,XCircle],['Переходы в WhatsApp',report.whatsapp,BarChart3],
  ]

  return <>
    <AdminPageHeader eyebrow="CRM · Аналитика" title="Что происходит на сайте" text="Посещения, квиз, популярные категории, товары и заявки по выбранному периоду." actions={<select className="analytics-period" value={days} onChange={(event)=>setDays(Number(event.target.value))}><option value="7">7 дней</option><option value="30">30 дней</option><option value="90">90 дней</option></select>}/>
    {error && <div className="notice notice--error">{error}</div>}
    <div className="admin-stat-grid analytics-stat-grid">{cards.map(([label,value,Icon])=><div className="admin-stat" key={label}><span className="admin-stat__icon"><Icon/></span><span><small>{label}</small><strong>{loading ? '—' : value}</strong></span></div>)}</div>
    <section className="admin-panel analytics-chart">
      <div className="admin-panel__head"><div><span className="eyebrow">Динамика</span><h2>Посещения по дням</h2></div></div>
      <div className="analytics-bars">{report.daily.map(([date,value],index)=><div className="analytics-bar" key={date} title={`${date}: ${value}`}><span style={{height:`${Math.max(5,(value/maxDaily)*100)}%`}}/><small>{index % Math.max(1,Math.ceil(days/8)) === 0 ? date.slice(5) : ''}</small></div>)}</div>
    </section>
    <div className="admin-two-col">
      <section className="admin-panel"><div className="admin-panel__head"><div><span className="eyebrow">Выбор клиентов</span><h2>Категории</h2></div></div><div className="ranking-list">{report.categories.map(([label,value])=><div key={label}><span><strong>{label}</strong><small>{value}</small></span><i><b style={{width:`${(value/maxCategory)*100}%`}}/></i></div>)}{!report.categories.length && <div className="empty-cell">Данных пока нет.</div>}</div></section>
      <section className="admin-panel"><div className="admin-panel__head"><div><span className="eyebrow">Интерес</span><h2>Товары</h2></div></div><div className="ranking-list">{report.products.map(([label,value])=><div key={label}><span><strong>{label}</strong><small>{value}</small></span><i><b style={{width:`${(value/maxProduct)*100}%`}}/></i></div>)}{!report.products.length && <div className="empty-cell">Данных пока нет.</div>}</div></section>
    </div>
    <section className="admin-panel analytics-shares-panel">
      <div className="admin-panel__head"><div><span className="eyebrow">Рекомендации клиентов</span><h2>Какими товарами делятся</h2></div><small>{report.shares} отправок · {report.sharingVisitors} человек</small></div>
      <div className="ranking-list">{report.sharedProducts.map(([label,value])=><div key={label}><span><strong>{label}</strong><small>{value}</small></span><i><b style={{width:`${(value/maxSharedProduct)*100}%`}}/></i></div>)}{!report.sharedProducts.length && <div className="empty-cell">Ссылками на товары пока не делились.</div>}</div>
    </section>
  </>
}
