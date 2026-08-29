import { useEffect, useMemo, useState } from 'react'
import { Copy, Edit3, MoreHorizontal, PackagePlus, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { deleteProduct, listProducts, saveProduct } from '../../lib/api'
import { money } from '../../lib/format'
import AdminPageHeader from '../../components/AdminPageHeader'

export default function Products() {
  const [products,setProducts] = useState([])
  const [q,setQ] = useState('')
  const [status,setStatus] = useState('all')
  const [busy,setBusy] = useState('')
  const [error,setError] = useState('')

  const load = () => listProducts({ includeDrafts:true }).then(setProducts).catch((err)=>setError(err.message))
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => products.filter((product) => {
    const hit = !q || `${product.name_ru || ''} ${product.name_kg || ''} ${product.name_en || ''} ${product.sku || ''} ${product.seam || ''}`.toLowerCase().includes(q.toLowerCase())
    return hit && (status === 'all' || product.status === status)
  }), [products,q,status])

  const remove = async (product) => {
    if (!window.confirm(`Удалить «${product.name_ru}»? Это действие нельзя отменить.`)) return
    setBusy(product.id); setError('')
    try { await deleteProduct(product.id); setProducts((items)=>items.filter((item)=>item.id!==product.id)) }
    catch (err) { setError(err.message) }
    finally { setBusy('') }
  }

  const duplicate = async (product) => {
    setBusy(product.id); setError('')
    try {
      const copy = {
        ...product,
        id:null,
        name_ru:`${product.name_ru} — копия`,
        name_kg:product.name_kg ? `${product.name_kg} — копия` : '',
        name_en:product.name_en ? `${product.name_en} — copy` : '',
        slug:`${product.slug}-copy-${Date.now().toString().slice(-5)}`,
        status:'draft',
        sku:'',
        images:[],
      }
      await saveProduct(copy)
      await load()
    } catch (err) { setError(err.message) }
    finally { setBusy('') }
  }

  return <>
    <AdminPageHeader eyebrow="Каталог" title="Товары" text="Добавляйте товары, указывайте одну понятную цену и управляйте публикацией." actions={<Link className="btn btn--primary" to="/admin/products/new"><PackagePlus size={18}/> Добавить товар</Link>}/>
    <div className="admin-toolbar">
      <label className="search-field"><Search/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Название, артикул, шов…"/></label>
      <select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="all">Все статусы</option><option value="published">Опубликовано</option><option value="draft">Черновик</option><option value="hidden">Скрыто</option></select>
    </div>
    {error && <div className="notice notice--error">{error}</div>}
    <section className="admin-panel admin-panel--flush"><div className="admin-table-wrap"><table className="admin-table product-admin-table">
      <thead><tr><th>Товар</th><th>Цена</th><th>Остаток</th><th>Статус</th><th></th></tr></thead>
      <tbody>
        {filtered.map((product) => <tr key={product.id}>
            <td data-label="Товар"><div className="admin-product-name"><span className="admin-product-thumb">{(product.name_ru || 'SO').slice(0,2).toUpperCase()}</span><span><strong>{product.name_ru || 'Без названия'}</strong><small>{product.sku || 'без артикула'} · {product.seam || 'шов не указан'}</small></span></div></td>
            <td data-label="Цена"><strong>{money(product.sale_price)}</strong></td>
            <td data-label="Остаток">{Number(product.stock_qty || 0) > 0 ? `${product.stock_qty} шт.` : 'Под заказ'}</td>
            <td data-label="Статус"><span className={`visibility-pill is-${product.status}`}>{product.status === 'published' ? 'Опубликован' : product.status === 'hidden' ? 'Скрыт' : 'Черновик'}</span></td>
            <td data-label="Действия"><div className="row-actions"><Link className="icon-btn" to={`/admin/products/${product.id}`} title="Редактировать"><Edit3/></Link><button className="icon-btn" type="button" onClick={()=>duplicate(product)} disabled={busy===product.id} title="Дублировать"><Copy/></button><button className="icon-btn danger-btn" type="button" onClick={()=>remove(product)} disabled={busy===product.id} title="Удалить"><Trash2/></button><span className="mobile-only-icon"><MoreHorizontal/></span></div></td>
          </tr>)}
        {filtered.length === 0 && <tr><td className="empty-cell" colSpan="5">Товаров пока нет.</td></tr>}
      </tbody>
    </table></div></section>
  </>
}
